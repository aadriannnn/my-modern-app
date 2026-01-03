import json
import os
import time
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ExecutionLog:
    """
    Append-only log for debugging and audit: analyzer_plans/execution_log.jsonl
    Each line: {"timestamp": ..., "iso_time": ..., "event": ..., "data": ...}
    """

    def __init__(self, storage_dir: str = "analyzer_plans"):
        self.log_file = os.path.join(storage_dir, "execution_log.jsonl")
        os.makedirs(storage_dir, exist_ok=True)

    def log_event(self, event: str, data: Dict[str, Any]):
        """Logs an event to the append-only file."""
        entry = {
            "timestamp": time.time(),
            "iso_time": datetime.now().isoformat(),
            "event": event,
            "data": data
        }

        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception as e:
            logger.error(f"Failed to write to execution log: {e}")
