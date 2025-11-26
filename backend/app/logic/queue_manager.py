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

logger = logging.getLogger(__name__)


@dataclass
class QueueItem:
    """Represents an item in the queue."""
    request_id: str
    payload: Dict[str, Any]
    future: asyncio.Future
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
            self.queue_timeout: int = 300  # seconds
            self.update_callbacks: Dict[str, list] = {}
            self.initialized = True
            logger.info("QueueManager initialized")

    async def add_to_queue(
        self,
        payload: Dict[str, Any],
        processor: Callable[[Dict[str, Any]], Awaitable[Any]]
    ) -> tuple[str, asyncio.Future]:
        """
        Adds a request to the queue.

        Args:
            payload: The request data to process
            processor: Async function to call when processing this request

        Returns:
            Tuple of (request_id, future) where future will contain the result

        Raises:
            RuntimeError: If queue is full
        """
        # Check queue size
        if self.queue.qsize() >= self.max_queue_size:
            raise RuntimeError(f"Queue is full (max size: {self.max_queue_size})")

        # Create queue item
        request_id = str(uuid.uuid4())
        future = asyncio.Future()

        item = QueueItem(
            request_id=request_id,
            payload=payload,
            future=future
        )

        # Store processor function in payload for later execution
        item.payload['_processor'] = processor

        # Add to queue and tracking dict
        await self.queue.put(item)
        self.items[request_id] = item

        # Update positions for all items
        await self._update_positions()

        logger.info(f"Added request {request_id} to queue. Queue size: {self.queue.qsize()}")

        return request_id, future

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

            for callback in self.update_callbacks[request_id]:
                try:
                    await callback(update_data)
                except Exception as e:
                    logger.error(f"Error broadcasting update for {request_id}: {e}")

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

                logger.info(f"Processing request {item.request_id}")

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

                except asyncio.TimeoutError:
                    error = RuntimeError(f"Request timed out after {self.queue_timeout} seconds")
                    item.future.set_exception(error)
                    logger.error(f"Request {item.request_id} timed out")

                except Exception as e:
                    item.future.set_exception(e)
                    logger.error(f"Error processing request {item.request_id}: {e}", exc_info=True)

                finally:
                    # Clean up
                    if item.request_id in self.items:
                        del self.items[item.request_id]
                    if item.request_id in self.update_callbacks:
                        del self.update_callbacks[item.request_id]

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

    def get_queue_position(self, request_id: str) -> Optional[int]:
        """
        Gets the current queue position for a request.

        Args:
            request_id: The request ID to check

        Returns:
            Current position in queue, or None if not found
        """
        if request_id in self.items:
            return self.items[request_id].position
        return None

    def get_queue_stats(self) -> Dict[str, Any]:
        """
        Gets current queue statistics.

        Returns:
            Dictionary with queue stats (size, processing count, etc.)
        """
        return {
            'queue_size': self.queue.qsize(),
            'items_tracked': len(self.items),
            'max_size': self.max_queue_size,
            'processing': self.processing
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
                    'result': result
                }
            except Exception as e:
                return {
                    'status': 'failed',
                    'error': str(e)
                }

        # If not done, check position
        if item.position > 0:
            return {
                'status': 'queued',
                'position': item.position
            }
        else:
            return {
                'status': 'processing'
            }


# Global singleton instance
queue_manager = QueueManager()
