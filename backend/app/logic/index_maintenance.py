"""
Service for verifying and repairing vector index integrity.
Ensures all cases in 'blocuri' have corresponding embeddings in 'vectori' table.
"""
import logging
import threading
from sqlmodel import Session, text
from typing import Dict, Any, List
import json
from datetime import datetime

from ..db import get_session
from .embedding_batch import embed_texts_batch

logger = logging.getLogger(__name__)

# Global state for process control
repair_stop_event = threading.Event()
repair_status_lock = threading.Lock()
repair_status = {
    'is_running': False,
    'current_progress': {
        'processed': 0,
        'total_missing': 0,
        'errors': 0
    },
    'last_run_stats': None
}

def get_index_stats(session: Session) -> Dict[str, Any]:
    """
    Get current statistics about the vector index.

    Args:
        session: Database session

    Returns:
        Dictionary with total cases, indexed count, and missing count.
    """
    try:
        # Count total cases
        total_query = text("SELECT COUNT(*) FROM blocuri")
        total_cases = session.execute(total_query).scalar()

        # Count indexed cases
        indexed_query = text("SELECT COUNT(*) FROM vectori")
        indexed_count = session.execute(indexed_query).scalar()

        # Calculate missing (approximate if they don't match exactly 1:1,
        # but technically missing = cases in blocuri not in vectori)
        missing_query = text("""
            SELECT COUNT(*)
            FROM blocuri b
            LEFT JOIN vectori v ON b.id = v.speta_id
            WHERE v.speta_id IS NULL
        """)
        missing_count = session.execute(missing_query).scalar()

        stats = {
            'total_cases': total_cases,
            'indexed_count': indexed_count,
            'missing_count': missing_count,
            'is_valid': missing_count == 0
        }

        # Add running status info
        with repair_status_lock:
            stats['is_running'] = repair_status['is_running']
            if repair_status['is_running']:
                stats['progress'] = repair_status['current_progress']
            elif repair_status['last_run_stats']:
                stats['last_run'] = repair_status['last_run_stats']

        return stats

    except Exception as e:
        logger.error(f"Error getting index stats: {e}", exc_info=True)
        return {
            'total_cases': 0,
            'indexed_count': 0,
            'missing_count': 0,
            'error': str(e)
        }

def stop_index_repair() -> Dict[str, Any]:
    """
    Stop the currently running repair process.
    """
    with repair_status_lock:
        if not repair_status['is_running']:
            return {
                'success': False,
                'message': 'No repair process is currently running'
            }

    repair_stop_event.set()
    logger.info("Stop signal sent to index repair process")

    return {
        'success': True,
        'message': 'Stop signal sent. The process will stop after the current batch.'
    }

async def run_index_repair(session: Session, batch_size: int = 10) -> Dict[str, Any]:
    """
    Run the index repair process to generate missing embeddings.

    Args:
        session: Database session
        batch_size: Number of cases to process at once

    Returns:
        Statistics dictionary
    """
    logger.info("Starting index repair process...")

    # Initialize process state
    repair_stop_event.clear()
    with repair_status_lock:
        repair_status['is_running'] = True
        repair_status['current_progress'] = {
            'processed': 0,
            'total_missing': 0,
            'errors': 0
        }

    stats = {
        'processed': 0,
        'errors': 0,
        'startTime': datetime.now().isoformat(),
        'stopped': False
    }

    try:
        # Check total missing first
        count_query = text("""
            SELECT COUNT(*)
            FROM blocuri b
            LEFT JOIN vectori v ON b.id = v.speta_id
            WHERE v.speta_id IS NULL
        """)
        total_missing = session.execute(count_query).scalar()

        with repair_status_lock:
            repair_status['current_progress']['total_missing'] = total_missing

        logger.info(f"Found {total_missing} cases missing embeddings.")

        if total_missing == 0:
            with repair_status_lock:
                repair_status['is_running'] = False
            return {'success': True, 'message': 'Index is already complete.', 'stats': stats}

        processed_total = 0

        while True:
             if repair_stop_event.is_set():
                logger.warning("Stop signal received. Stopping index repair...")
                stats['stopped'] = True
                break

             # Get next batch of missing IDs
             ids_query = text("""
                SELECT b.id, b.obj
                FROM blocuri b
                LEFT JOIN vectori v ON b.id = v.speta_id
                WHERE v.speta_id IS NULL
                LIMIT :limit
             """)
             rows = session.execute(ids_query, {'limit': batch_size}).all()

             if not rows:
                 break

             # Process batch
             texts_to_embed = []
             ids_to_process = []

             for row in rows:
                case_id = row[0]
                obj = row[1]

                if isinstance(obj, str):
                    try:
                        obj = json.loads(obj)
                    except:
                        obj = {}

                text_content = (
                    obj.get('text_situatia_de_fapt') or
                    obj.get('situatia_de_fapt') or
                    obj.get('situatie') or
                    obj.get('descriere') or
                    (obj.get('obiect', '') + " " + (obj.get('titlu', '') or ''))
                )

                if text_content and len(text_content.strip()) > 5:
                    texts_to_embed.append(text_content)
                    ids_to_process.append(case_id)
                else:
                    # Skip invalid but MARK them as processed to avoid infinite loop
                    # We insert a dummy record so the LEFT JOIN finds them next time
                    logger.warning(f"Skipping case {case_id} due to empty text - marking as skipped in DB")

                    # Insert a placeholder record for invalid text cases
                    # We use a zero-vector or similar to indicate "no data" but allow the index to see it exists
                    # This prevents the repair tool from picking it up forever
                    try:
                        dummy_vector = [0.0] * 1536 # Match your vector dimension
                        session.execute(
                            text("INSERT INTO vectori (speta_id, embedding) VALUES (:speta_id, :embedding)"),
                            {'speta_id': case_id, 'embedding': str(dummy_vector)}
                        )
                        session.commit()

                        # Increment processed count for these skipped ones too
                        stats['processed'] += 1
                        processed_total += 1
                        with repair_status_lock:
                            repair_status['current_progress']['processed'] = processed_total

                    except Exception as ex:
                        logger.error(f"Failed to mark skipped case {case_id}: {ex}")

             if ids_to_process:
                 vectors = await embed_texts_batch(texts_to_embed, batch_size=len(texts_to_embed))

                 values = []
                 for i, speta_id in enumerate(ids_to_process):
                     values.append({'speta_id': speta_id, 'embedding': str(vectors[i])})

                 insert_stmt = text("INSERT INTO vectori (speta_id, embedding) VALUES (:speta_id, :embedding)")
                 for v in values:
                     session.execute(insert_stmt, v)

                 session.commit()

                 count = len(ids_to_process)
                 stats['processed'] += count
                 processed_total += count

                 with repair_status_lock:
                     repair_status['current_progress']['processed'] = processed_total

             elif not ids_to_process and not rows:
                  # Real end of data
                  break

             elif not ids_to_process:
                  # We had rows but all were invalid (and handled above individually).
                  # We continue to the next batch.
                  continue

    except Exception as e:
        logger.error(f"Error in repair loop: {e}", exc_info=True)
        stats['errors'] += 1
        with repair_status_lock:
            repair_status['current_progress']['errors'] += 1
        return {'success': False, 'error': str(e), 'stats': stats}

    stats['duration'] = datetime.now().isoformat()

    with repair_status_lock:
        repair_status['is_running'] = False
        repair_status['last_run_stats'] = stats

    return {'success': True, 'stats': stats}
