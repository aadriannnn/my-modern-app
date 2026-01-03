import logging
import asyncio
from typing import Dict, Any, List, Optional
from ..two_round_llm_analyzer import ThreeStageAnalyzer
from .task_queue_manager import TaskQueueManager

logger = logging.getLogger(__name__)

class TaskExecutor:
    """
    Executes approved tasks sequentially with checkpoint recovery.
    """

    def __init__(self, task_queue_manager: TaskQueueManager, analyzer: ThreeStageAnalyzer):
        self.task_queue_manager = task_queue_manager
        self.analyzer = analyzer

    async def execute_queue(
        self,
        notification_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute all approved tasks in queue order.
        """
        import time
        from ..email_utils import send_batch_completion_email

        start_time = time.time()
        queue_data = self.task_queue_manager.get_queue()
        approved_tasks = [
            t for t in queue_data["tasks"]
            if t["state"] == "approved" or t["state"] == "failed"
        ]

        # Sort by creation time to ensure FIFO, though list order should generally be preserved
        approved_tasks.sort(key=lambda x: x["created_at"])

        results = {}
        success_count = 0
        failed_count = 0
        task_summaries = []

        logger.info(f"Starting execution of {len(approved_tasks)} tasks.")

        for task in approved_tasks:
            task_id = task["id"]
            user_query = task.get("query", "")

            # Skip if already completed (double check)
            if task.get("state") == "completed":
                continue

            try:
                # Update state to executing
                self.task_queue_manager.update_task_state(task_id, "executing")

                # Execute Plan
                plan_id = task.get("plan", {}).get("plan_id")
                if not plan_id:
                     raise ValueError(f"Task {task_id} has no plan_id")

                logger.info(f"Executing task {task_id} (Plan {plan_id})")

                # Pass notification email if provided, but SUPPRESS individual emails
                result = await self.analyzer.execute_plan(
                    plan_id,
                    notification_email=notification_email,
                    suppress_email=True
                )

                if result.get("success"):
                    self.task_queue_manager.save_task_result(task_id, result)
                    self.task_queue_manager.update_task_state(
                        task_id,
                        "completed",
                        {"result": result}
                    )
                    success_count += 1
                    task_summaries.append({
                        "query": user_query,
                        "success": True,
                        "result": result
                    })
                else:
                    raise RuntimeError(result.get("error", "Unknown error"))

            except Exception as e:
                logger.error(f"Task {task_id} failed: {e}")
                self.task_queue_manager.update_task_state(
                    task_id,
                    "failed",
                    {"error": str(e)}
                )
                failed_count += 1
                results[task_id] = {"success": False, "error": str(e)}
                task_summaries.append({
                    "query": user_query,
                    "success": False,
                    "error": str(e)
                })
                # Continue to next task

        # Send aggregated email if requested
        if notification_email and task_summaries:
            total_time = time.time() - start_time
            await send_batch_completion_email(
                notification_email,
                task_summaries,
                total_time
            )

        return {
            "success": True,
            "summary": {
                "total": len(approved_tasks),
                "succeeded": success_count,
                "failed": failed_count
            }
        }
