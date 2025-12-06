import json
import os
import shutil
import time
import uuid
import logging
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

class TaskQueueManager:
    """
    Manages a persistent queue of analysis tasks.

    Storage: analyzer_plans/task_queue.json
    Schema Version: 1.0

    Task States:
    - pending: Added to queue, not yet planned
    - planning: Plan generation in progress
    - planned: Plan ready for approval
    - approved: Approved for execution
    - executing: Currently executing
    - completed: Successfully completed
    - failed: Failed with error
    """

    def __init__(self, storage_dir: str = "analyzer_plans"):
        self.storage_dir = storage_dir
        self.queue_file = os.path.join(storage_dir, "task_queue.json")
        os.makedirs(storage_dir, exist_ok=True)

        # Ensure queue file exists
        if not os.path.exists(self.queue_file):
            self._save_queue_data({"version": "1.0", "tasks": []})

    def add_task(self, query: str, user_metadata: Dict[str, Any] = None) -> str:
        """Adds a new task to the queue and returns its ID."""
        task_id = str(uuid.uuid4())
        task = {
            "id": task_id,
            "query": query,
            "user_metadata": user_metadata or {},
            "state": "pending",
            "created_at": time.time(),
            "updated_at": time.time(),
            "plan": None,
            "result": None,
            "error": None
        }

        queue_data = self.load_queue()
        queue_data["tasks"].append(task)
        self._save_queue_data(queue_data)
        logger.info(f"Task {task_id} added to queue.")
        return task_id

    def get_queue(self) -> Dict[str, Any]:
        """Returns the current queue data including metadata."""
        return self.load_queue()

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Returns a specific task by ID."""
        queue_data = self.load_queue()
        for task in queue_data["tasks"]:
            if task["id"] == task_id:
                return task
        return None

    def remove_task(self, task_id: str) -> bool:
        """Removes a task from the queue."""
        queue_data = self.load_queue()
        original_count = len(queue_data["tasks"])
        queue_data["tasks"] = [t for t in queue_data["tasks"] if t["id"] != task_id]

        if len(queue_data["tasks"]) < original_count:
            self._save_queue_data(queue_data)
            logger.info(f"Task {task_id} removed from queue.")
            return True
        return False

    def update_task_state(self, task_id: str, new_state: str, data: Dict[str, Any] = None):
        """Updates a task's state and merges additional data."""
        queue_data = self.load_queue()
        updated = False

        for task in queue_data["tasks"]:
            if task["id"] == task_id:
                task["state"] = new_state
                task["updated_at"] = time.time()
                if data:
                    # Merge data keys into task
                    for key, value in data.items():
                        task[key] = value
                updated = True
                break

        if updated:
            self._save_queue_data(queue_data)
            # Create a backup on significant state changes
            if new_state in ["planned", "completed", "failed"]:
                self._create_backup()
        else:
            logger.warning(f"Attempted to update non-existent task {task_id}")

    def save_task_result(self, task_id: str, result: Dict[str, Any]):
        """Helper to save a task result and mark it as completed."""
        self.update_task_state(task_id, "completed", {
            "result": result,
            "completed_at": time.time()
        })

    def load_queue(self) -> Dict[str, Any]:
        """Loads the queue from disk with error handling."""
        try:
            with open(self.queue_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logger.error(f"Error loading queue: {e}. Returning empty queue.")
            return {"version": "1.0", "tasks": []}

    def _save_queue_data(self, data: Dict[str, Any]):
        """Atomic write to disk."""
        tmp_file = self.queue_file + ".tmp"
        try:
            with open(tmp_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            os.replace(tmp_file, self.queue_file)
        except Exception as e:
            logger.error(f"Error saving queue: {e}")
            if os.path.exists(tmp_file):
                os.remove(tmp_file)
            raise

    def _create_backup(self):
        """Creates a timestamped backup of the queue file."""
        try:
            timestamp = int(time.time())
            backup_file = os.path.join(self.storage_dir, f"task_queue.backup.{timestamp}.json")
            shutil.copy2(self.queue_file, backup_file)

            # Keep only last 10 backups
            backups = sorted(
                [f for f in os.listdir(self.storage_dir) if f.startswith("task_queue.backup.") and f.endswith(".json")]
            )
            while len(backups) > 10:
                os.remove(os.path.join(self.storage_dir, backups.pop(0)))

        except Exception as e:
            logger.error(f"Error creating backup: {e}")
