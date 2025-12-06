from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
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

class UpdatePlanRequest(BaseModel):
    max_cases: int

class NotificationPreferences(BaseModel):
    email: str
    terms_accepted: bool

class ExecutePlanWithNotificationRequest(BaseModel):
    notification_preferences: Optional[NotificationPreferences] = None

@router.post("/plan")
async def create_analysis_plan(
    request: AdvancedAnalysisRequest,
    session: Session = Depends(get_session)
):
    """
    PHASE 1: Create an analysis plan (Smart Projection).
    Returns a job_id. Client must poll /status/{job_id} to get the plan.
    """
    try:
        logger.info(f"[API] Received request to CREATE PLAN for query: {request.query}")

        async def process_create_plan(payload: dict):
            # Create new session for worker
            from ..db import engine
            from sqlmodel import Session
            with Session(engine) as worker_session:
                analyzer = ThreeStageAnalyzer(worker_session)
                result = await analyzer.create_plan(payload['query'])
                return result

        payload = {'query': request.query, 'type': 'create_plan'}
        job_id, _ = await queue_manager.add_to_queue(payload, process_create_plan)

        logger.info(f"[API] Plan creation queued. Job ID: {job_id}")
        return {
            'success': True,
            'job_id': job_id,
            'message': 'Plan creation started. Check status for result.'
        }
    except Exception as e:
        logger.error(f"Error queuing plan creation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/plan/{plan_id}")
async def update_analysis_plan(
    plan_id: str,
    request: UpdatePlanRequest,
    session: Session = Depends(get_session)
):
    """
    Update an existing plan to limit the number of cases.
    This is used before execution to reduce scope.
    """
    try:
        logger.info(f"[API] Received request to UPDATE PLAN: {plan_id} with max_cases: {request.max_cases}")

        analyzer = ThreeStageAnalyzer(session)
        result = analyzer.update_plan_case_limit(plan_id, request.max_cases)

        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Update failed'))

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating plan: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute/{plan_id}")
async def execute_analysis_plan(
    plan_id: str,
    request: ExecutePlanWithNotificationRequest = None,
    session: Session = Depends(get_session)
):
    """
    PHASE 2 & 3: Execute the plan (Batch Processing + Synthesis).
    Returns a job_id for tracking.
    Optionally accepts notification_preferences to send email when analysis completes.
    """
    try:
        logger.info(f"[API] Received request to EXECUTE PLAN: {plan_id}")

        # Validate notification preferences if provided
        notification_email = None
        if request and request.notification_preferences:
            prefs = request.notification_preferences

            # Validate email format
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_pattern, prefs.email):
                raise HTTPException(status_code=400, detail="Invalid email format")

            # Validate terms acceptance
            if not prefs.terms_accepted:
                raise HTTPException(status_code=400, detail="Terms and conditions must be accepted to receive email notifications")

            notification_email = prefs.email
            logger.info(f"[API] Email notification enabled for {plan_id}: {notification_email}")

        async def process_three_stage_execution(payload: dict):
            # Create new session for worker
            from ..db import engine
            from sqlmodel import Session
            with Session(engine) as worker_session:
                analyzer = ThreeStageAnalyzer(worker_session)
                result = await analyzer.execute_plan(
                    payload['plan_id'],
                    notification_email=payload.get('notification_email')
                )
                return result

        payload = {
            'plan_id': plan_id,
            'type': 'execute_plan',
            'notification_email': notification_email
        }
        job_id, _ = await queue_manager.add_to_queue(payload, process_three_stage_execution)

        return {
            'success': True,
            'job_id': job_id,
            'message': 'Plan execution started. Check status for progress.',
            'email_notification_enabled': notification_email is not None
        }
    except HTTPException:
        raise
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

            # Only calculate progress for execution jobs that have a plan_id
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

            # For 'create_plan' jobs, we don't have detailed progress, just 'processing'
            elif item and item.payload.get('type') == 'create_plan':
                 status['message'] = "Generating strategy and verifying data..."

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
