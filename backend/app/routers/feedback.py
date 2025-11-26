"""
API routes for user feedback collection.
Provides endpoints for submitting ratings and retrieving statistics.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from sqlalchemy import text, case
import logging

from ..db import get_session
from ..models import FeedbackStatistics
from ..schemas_feedback import FeedbackSubmit, FeedbackResponse, FeedbackStatsResponse

router = APIRouter(prefix="/feedback", tags=["feedback"])
logger = logging.getLogger(__name__)


@router.post("", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackSubmit,
    session: Session = Depends(get_session)
):
    """
    Submit user feedback (good or bad rating).

    Args:
        feedback: Feedback data containing type ('good' or 'bad') and optional speta_id
        session: Database session

    Returns:
        FeedbackResponse with success status and feedback ID
    """
    try:
        logger.info(f"Received feedback: {feedback.feedback_type}" +
                   (f" for speta {feedback.speta_id}" if feedback.speta_id else ""))

        # Create new feedback entry
        new_feedback = FeedbackStatistics(
            feedback_type=feedback.feedback_type,
            speta_id=feedback.speta_id
        )

        session.add(new_feedback)
        session.commit()
        session.refresh(new_feedback)

        logger.info(f"Feedback saved successfully with ID: {new_feedback.id}")

        return FeedbackResponse(
            success=True,
            message="Feedback înregistrat cu succes!",
            feedback_id=new_feedback.id
        )

    except Exception as e:
        logger.error(f"Error saving feedback: {e}", exc_info=True)
        session.rollback()
        raise HTTPException(
            status_code=500,
            detail="Eroare la salvarea feedback-ului. Vă rugăm încercați din nou."
        )


@router.get("/stats", response_model=FeedbackStatsResponse)
async def get_feedback_stats(
    session: Session = Depends(get_session)
):
    """
    Retrieve aggregated feedback statistics.

    Args:
        session: Database session

    Returns:
        FeedbackStatsResponse with counts and percentages
    """
    try:
        logger.info("Fetching feedback statistics")

        # Get counts using SQLModel
        statement = select(
            func.count(FeedbackStatistics.id).label('total'),
            func.sum(
                case((FeedbackStatistics.feedback_type == 'good', 1), else_=0)
            ).label('good_count'),
            func.sum(
                case((FeedbackStatistics.feedback_type == 'bad', 1), else_=0)
            ).label('bad_count')
        )

        result = session.exec(statement).first()

        total = result.total or 0
        good_count = result.good_count or 0
        bad_count = result.bad_count or 0

        # Calculate percentages
        good_percentage = (good_count / total * 100) if total > 0 else 0.0
        bad_percentage = (bad_count / total * 100) if total > 0 else 0.0

        logger.info(f"Stats: Total={total}, Good={good_count}, Bad={bad_count}")

        return FeedbackStatsResponse(
            total_feedback=total,
            good_count=good_count,
            bad_count=bad_count,
            good_percentage=round(good_percentage, 1),
            bad_percentage=round(bad_percentage, 1)
        )

    except Exception as e:
        logger.error(f"Error fetching feedback stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Eroare la încărcarea statisticilor."
        )
