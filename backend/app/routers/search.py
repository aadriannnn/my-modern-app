from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..schemas import SearchRequest
from ..logic.search_logic import search_cases
from ..logic.queue_manager import queue_manager
import logging

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

        # Add to queue and wait for result
        request_id, future = await queue_manager.add_to_queue(payload, process_search)

        logger.info(f"Search request queued with ID: {request_id}")

        # Wait for queue to process and return result
        result = await future

        # Save result IDs for LLM export
        try:
            from ..models import UltimaInterogare
            from datetime import datetime

            speta_ids = [r.get('id') for r in result if r.get('id') is not None]

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

            # Get top 5 results (or fewer if less than 5 results)
            top_results = result[:5]

            # Extract and normalize obiecte (case objects) from top results
            obiecte_normalizate = []
            for r in top_results:
                raw_obiect = r.get('obiect') or r.get('data', {}).get('obiect')

                if raw_obiect and raw_obiect != "—" and raw_obiect.strip():
                    # Split by comma, ' și ' (with diacritics) and ' si ' (without diacritics)
                    # Example: "Lipsire de libertate și viol" -> ["Lipsire de libertate", "viol"]
                    parts = re.split(r',|\s+și\s+|\s+si\s+', raw_obiect, flags=re.IGNORECASE)

                    for part in parts:
                        cleaned = part.strip()
                        if cleaned:
                            # Capitalize first letter, keep rest as is for consistency
                            # e.g. "viol" -> "Viol", "TENTATIVA" -> "Tentativa"
                            normalized = cleaned.capitalize()
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
