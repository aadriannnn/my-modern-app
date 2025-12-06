"""
Queue Manager for LLM Operations

This module provides a queue management system for LLM operations (embeddings, searches)
to prevent server overload when multiple users make simultaneous requests.

Features:
- FIFO queue processing
- Real-time position tracking
- SSE event broadcasting
- Configurable queue size and timeout
"""

import asyncio
import logging
import uuid
from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime
from dataclasses import dataclass, field

# Import TaskQueueManager and TaskExecutor to integrate
from ..lib.analyzer.task_queue_manager import TaskQueueManager
from ..lib.analyzer.task_executor import TaskExecutor
from ..lib.two_round_llm_analyzer import ThreeStageAnalyzer
from ..db import get_session

logger = logging.getLogger(__name__)


@dataclass
class QueueItem:
    """Represents an item in the queue."""
    request_id: str
    payload: Dict[str, Any]
    future: asyncio.Future
    type: str # 'advanced_analysis' or 'batch_plan_generation' or 'execute_queue'
    added_at: datetime = field(default_factory=datetime.now)
    position: int = 0


class QueueManager:
    """
    Singleton queue manager for LLM operations.

    Manages a global queue of LLM requests, processes them sequentially,
    and provides real-time position updates to clients.
    """

    _instance: Optional['QueueManager'] = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.queue: asyncio.Queue = asyncio.Queue()
            self.items: Dict[str, QueueItem] = {}
            self.processing: bool = False
            self.worker_task: Optional[asyncio.Task] = None
            self.max_queue_size: int = 50
            # Increase timeout to 24 hours for long analysis
            self.queue_timeout: int = 86400
            self.update_callbacks: Dict[str, list] = {}
            self.initialized = True
            logger.info("QueueManager initialized")

    def add_job(self, job_type: str, payload: Dict[str, Any]) -> str:
        """Helper to add job to queue via synchronous call."""
        request_id = str(uuid.uuid4())

        async def _add():
            processor = self._get_processor_for_type(job_type)
            await self.add_to_queue(request_id, job_type, payload, processor)

        # If loop is running, schedule it
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_add())
        except RuntimeError:
            pass

        return request_id

    def _get_processor_for_type(self, job_type: str):
        """Returns the processor function based on job type."""
        if job_type == "advanced_analysis":
            return self._process_advanced_analysis
        elif job_type == "batch_plan_generation":
            return self._process_batch_plan_generation
        elif job_type == "execute_queue":
            return self._process_execute_queue
        elif job_type == "create_plan":
            return self._process_create_plan
        else:
            raise ValueError(f"Unknown job type: {job_type}")

    async def _process_create_plan(self, payload: Dict[str, Any]):
        """Processor for single plan generation (Phase 1)."""
        query = payload.get("query")
        session_gen = get_session()
        session = next(session_gen)
        try:
            analyzer = ThreeStageAnalyzer(session)
            return await analyzer.create_plan(query)
        finally:
            session.close()

    async def _process_advanced_analysis(self, payload: Dict[str, Any]):
        """Processor for single plan execution."""
        plan_id = payload.get("plan_id")
        notification_email = payload.get("notification_email")

        session_gen = get_session()
        session = next(session_gen)
        try:
            analyzer = ThreeStageAnalyzer(session)
            return await analyzer.execute_plan(plan_id, notification_email=notification_email)
        finally:
            session.close()

    async def _process_batch_plan_generation(self, payload: Dict[str, Any]):
        """Processor for batch plan generation."""
        task_ids = payload.get("task_ids", [])

        session_gen = get_session()
        session = next(session_gen)
        try:
            analyzer = ThreeStageAnalyzer(session)
            manager = TaskQueueManager()

            # Fetch tasks to get queries
            tasks = []
            for tid in task_ids:
                t = manager.get_task(tid)
                if t:
                    tasks.append(t)

            return await analyzer.create_plans_batch(tasks)

        finally:
            session.close()

    async def _process_execute_queue(self, payload: Dict[str, Any]):
        """Processor for sequential queue execution."""
        notification_email = payload.get("notification_email")

        session_gen = get_session()
        session = next(session_gen)
        try:
            analyzer = ThreeStageAnalyzer(session)
            manager = TaskQueueManager()
            executor = TaskExecutor(manager, analyzer)

            return await executor.execute_queue(notification_email=notification_email)

        finally:
            session.close()

    async def add_to_queue(
        self,
        request_id: str,
        job_type: str,
        payload: Dict[str, Any],
        processor: Callable[[Dict[str, Any]], Awaitable[Any]]
    ):
        """
        Adds a request to the queue.
        """
        if self.queue.qsize() >= self.max_queue_size:
            raise RuntimeError(f"Queue is full (max size: {self.max_queue_size})")

        future = asyncio.Future()

        item = QueueItem(
            request_id=request_id,
            type=job_type,
            payload=payload,
            future=future
        )

        item.payload['_processor'] = processor

        await self.queue.put(item)
        self.items[request_id] = item
        await self._update_positions()

        logger.info(f"Added request {request_id} (type: {job_type}) to queue.")

    async def _update_positions(self):
        """Updates position for all items in queue and broadcasts updates."""
        # Get all items currently in queue (without removing them)
        temp_items = []
        position = 1

        # We need to peek at queue items without removing them
        # Since asyncio.Queue doesn't support peeking, we track positions via our dict
        for request_id, item in self.items.items():
            if not item.future.done():
                item.position = position
                position += 1
                temp_items.append(item)

        # Broadcast updates to all waiting clients
        for item in temp_items:
            await self._broadcast_update(item.request_id, item.position, self.queue.qsize())

    async def _broadcast_update(self, request_id: str, position: int, total: int):
        """Broadcasts queue position update to all subscribed clients."""
        if request_id in self.update_callbacks:
            update_data = {
                'request_id': request_id,
                'position': position,
                'total': total,
                'status': 'queued' if position > 1 else 'processing'
            }
            await self._broadcast_event(request_id, update_data)

    async def _broadcast_event(self, request_id: str, data: Dict[str, Any]):
        """Generic method to broadcast any event to subscribed clients."""
        if request_id in self.update_callbacks:
            for callback in self.update_callbacks[request_id]:
                try:
                    await callback(data)
                except Exception as e:
                    logger.error(f"Error broadcasting event for {request_id}: {e}")

    async def _broadcast_result(self, item: QueueItem):
        """Broadcasts the final result or error."""
        status_data = self.get_job_status(item.request_id)
        if status_data['status'] in ['completed', 'failed', 'error']:
             await self._broadcast_event(item.request_id, status_data)

    def subscribe_updates(self, request_id: str, callback: Callable):
        """
        Subscribe to queue updates for a specific request.

        Args:
            request_id: The request to track
            callback: Async function to call with updates
        """
        if request_id not in self.update_callbacks:
            self.update_callbacks[request_id] = []
        self.update_callbacks[request_id].append(callback)

    def unsubscribe_updates(self, request_id: str, callback: Callable):
        """Unsubscribe from queue updates."""
        if request_id in self.update_callbacks:
            try:
                self.update_callbacks[request_id].remove(callback)
                if not self.update_callbacks[request_id]:
                    del self.update_callbacks[request_id]
            except ValueError:
                pass

    async def process_queue(self):
        """
        Background worker that processes queue items sequentially.

        This should be started as a background task when the application starts.
        """
        logger.info("Queue processing worker started")
        self.processing = True

        while self.processing:
            try:
                # Wait for item with timeout to allow graceful shutdown
                try:
                    item = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue

                logger.info(f"Processing request {item.request_id} (type: {item.type})")

                # Mark item as processing (position 0)
                item.position = 0

                # Update status to processing
                await self._broadcast_update(item.request_id, 0, self.queue.qsize())

                try:
                    # Get the processor function
                    processor = item.payload.pop('_processor')

                    # Execute the processor with timeout
                    result = await asyncio.wait_for(
                        processor(item.payload),
                        timeout=self.queue_timeout
                    )

                    # Set result
                    item.future.set_result(result)
                    logger.info(f"Request {item.request_id} completed successfully")
                    await self._broadcast_result(item)

                except asyncio.TimeoutError:
                    error = RuntimeError(f"Request timed out after {self.queue_timeout} seconds")
                    item.future.set_exception(error)
                    logger.error(f"Request {item.request_id} timed out")
                    await self._broadcast_result(item)

                except Exception as e:
                    item.future.set_exception(e)
                    logger.error(f"Error processing request {item.request_id}: {e}", exc_info=True)
                    await self._broadcast_result(item)

                finally:
                    # Clean up callbacks immediately
                    if item.request_id in self.update_callbacks:
                        del self.update_callbacks[item.request_id]

                    # Schedule delayed cleanup for completed/failed jobs (keep results for 24 hours)
                    if item.future.done():
                        logger.info(f"Scheduling delayed cleanup for job {item.request_id} in 24 hours")

                        async def delayed_cleanup():
                            # 24 hours = 86400 seconds
                            await asyncio.sleep(86400)
                            if item.request_id in self.items:
                                del self.items[item.request_id]
                                logger.info(f"Cleaned up completed job {item.request_id}")

                        asyncio.create_task(delayed_cleanup())
                    else:
                        if item.request_id in self.items:
                            del self.items[item.request_id]

                    # Update positions for remaining items
                    await self._update_positions()

                    self.queue.task_done()

            except Exception as e:
                logger.error(f"Unexpected error in queue worker: {e}", exc_info=True)

        logger.info("Queue processing worker stopped")

    def start_worker(self):
        """Starts the background queue processing worker."""
        if self.worker_task is None or self.worker_task.done():
            self.worker_task = asyncio.create_task(self.process_queue())
            logger.info("Queue worker task created")

    async def stop_worker(self):
        """Stops the background queue processing worker."""
        self.processing = False
        if self.worker_task and not self.worker_task.done():
            await self.worker_task
            logger.info("Queue worker stopped")

    def get_result(self, job_id: str):
        """Helper to get result directly."""
        status = self.get_job_status(job_id)
        if status['status'] == 'completed':
            return status['result']
        return None

    def get_status(self, job_id: str):
        """Helper to get status directly."""
        return self.get_job_status(job_id)

    def get_queue_position(self, request_id: str) -> Optional[int]:
        """
        Gets the current position in queue for a request.

        Args:
            request_id: The request ID to check

        Returns:
            Position (1-based) if in queue, None if processing/completed/not found
        """
        if request_id in self.items:
            item = self.items[request_id]
            if not item.future.done() and item.position > 0:
                return item.position
        return None

    def get_queue_stats(self) -> Dict[str, Any]:
        """
        Gets current queue statistics.

        Returns:
            Dictionary with queue size and other stats
        """
        return {
            'queue_size': self.queue.qsize(),
            'total_processed': len([i for i in self.items.values() if i.future.done()])
        }

    def get_job_status(self, request_id: str) -> Dict[str, Any]:
        """
        Gets the detailed status and result of a job.

        Args:
            request_id: The request ID to check

        Returns:
            Dictionary with status, result (if done), or error
        """
        if request_id not in self.items:
            return {'status': 'not_found'}

        item = self.items[request_id]

        if item.future.done():
            try:
                result = item.future.result()
                return {
                    'status': 'completed',
                    'job_id': request_id,
                    'type': item.type,
                    'result': result
                }
            except Exception as e:
                return {
                    'status': 'failed',
                    'job_id': request_id,
                    'type': item.type,
                    'error': str(e)
                }

        # If not done, check position
        if item.position > 0:
            return {
                'status': 'queued',
                'job_id': request_id,
                'type': item.type,
                'position': item.position
            }
        else:
            return {
                'status': 'processing',
                'job_id': request_id,
                'type': item.type
            }


# Global singleton instance
queue_manager = QueueManager()
