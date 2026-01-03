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

class FullCycleRequest(BaseModel):
    query: str
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

@router.post("/full-academic-cycle")
async def start_full_academic_cycle(request: FullCycleRequest, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    """
    Direct Start - No Review Flow.
    Orchestrates the entire process: Decompose -> Plan -> Execute -> Synthesize -> Email.
    """
    if request.notification_email and not request.terms_accepted:
        raise HTTPException(status_code=400, detail="Trebuie să acceptați termenii pentru a primi email.")

    from ..logic.queue_manager import QueueManager
    qm = QueueManager()

    job_id = qm.add_job(
        "full_academic_analysis",
        {
            "query": request.query,
            "notification_email": request.notification_email
        }
    )

    return {"success": True, "job_id": job_id, "status": "processing"}

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
    """Retrieves a generated final report by ID with enriched case titles throughout."""
    try:
        from ..lib.report_utils import enrich_report_with_titles

        analyzer = ThreeStageAnalyzer(session)
        report = analyzer.plan_manager.load_final_report(report_id)

        # NEW: Use centralized enrichment function
        # Replaces ALL case ID references with actual titles from database
        logger.info(f"Enriching report {report_id} with case titles...")
        report = enrich_report_with_titles(report, session)

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
    - All case ID references replaced with actual titles
    - Page numbering
    """
    try:
        from ..lib.report_utils import enrich_report_with_titles
        from ..lib.docx_generator import generate_academic_docx
        import tempfile
        from fastapi.responses import FileResponse

        # Load report data
        analyzer = ThreeStageAnalyzer(session)
        report = analyzer.plan_manager.load_final_report(report_id)

        # NEW: Use centralized enrichment function
        # Replaces ALL case ID references with actual titles throughout the report
        logger.info(f"Enriching report {report_id} for .docx export...")
        report = enrich_report_with_titles(report, session, for_docx=True)

        # Generate .docx in temporary location
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
