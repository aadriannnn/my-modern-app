"""
SSE (Server-Sent Events) endpoint for real-time queue status updates.

Provides streaming updates to clients about their position in the LLM request queue.
"""

import asyncio
import logging
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
from ..logic.queue_manager import queue_manager

router = APIRouter(prefix="/queue", tags=["queue"])
logger = logging.getLogger(__name__)


async def event_stream(request_id: str):
    """
    Generates SSE stream for queue position updates.

    Args:
        request_id: The request ID to track

    Yields:
        SSE formatted messages with queue position updates
    """
    update_queue = asyncio.Queue()

    async def callback(update_data: dict):
        """Callback to receive updates from queue manager."""
        await update_queue.put(update_data)

    # Subscribe to updates
    queue_manager.subscribe_updates(request_id, callback)

    try:
        # Send initial position
        position = queue_manager.get_queue_position(request_id)
        if position is not None:
            stats = queue_manager.get_queue_stats()
            yield f"data: {{\"position\": {position}, \"total\": {stats['queue_size']}, \"status\": \"queued\"}}\n\n"

        # Stream updates until request completes
        while True:
            try:
                # Wait for update with timeout
                update = await asyncio.wait_for(update_queue.get(), timeout=30.0)

                # Format as SSE
                import json
                data = json.dumps(update)
                yield f"data: {data}\n\n"

                # If completed or error, close stream
                if update.get('status') in ['completed', 'error']:
                    break

            except asyncio.TimeoutError:
                # Send keepalive ping
                yield ": keepalive\n\n"

                # Check if request is still in queue
                if queue_manager.get_queue_position(request_id) is None:
                    # Request completed or removed
                    yield 'data: {"status": "completed"}\n\n'
                    break

    except asyncio.CancelledError:
        logger.info(f"SSE stream cancelled for request {request_id}")
    except Exception as e:
        logger.error(f"Error in SSE stream for {request_id}: {e}", exc_info=True)
    finally:
        # Unsubscribe
        queue_manager.unsubscribe_updates(request_id, callback)


@router.get("/status/{request_id}")
async def get_queue_status(request_id: str):
    """
    SSE endpoint for real-time queue position updates.

    Args:
        request_id: The unique request ID to track

    Returns:
        StreamingResponse with SSE updates
    """
    logger.info(f"SSE connection established for request {request_id}")

    return StreamingResponse(
        event_stream(request_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


@router.get("/stats")
async def get_queue_stats():
    """
    Get current queue statistics.

    Returns:
        Dictionary with queue stats
    """
    return queue_manager.get_queue_stats()
