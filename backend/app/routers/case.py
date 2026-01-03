from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..logic.search_logic import get_case_by_id
import logging

router = APIRouter(prefix="/case", tags=["case"])
logger = logging.getLogger(__name__)

@router.get("/{case_id}")
async def get_case_details(
    case_id: int,
    session: Session = Depends(get_session)
):
    """
    Retrieves the full details of a single legal case by its ID.
    """
    logger.info(f"Received request for case ID: {case_id}")
    try:
        case_details = get_case_by_id(session, case_id)
        if not case_details:
            logger.warning(f"Case with ID {case_id} not found in database.")
            raise HTTPException(status_code=404, detail=f"Case with ID {case_id} not found.")

        logger.info(f"Successfully retrieved case ID {case_id}.")
        return case_details
    except HTTPException:
        # Re-raise HTTPException to ensure FastAPI handles it correctly
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred while fetching case {case_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An internal error occurred while fetching the case."
        )
