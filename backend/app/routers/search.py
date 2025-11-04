from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..schemas import SearchRequest
from ..logic.search_logic import search_cases
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
    """
    logger.info(f"Received search request with situation: '{request.situatie[:50]}...' and filters: {request.dict(exclude={'situatie'})}")
    try:
        results = search_cases(session, request)
        logger.info(f"Search completed successfully, returning {len(results)} results.")
        return results
    except Exception as e:
        logger.error(f"An unexpected error occurred during search: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred during the search process."
        )
