from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..schemas import SearchRequest
from ..logic.search_logic import search_cases
from ..logic.queue_manager import queue_manager
import logging
import uuid

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)

@router.post("/")
async def search(
    request: SearchRequest,
    session: Session = Depends(get_session)
):
    """
    Performs a consolidated search for legal cases based on a text query
    and multiple optional filters.

    This endpoint uses a queue system to prevent server overload when
    multiple users make simultaneous requests.
    """
    logger.info(f"Received search request with situation: '{request.situatie[:50]}...' and filters: {request.dict(exclude={'situatie'})}")

    try:
        # Define the processor function that will be called by queue worker
        async def process_search(payload: dict):
            """Process the actual search when queue worker calls it."""
            # Recreate SearchRequest from payload
            search_req = SearchRequest(**payload['search_request'])
            # Get fresh session for this worker
            with next(get_session()) as worker_session:
                results = search_cases(worker_session, search_req)
                logger.info(f"Search completed successfully, returning {len(results)} results.")
                return results

        # Prepare payload
        payload = {
            'search_request': request.dict()
        }

        # Generate request_id
        request_id = str(uuid.uuid4())

        # Add to queue and wait for result
        # Pass all 4 required arguments: request_id, job_type, payload, processor
        await queue_manager.add_to_queue(request_id, "search", payload, process_search)

        logger.info(f"Search request queued with ID: {request_id}")

        # Wait for queue to process and return result
        # We need to wait for the future that was created inside add_to_queue
        # queue_manager.items[request_id] holds the item with the future
        item = queue_manager.items.get(request_id)
        if not item:
             raise RuntimeError("Failed to retrieve queue item immediately after adding.")

        result = await item.future

        # Save result IDs for LLM export
        try:
            from ..models import UltimaInterogare
            from datetime import datetime
            from ..settings_manager import settings_manager

            # Get max results to save (allow more for network export)
            max_save_count = settings_manager.get_value('setari_generale', 'top_k_results', 50)

            # Save all available results up to the limit
            speta_ids = [r.get('id') for r in result[:max_save_count] if r.get('id') is not None]

            # Use a separate session for saving
            with next(get_session()) as save_session:
                existing = save_session.get(UltimaInterogare, 1)
                if existing:
                    existing.speta_ids = speta_ids
                    existing.query_text = request.situatie[:10000]  # Limit query text length
                    existing.created_at = datetime.utcnow()
                else:
                    nueva = UltimaInterogare(
                        id=1,
                        speta_ids=speta_ids,
                        query_text=request.situatie[:10000],
                    )
                    save_session.add(nueva)
                save_session.commit()
                logger.info(f"Saved {len(speta_ids)} speta IDs for LLM export from query: '{request.situatie[:50]}'")
        except Exception as save_error:
            # Don't fail the search if saving for LLM export fails
            logger.error(f"Failed to save search results for LLM export: {save_error}")

        # Track obiect (case object) statistics from top 5 results
        try:
            from ..models import MaterieStatistics
            from datetime import datetime
            from collections import Counter
            import re
            import unicodedata

            def normalize_text(text: str) -> str:
                """
                Normalize Romanian text for statistics aggregation.
                1. Remove diacritics (în -> in, ș -> s, etc.)
                2. Basic stemming (Lipsirea -> Lipsire)
                3. Title case
                """
                if not text:
                    return ""

                # 1. Remove diacritics
                # Normalize unicode characters to decomposed form (NFD)
                normalized = unicodedata.normalize('NFD', text)
                # Filter out non-spacing mark characters (diacritics)
                text_no_diacritics = "".join([c for c in normalized if unicodedata.category(c) != 'Mn'])

                # 2. Split into words for processing
                words = text_no_diacritics.split()
                processed_words = []

                for word in words:
                    word_lower = word.lower()
                    # Basic Romanian stemming for articulation
                    # "Lipsirea" -> "Lipsire", "Violarea" -> "Violare"
                    if word_lower.endswith("ea") and len(word_lower) > 3:
                        # Check if it's likely an articulated noun
                        # This is a heuristic, but works well for legal terms
                        word_stem = word[:-1] # Remove 'a' -> Lipsire
                    elif word_lower.endswith("ii") and len(word_lower) > 3:
                        # "Copiii" -> "Copii" (simplified)
                        word_stem = word[:-1]
                    else:
                        word_stem = word

                    processed_words.append(word_stem)

                # Rejoin and Title Case
                final_text = " ".join(processed_words)
                return final_text.title()

            # Get top 5 results (or fewer if less than 5 results)
            top_results = result[:5]

            # Extract and normalize obiecte (case objects) from top results
            obiecte_normalizate = []
            for r in top_results:
                raw_obiect = r.get('obiect') or r.get('data', {}).get('obiect')

                if raw_obiect and raw_obiect != "—" and raw_obiect.strip():
                    # Split by comma, ' și ' (with diacritics) and ' si ' (without diacritics)
                    parts = re.split(r',|\s+și\s+|\s+si\s+', raw_obiect, flags=re.IGNORECASE)

                    for part in parts:
                        cleaned = part.strip()
                        if cleaned:
                            # Apply advanced normalization
                            normalized = normalize_text(cleaned)
                            if normalized:
                                obiecte_normalizate.append(normalized)

            # Count occurrences of each normalized obiect
            obiect_counts = Counter(obiecte_normalizate)

            if obiect_counts:
                # Use a separate session for tracking
                with next(get_session()) as track_session:
                    for obiect, count in obiect_counts.items():
                        # Check if exists
                        existing = track_session.get(MaterieStatistics, obiect)
                        if existing:
                            existing.display_count += count
                            existing.last_updated = datetime.utcnow()
                        else:
                            new_stat = MaterieStatistics(
                                materie=obiect,  # Using 'materie' field to store obiect
                                display_count=count,
                                last_updated=datetime.utcnow()
                            )
                            track_session.add(new_stat)
                    track_session.commit()
                    logger.info(f"Tracked normalized obiect statistics: {dict(obiect_counts)}")
        except Exception as track_error:
            # Don't fail the search if obiect tracking fails
            logger.error(f"Failed to track obiect statistics: {track_error}")

        return result

    except RuntimeError as e:
        # Queue full or other queue-related error
        logger.error(f"Queue error: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Serverul este momentan ocupat. Vă rugăm să încercați din nou în câteva momente. ({str(e)})"
        )
    except Exception as e:
        logger.error(f"An unexpected error occurred during search: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during the search process."
        )

@router.get("/by-ids")
async def search_by_ids(
    ids: str,
    page: int = 1,
    page_size: int = 20,
    session: Session = Depends(get_session)
):
    """
    Search for legal cases by comma-separated IDs with pagination.
    Example: /search/by-ids?ids=122,1566,234&page=1&page_size=20

    Returns cases in the same format as the standard search endpoint.
    """
    from ..logic.search_logic import get_case_by_id

    logger.info(f"Received search by IDs request: {ids} (Page {page}, Size {page_size})")

    try:
        # Parse comma-separated IDs
        id_list = [id_str.strip() for id_str in ids.split(',') if id_str.strip()]

        if not id_list:
            # Return empty list if no IDs provided (allows easy frontend handling)
            return []

        # Convert to integers and validate
        try:
            id_integers = [int(id_str) for id_str in id_list]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="ID-urile trebuie să fie numere întregi valide."
            )

        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_ids = id_integers[start_idx:end_idx]

        # Fetch cases
        results = []
        not_found_ids = []

        for case_id in paginated_ids:
            case_data = get_case_by_id(session, case_id)
            if case_data:
                results.append(case_data)
            else:
                not_found_ids.append(case_id)

        logger.info(f"Search by IDs completed. Found {len(results)} cases on page {page}.")

        if not_found_ids:
            logger.warning(f"IDs not found on this page: {not_found_ids}")

        return results

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during search by IDs: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="A apărut o eroare la căutarea după ID-uri."
        )
