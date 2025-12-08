from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlmodel import Session, select
from ..db import get_session
from ..lib.two_round_llm_analyzer import ThreeStageAnalyzer
from ..lib.analyzer.task_queue_manager import TaskQueueManager
from ..lib.analyzer.task_executor import TaskExecutor
import logging

router = APIRouter(
    prefix="/advanced-analysis",
    tags=["advanced-analysis"]
)

logger = logging.getLogger(__name__)

class PlanRequest(BaseModel):
    query: str

class ExecuteRequest(BaseModel):
    plan_id: str
    notification_email: Optional[str] = None
    terms_accepted: bool = False

class UpdateLimitRequest(BaseModel):
    max_cases: int

# --- Queue Request Models ---
class AddQueueTaskRequest(BaseModel):
    query: str
    user_metadata: Optional[Dict[str, Any]] = None

class GeneratePlansRequest(BaseModel):
    pass

class ExecuteQueueRequest(BaseModel):
    notification_email: Optional[str] = None
    terms_accepted: bool = False

# --- Standard Analysis Endpoints ---

@router.post("/create-plan")
async def create_plan(request: PlanRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """PHASE 1: Generates a research plan via queue."""
    from ..logic.queue_manager import QueueManager
    queue_manager = QueueManager()

    # Offload plan generation to background queue to prevent timeout
    job_id = queue_manager.add_job(
        "create_plan",
        {"query": request.query}
    )

    return {"success": True, "job_id": job_id, "status": "queued"}

@router.post("/decompose-task")
async def decompose_task(request: PlanRequest, session: Session = Depends(get_session)):
    """
    PHASE 0: Decomposes a complex user query into multiple sub-tasks using LLM.
    Returns a list of tasks that can be added to the queue.

    NEW: Also persists the original query to queue metadata for final report generation.
    """
    try:
        analyzer = ThreeStageAnalyzer(session)
        result = await analyzer.decompose_into_tasks(request.query)

        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error', 'Task decomposition failed'))

        # NEW: Save original query to queue metadata
        # This persists the user's initial request for Phase 4 final report synthesis
        queue_manager = TaskQueueManager()
        queue_manager.set_queue_metadata(
            original_query=request.query,
            metadata={
                'decomposition_rationale': result.get('decomposition_rationale', ''),
                'estimated_complexity': result.get('estimated_complexity', 'medium'),
                'total_tasks': result.get('total_tasks', 0)
            }
        )
        logger.info(f"Original query persisted for final report generation: '{request.query[:50]}...'")

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in decompose_task endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-plan-limit/{plan_id}")
async def update_plan_limit(plan_id: str, request: UpdateLimitRequest, session: Session = Depends(get_session)):
    """Update max cases for a plan."""
    analyzer = ThreeStageAnalyzer(session)
    result = analyzer.update_plan_case_limit(plan_id, request.max_cases)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result.get('error', 'Unknown error'))
    return result

@router.post("/execute-plan")
async def execute_plan(request: ExecuteRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """PHASE 2 & 3: Executes the plan in background."""
    if not request.terms_accepted and request.notification_email:
        # Terms are only required if email is provided
        raise HTTPException(status_code=400, detail="Trebuie să acceptați termenii.")

    from ..logic.queue_manager import QueueManager
    queue_manager = QueueManager()

    # We use queue manager for async execution tracking of single plans
    job_id = queue_manager.add_job(
        "advanced_analysis",
        {"plan_id": request.plan_id, "notification_email": request.notification_email}
    )

    return {"job_id": job_id, "status": "queued", "success": True}

@router.get("/status/{job_id}")
async def get_status(job_id: str):
    from ..logic.queue_manager import QueueManager
    queue_manager = QueueManager()
    return queue_manager.get_status(job_id)

@router.get("/result/{job_id}")
async def get_result(job_id: str):
    from ..logic.queue_manager import QueueManager
    queue_manager = QueueManager()
    return queue_manager.get_result(job_id)

# --- Queue Management Endpoints ---

@router.post("/queue/add")
async def add_task_to_queue(request: AddQueueTaskRequest):
    """Adds a task to the analysis queue."""
    manager = TaskQueueManager()
    task_id = manager.add_task(request.query, request.user_metadata)
    queue = manager.get_queue()
    return {"success": True, "task_id": task_id, "queue_position": len(queue['tasks'])}

@router.get("/queue")
async def get_queue():
    """Returns the current state of the queue."""
    manager = TaskQueueManager()
    return manager.get_queue()

@router.delete("/queue/completed")
async def clear_completed_queue_tasks():
    """Removes all completed or failed tasks from the queue."""
    manager = TaskQueueManager()
    success = manager.clear_completed_tasks()
    return {"success": success}

@router.delete("/queue/{task_id}")
async def remove_task_from_queue(task_id: str):
    """Removes a task from the queue."""
    manager = TaskQueueManager()
    # Prevent removing executing tasks? For now, allow it but it might cause issues if actually running.
    # The logic handles removal but execution loop is in memory.
    success = manager.remove_task(task_id)
    if not success:
         raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@router.post("/queue/generate-plans")
async def generate_plans_batch(request: GeneratePlansRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Starts batch plan generation for pending tasks."""
    manager = TaskQueueManager()
    queue = manager.get_queue()

    pending_tasks = [t for t in queue['tasks'] if t['state'] == 'pending']

    if not pending_tasks:
        return {"success": False, "message": "No pending tasks to plan."}

    from ..logic.queue_manager import QueueManager
    qm = QueueManager()

    # We reuse the existing QueueManager infrastructure to run this long process
    # But we need a worker that knows how to handle "batch_plan_generation"
    # Or we can just use BackgroundTasks if we don't need persistent job tracking via QueueManager for this step
    # However, user wants polling. So let's use QueueManager with a special job type.

    job_id = qm.add_job(
        "batch_plan_generation",
        {"task_ids": [t['id'] for t in pending_tasks]}
    )

    # Mark tasks as planning
    for t in pending_tasks:
        manager.update_task_state(t['id'], "planning")

    return {"success": True, "job_id": job_id}

@router.post("/queue/execute-all")
async def execute_queue(request: ExecuteQueueRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """Starts sequential execution of approved tasks. Auto-approves planned tasks."""
    # Terms check only if notification is requested
    if request.notification_email and not request.terms_accepted:
         raise HTTPException(status_code=400, detail="Terms not accepted")

    from ..logic.queue_manager import QueueManager
    from ..lib.analyzer.task_queue_manager import TaskQueueManager

    # Auto-approve all planned tasks before execution
    manager = TaskQueueManager()
    queue = manager.get_queue()
    for task in queue['tasks']:
        if task['state'] == 'planned':
            manager.update_task_state(task['id'], 'approved', {})

    qm = QueueManager()

    job_id = qm.add_job(
        "execute_queue",
        {"notification_email": request.notification_email}
    )

    return {"success": True, "job_id": job_id}

@router.get("/queue/results")
async def get_queue_results():
    """Returns results for completed tasks."""
    manager = TaskQueueManager()
    queue = manager.get_queue()

    results = {}
    pending_count = 0

    for task in queue['tasks']:
        if task['state'] == 'completed':
            results[task['id']] = task.get('result')
        elif task['state'] != 'failed':
             pending_count += 1

    return {"results": results, "pending_count": pending_count}


@router.post("/queue/generate-final-report")
async def generate_final_report(
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    """
    PHASE 4: Generates a final synthesized report from all completed queue tasks.

    Prerequisites:
    - All tasks in queue must be 'completed' or 'failed'
    - Queue metadata must contain 'original_query'

    Returns:
        {
            'success': bool,
            'job_id': str,  # For polling
            'status': 'queued'
        }
    """
    import uuid
    from ..logic.queue_manager import QueueManager

    try:
        queue_manager = TaskQueueManager()

        # Use validation helper
        validation = queue_manager.validate_queue_for_report_generation()

        if not validation['valid']:
            logger.warning(f"Final report generation validation failed: {validation['errors']}")
            raise HTTPException(
                status_code=400,
                detail={
                    'message': 'Cannot generate final report',
                    'errors': validation['errors'],
                    'stats': {
                        'completed': validation['completed_tasks'],
                        'failed': validation['failed_tasks'],
                        'pending': validation['pending_tasks']
                    }
                }
            )

        # Load queue data
        queue_data = queue_manager.get_queue()
        queue_metadata = queue_manager.get_queue_metadata()
        original_query = queue_metadata['original_query']

        # Prepare task results (only successfully completed tasks)
        tasks = queue_data.get('tasks', [])
        completed_tasks = [t for t in tasks if t['state'] == 'completed' and t.get('result')]

        logger.info(f"Preparing to generate final report for: '{original_query[:50]}...'")
        logger.info(f"Synthesizing {len(completed_tasks)} completed tasks")

        task_results = []
        for task in completed_tasks:
            task_results.append({
                'task_id': task['id'],
                'query': task['query'],
                'user_metadata': task.get('user_metadata', {}),
                'result': task['result']
            })

        # Use QueueManager for async job tracking
        qm = QueueManager()
        job_id = qm.add_job(
            "generate_final_report",
            {
                "original_query": original_query,
                "task_results": task_results
            }
        )

        return {
            'success': True,
            'job_id': job_id,
            'status': 'queued'
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error initiating final report generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/final-report/{report_id}")
async def get_final_report(report_id: str, session: Session = Depends(get_session)):
    """Retrieves a generated final report by ID with enriched bibliography."""
    try:
        analyzer = ThreeStageAnalyzer(session)
        report = analyzer.plan_manager.load_final_report(report_id)

        # CRITICAL: Enrich bibliography with real case titles from database
        # This ensures UI displays actual case titles, not placeholder IDs
        logger.info(f"Enriching bibliography for report {report_id} (UI display)...")
        jurisprudence = report.get('bibliography', {}).get('jurisprudence', [])

        logger.info(f"Bibliography has {len(jurisprudence)} entries")

        if jurisprudence:
            import re

            # Debug: Log first entry to see structure
            if len(jurisprudence) > 0:
                logger.info(f"Sample bibliography entry: {jurisprudence[0]}")

            # Extract case IDs - look for both 'case_id' field and pattern (#ID) in citation
            case_ids = []
            id_mapping = {}  # Maps extracted ID to original item index

            for idx, item in enumerate(jurisprudence):
                case_id = item.get('case_id')

                # If no case_id field, try to extract from citation pattern (#294)
                if not case_id and item.get('citation'):
                    citation = item.get('citation', '')
                    match = re.search(r'\(#(\d+)\)', citation)
                    if match:
                        case_id = int(match.group(1))
                        logger.debug(f"Extracted ID {case_id} from citation: {citation[:50]}...")

                if case_id:
                    # Convert to int if string
                    if isinstance(case_id, str):
                        try:
                            case_id = int(case_id)
                        except ValueError:
                            logger.warning(f"Could not convert case_id '{case_id}' to int")
                            continue

                    case_ids.append(case_id)
                    id_mapping[case_id] = idx

            logger.info(f"Extracted {len(case_ids)} case IDs: {case_ids}")

            if case_ids:
                from ..models import Case

                logger.info(f"Querying database for {len(case_ids)} case IDs...")

                cases = session.exec(
                    select(Case).where(Case.id.in_(case_ids))
                ).all()

                logger.info(f"Database returned {len(cases)} cases")

                if len(cases) == 0 and len(case_ids) > 0:
                    logger.warning("No cases found! Checking database...")
                    sample_cases = session.exec(select(Case).limit(5)).all()
                    if sample_cases:
                        sample_ids = [c.id for c in sample_cases]
                        logger.info(f"Sample case IDs from database: {sample_ids}")
                    else:
                        logger.error("Database appears to be empty!")

                # Update citations with real titles
                for case in cases:
                    idx = id_mapping.get(case.id)
                    if idx is not None:
                        jurisprudence[idx]['citation'] = case.title
                        logger.info(f"  Case #{case.id}: {case.title[:60]}...")

                # Log any IDs that weren't found
                found_ids = {case.id for case in cases}
                missing_ids = set(case_ids) - found_ids
                if missing_ids:
                    logger.warning(f"  Missing case IDs (not in database): {missing_ids}")

        return report
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    except Exception as e:
        logger.error(f"Error retrieving report: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/final-report/{report_id}/export")
async def export_final_report_docx(report_id: str, session: Session = Depends(get_session)):
    """
    Exports a final report as an academic .docx document.

    Returns a downloadable Word document with:
    - Professional academic formatting (Times New Roman, 1.5 spacing, 3.0/2.5cm margins)
    - Table of Contents
    - Properly numbered chapters and subsections
    - Bibliography section with real case titles from database
    - Page numbering
    """
    try:
        # Load report data
        analyzer = ThreeStageAnalyzer(session)
        report = analyzer.plan_manager.load_final_report(report_id)

        # CRITICAL: Enrich bibliography with real case titles from database
        logger.info(f"Enriching bibliography for report {report_id}...")
        jurisprudence = report.get('bibliography', {}).get('jurisprudence', [])

        if jurisprudence:
            import re

            # Extract case IDs from both 'case_id' field and pattern (#ID) in citation
            case_ids = []
            id_mapping = {}

            for idx, item in enumerate(jurisprudence):
                case_id = item.get('case_id')

                # If no case_id field, extract from citation pattern (#294)
                if not case_id and item.get('citation'):
                    citation = item.get('citation', '')
                    match = re.search(r'\(#(\d+)\)', citation)
                    if match:
                        case_id = int(match.group(1))

                if case_id:
                    if isinstance(case_id, str):
                        try:
                            case_id = int(case_id)
                        except ValueError:
                            continue

                    case_ids.append(case_id)
                    id_mapping[case_id] = idx

            if case_ids:
                # Fetch titles from database in batch
                from ..models import Case
                cases = session.exec(
                    select(Case).where(Case.id.in_(case_ids))
                ).all()

                logger.info(f"Fetched {len(cases)} case titles from database")

                # Update citations with real titles
                for case in cases:
                    idx = id_mapping.get(case.id)
                    if idx is not None:
                        jurisprudence[idx]['citation'] = case.title
                        logger.debug(f"  Case #{case.id}: {case.title[:50]}...")

        # Generate .docx in temporary location
        from ..lib.docx_generator import generate_academic_docx
        import tempfile
        import os
        from fastapi.responses import FileResponse

        # Create temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
            temp_path = tmp_file.name

        # Generate document with enriched data
        generate_academic_docx(report, temp_path)

        # Return as file download
        return FileResponse(
            temp_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename=f"referat_final_{report_id}.docx",
            background=None  # Don't delete temp file until response is sent
        )

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found")
    except Exception as e:
        logger.error(f"Error exporting report to .docx: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate .docx: {str(e)}")


@router.delete("/session/{job_id}")
async def clear_analysis_session(job_id: str):
    """
    Clears an analysis session from memory.
    Useful for single-plan analysis cleanup.
    """
    from ..logic.queue_manager import QueueManager
    qm = QueueManager()

    # Remove from memory if exists
    if job_id in qm.items:
        del qm.items[job_id]

    # Also attempt to remove callbacks
    if job_id in qm.update_callbacks:
        del qm.update_callbacks[job_id]

    return {"success": True}
