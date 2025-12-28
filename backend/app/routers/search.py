from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..schemas import SearchRequest
from ..logic.search_logic import search_cases
from ..logic.queue_manager import queue_manager
from ..models import ClientDB
from .auth import get_current_user_optional
from typing import Optional
import logging
import uuid
from ..settings_manager import settings_manager

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)

@router.post("/")
async def search(
    request: SearchRequest,
    session: Session = Depends(get_session),
    current_user: Optional[ClientDB] = Depends(get_current_user_optional)
):
    """
    Performs a consolidated search for legal cases based on a text query
    and multiple optional filters.

    This endpoint uses a queue system to prevent server overload when
    multiple users make simultaneous requests.
    """
    logger.info(f"Received search request with situation: '{request.situatie[:50]}...' and filters: {request.dict(exclude={'situatie'})}")

    try:
        # --- NEW LOGIC MOVED UP: NETWORK FLOW & ROLE LIMITS ---

        # 1. Check Network Prompt Saving Flow
        retea_enabled = settings_manager.get_value('setari_retea', 'retea_enabled', False)
        if retea_enabled:
            logger.info("Network Prompt Saving is ON. Returning empty results to force LLM wait.")
            return []

        # 2. Determine Role-Based Limit
        limit = 10  # Default for unregistered / anonymous

        if current_user:
            try:
                role_val = current_user.rol
                if hasattr(role_val, 'value'):
                    role_val = role_val.value

                role_val = str(role_val).lower().strip()

                if role_val == "admin":
                    limit = 100000
                elif role_val == "pro":
                    limit = 50
                elif role_val == "basic":
                    limit = 20

            except Exception as e:
                logger.warning(f"Error determining user role limit: {e}")
                limit = 10

        # OVERRIDE request limit with role-based limit to ensure search_logic fetches enough
        # We generally want to fetch exactly the limit, or maybe slightly more?
        # For now, strict limit is fine as pagination comes via request.offset
        request.limit = limit
        logger.info(f"Applying search result limit: {limit} (User: {current_user.email if current_user else 'Guest'})")

        # Define the processor function that will be called by queue worker
        async def process_search(payload: dict):
            """Process the actual search when queue worker calls it."""
            from ..logic.search_logic import detect_company_query, search_companies

            # Recreate SearchRequest from payload
            search_req = SearchRequest(**payload['search_request'])

            # Get fresh session for this worker
            with next(get_session()) as worker_session:
                # Detect if this is a company query
                is_company, is_cui = detect_company_query(search_req.situatie)

                if is_company:
                    # Route to company search
                    results = search_companies(worker_session, search_req.situatie, is_cui)
                    logger.info(f"Company search completed, returning {len(results)} company results.")
                else:
                    # Standard case search
                    results = search_cases(worker_session, search_req)
                    logger.info(f"Search completed successfully, returning {len(results)} case results.")

                return results

        # Prepare payload
        payload = {
            'search_request': request.dict()
        }

        # Generate request_id
        request_id = str(uuid.uuid4())

        # Add to queue and wait for result
        await queue_manager.add_to_queue(request_id, "search", payload, process_search)

        logger.info(f"Search request queued with ID: {request_id}")

        item = queue_manager.items.get(request_id)
        if not item:
             raise RuntimeError("Failed to retrieve queue item immediately after adding.")

        result = await item.future

        # Save result IDs for LLM export (logic remains same)
        try:
            from ..models import UltimaInterogare
            from datetime import datetime
            # settings_manager is already imported globally

            max_save_count = settings_manager.get_value('setari_generale', 'top_k_results', 50)
            speta_ids = [r.get('id') for r in result[:max_save_count] if r.get('id') is not None]

            with next(get_session()) as save_session:
                existing = save_session.get(UltimaInterogare, 1)
                if existing:
                    existing.speta_ids = speta_ids
                    existing.query_text = request.situatie[:10000]
                    existing.created_at = datetime.utcnow()
                else:
                    nueva = UltimaInterogare(
                        id=1,
                        speta_ids=speta_ids,
                        query_text=request.situatie[:10000],
                    )
                    save_session.add(nueva)
                save_session.commit()
        except Exception as save_error:
            logger.error(f"Failed to save search results for LLM export: {save_error}")

        # Track obiect statistics (logic remains same)
        try:
            from ..models import MaterieStatistics
            from datetime import datetime
            from collections import Counter
            import re
            import unicodedata

            def normalize_text(text: str) -> str:
                if not text: return ""
                normalized = unicodedata.normalize('NFD', text)
                text_no_diacritics = "".join([c for c in normalized if unicodedata.category(c) != 'Mn'])
                words = text_no_diacritics.split()
                processed_words = []
                for word in words:
                    word_lower = word.lower()
                    if word_lower.endswith("ea") and len(word_lower) > 3:
                        word_stem = word[:-1]
                    elif word_lower.endswith("ii") and len(word_lower) > 3:
                        word_stem = word[:-1]
                    else:
                        word_stem = word
                    processed_words.append(word_stem)
                return " ".join(processed_words).title()

            top_results = result[:5]
            obiecte_normalizate = []
            for r in top_results:
                raw_obiect = r.get('obiect') or r.get('data', {}).get('obiect')
                if raw_obiect and raw_obiect != "—" and raw_obiect.strip():
                    parts = re.split(r',|\s+și\s+|\s+si\s+', raw_obiect, flags=re.IGNORECASE)
                    for part in parts:
                        cleaned = part.strip()
                        if cleaned:
                            normalized = normalize_text(cleaned)
                            if normalized:
                                obiecte_normalizate.append(normalized)

            obiect_counts = Counter(obiecte_normalizate)
            if obiect_counts:
                with next(get_session()) as track_session:
                    for obiect, count in obiect_counts.items():
                        existing = track_session.get(MaterieStatistics, obiect)
                        if existing:
                            existing.display_count += count
                            existing.last_updated = datetime.utcnow()
                        else:
                            new_stat = MaterieStatistics(materie=obiect, display_count=count, last_updated=datetime.utcnow())
                            track_session.add(new_stat)
                    track_session.commit()
        except Exception as track_error:
            logger.error(f"Failed to track obiect statistics: {track_error}")

        # Result is already limited by search_cases using request.limit
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

@router.get("/filters/mappings")
async def get_filter_mappings(session: Session = Depends(get_session)):
    """
    Returns the canonical-to-original mappings for filters.
    Used by frontend to group search results.
    """
    from ..models import FiltreCacheMenu

    # Try to load from cache
    cache_entry = session.get(FiltreCacheMenu, 1)

    if not cache_entry:
        logger.warning("FiltreCacheMenu entry not found. Returning empty mappings.")
        return {"materii_map": {}, "obiecte_map": {}}

    # Return just the mappings needed for grouping
    return {
        "materii_map": cache_entry.materii_map or {},
        "obiecte_map": cache_entry.obiecte_map or {}
    }

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
