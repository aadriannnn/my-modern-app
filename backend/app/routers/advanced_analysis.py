from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from ..db import get_session
from ..lib.two_round_llm_analyzer import ThreeStageAnalyzer
from ..logic.queue_manager import queue_manager
import logging
import os
import glob
import json

router = APIRouter(
    prefix="/advanced-analysis",
    tags=["advanced-analysis"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

class AdvancedAnalysisRequest(BaseModel):
    query: str

class ExecutePlanRequest(BaseModel):
    plan_id: str

@router.post("/plan")
async def create_analysis_plan(
    request: AdvancedAnalysisRequest,
    session: Session = Depends(get_session)
):
    """
    PHASE 1: Create an analysis plan (Smart Projection).
    Returns the plan with chunks and strategy, waiting for approval.
    """
    try:
        logger.info(f"[API] Received request to CREATE PLAN for query: {request.query}")
        analyzer = ThreeStageAnalyzer(session)
        result = await analyzer.create_plan(request.query)
        logger.info(f"[API] Plan created successfully. Returning to client for approval.")
        return result
    except Exception as e:
        logger.error(f"Error creating plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute/{plan_id}")
async def execute_analysis_plan(
    plan_id: str,
    session: Session = Depends(get_session)
):
    """
    PHASE 2 & 3: Execute the plan (Batch Processing + Synthesis).
    Returns a job_id for tracking.
    """
    try:
        logger.info(f"[API] Received request to EXECUTE PLAN: {plan_id}")
        async def process_three_stage_execution(payload: dict):
            # Create new session for worker
            from ..db import engine
            from sqlmodel import Session
            with Session(engine) as worker_session:
                analyzer = ThreeStageAnalyzer(worker_session)
                result = await analyzer.execute_plan(payload['plan_id'])
                return result

        payload = {'plan_id': plan_id}
        job_id, _ = await queue_manager.add_to_queue(payload, process_three_stage_execution)

        return {
            'success': True,
            'job_id': job_id,
            'message': 'Plan execution started. Check status for progress.'
        }
    except Exception as e:
        logger.error(f"Error starting execution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}")
async def get_advanced_analysis_status(job_id: str):
    """
    Check the status of an analysis job.
    Includes progress tracking for running jobs.
    """
    try:
        status = queue_manager.get_job_status(job_id)

        # Augment with progress if processing
        if status.get('status') in ['processing', 'queued']:
            # Try to find plan_id from queue items
            item = queue_manager.items.get(job_id)
            if item and 'plan_id' in item.payload:
                plan_id = item.payload['plan_id']

                # Check chunks progress
                plans_dir = "analyzer_plans" # Should match analyzer's dir
                if os.path.exists(plans_dir):
                    # Count chunk files: plan_id_chunk_*.json
                    chunk_files = glob.glob(os.path.join(plans_dir, f"{plan_id}_chunk_*.json"))
                    processed_chunks = len(chunk_files)

                    # We need total chunks. Read plan file.
                    plan_file = os.path.join(plans_dir, f"{plan_id}.json")
                    total_chunks = 0
                    if os.path.exists(plan_file):
                        try:
                            with open(plan_file, 'r') as f:
                                plan = json.load(f)
                                total_chunks = plan.get('total_chunks', 0)
                        except:
                            pass

                    status['progress'] = {
                        'current': processed_chunks,
                        'total': total_chunks,
                        'percent': int((processed_chunks / total_chunks * 100)) if total_chunks > 0 else 0
                    }

        return status
    except Exception as e:
        logger.error(f"Error getting status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Eroare la verificarea statusului: {str(e)}")

@router.post("/")
async def advanced_statistical_analysis(
    request: AdvancedAnalysisRequest,
    session: Session = Depends(get_session)
):
    """
    Legacy endpoint: Auto-creates and executes plan (Best Effort).
    """
    try:
        # Create plan
        analyzer = ThreeStageAnalyzer(session)
        plan_res = await analyzer.create_plan(request.query)
        if not plan_res['success']:
             return plan_res

        plan_id = plan_res['plan_id']

        # Execute immediately via queue
        async def process_legacy(payload: dict):
            from ..db import engine
            from sqlmodel import Session
            with Session(engine) as worker_session:
                analyzer = ThreeStageAnalyzer(worker_session)
                result = await analyzer.execute_plan(payload['plan_id'])
                return result

        payload = {'plan_id': plan_id}
        job_id, _ = await queue_manager.add_to_queue(payload, process_legacy)

        return {
            'success': True,
            'job_id': job_id,
            'message': 'Analysis started (Legacy Mode).'
        }
    except Exception as e:
        logger.error(f"Legacy endpoint error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
