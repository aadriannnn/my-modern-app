import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from sqlmodel import Session

from ..db import get_session
from ..lib.two_round_llm_analyzer import ThreeStageAnalyzer
from ..logic.queue_manager import queue_manager

router = APIRouter(
    prefix="/advanced-analysis",
    tags=["advanced-analysis"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

# --- Models ---

class PlanRequest(BaseModel):
    query: str

class PlanUpdate(BaseModel):
    max_cases: int

class ExecuteRequest(BaseModel):
    plan_id: str

# --- Endpoints ---

@router.post("/plan")
async def create_analysis_plan(
    request: PlanRequest,
    session: Session = Depends(get_session)
):
    """
    PHASE 1: Initiates the creation of an analysis plan (Async).
    Returns a job_id to poll for status.
    """
    try:
        logger.info(f"[API] Requesting Analysis Plan for: {request.query}")

        # Initialize Analyzer
        analyzer = ThreeStageAnalyzer(session)

        # Define the processor function that will run in the background
        async def process_plan_creation(payload):
            return await analyzer.create_plan(payload['query'])

        # Add to queue
        job_id, _ = await queue_manager.add_to_queue(
            payload={'query': request.query},
            processor=process_plan_creation
        )

        return {
            "success": True,
            "job_id": job_id,
            "message": "Plan creation queued"
        }

    except Exception as e:
        logger.error(f"[API] Error queueing plan creation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute/{plan_id}")
async def execute_analysis_plan(
    plan_id: str,
    session: Session = Depends(get_session)
):
    """
    PHASE 2 & 3: Initiates the execution of an approved plan (Async).
    Returns a job_id to poll for status.
    """
    try:
        logger.info(f"[API] Requesting Execution for Plan: {plan_id}")

        # Initialize Analyzer
        analyzer = ThreeStageAnalyzer(session)

        # Define the processor function
        async def process_execution(payload):
            # We can pass a progress callback if needed, but for now we'll rely on the final result
            return await analyzer.execute_plan(payload['plan_id'])

        # Add to queue
        job_id, _ = await queue_manager.add_to_queue(
            payload={'plan_id': plan_id},
            processor=process_execution
        )

        return {
            "success": True,
            "job_id": job_id,
            "message": "Plan execution queued"
        }

    except Exception as e:
        logger.error(f"[API] Error queueing execution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/plan/{plan_id}")
async def update_analysis_plan(
    plan_id: str,
    update: PlanUpdate,
    session: Session = Depends(get_session)
):
    """
    Updates the case limit for a plan.
    This is fast enough to be synchronous.
    """
    try:
        analyzer = ThreeStageAnalyzer(session)
        result = analyzer.update_plan_case_limit(plan_id, update.max_cases)

        if not result['success']:
             raise HTTPException(status_code=400, detail=result.get('error'))

        return result

    except Exception as e:
        logger.error(f"[API] Error updating plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{job_id}")
async def get_analysis_status(job_id: str):
    """
    Gets the status of a background job (Plan Creation or Execution).
    """
    status = queue_manager.get_job_status(job_id)

    if status['status'] == 'not_found':
        raise HTTPException(status_code=404, detail="Job not found")

    return status
