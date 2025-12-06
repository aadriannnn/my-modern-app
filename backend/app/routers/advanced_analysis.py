from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlmodel import Session
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
            manager.update_task_state(task['id'], 'approved')

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
