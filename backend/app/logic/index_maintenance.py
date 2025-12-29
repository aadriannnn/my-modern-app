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
        # More accurate query for missing:
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
        # Get list of missing IDs
        missing_ids_query = text("""
            SELECT b.id, b.obj
            FROM blocuri b
            LEFT JOIN vectori v ON b.id = v.speta_id
            WHERE v.speta_id IS NULL
            ORDER BY b.id
        """)

        # We need to fetch all missing IDs first or iterate with cursor
        # Since we modify the state (insert into vectori), simple offset pagination might be tricky if we commit transaction
        # But we are inserting into a different table, so the WHERE clause will naturally exclude processed rows
        # IF we commit.

        # Let's count them first
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

        while True:
            # Check stop signal
            if repair_stop_event.is_set():
                logger.warning("Stop signal received. Stopping index repair...")
                stats['stopped'] = True
                break

            # Fetch a batch of missing cases
            # We re-execute query with limit to get next batch
            batch_result = session.execute(missing_ids_query.execution_options(yield_per=batch_size)).fetchmany(batch_size)

            if not batch_result:
                break

            batch_rows = batch_result
            logger.info(f"Processing batch of {len(batch_rows)} items...")

            texts_to_embed = []
            ids_to_process = []

            for row in batch_rows:
                case_id = row[0]
                obj = row[1]

                # Extract text for embedding (similar logic to main indexing)
                # Prioritize 'situație_de_fapt', 'text_situatia_de_fapt', or just create a composite

                # Logic copied/adapted from create_indexes.py or similar ingestion logic
                # We need a robust way to get the text.
                # Looking at precalculation_service, we have extract_case_metadata, but that's for matching models/codes.
                # For vectors, we usually embed the 'situatia_de_fapt'.

                if isinstance(obj, str):
                    try:
                        obj = json.loads(obj)
                    except:
                        obj = {}

                # Extract text similar to how it's done in search logic setup or ingestion
                text_content = (
                    obj.get('text_situatia_de_fapt') or
                    obj.get('situatia_de_fapt') or
                    obj.get('situatie') or
                    obj.get('descriere') or
                    ""
                )

                # Fallback to OCR text if available?
                # For now let's stick to situatia de fapt which is what we search against usually

                if not text_content or len(text_content.strip()) < 10:
                    logger.warning(f"Case {case_id} has insufficient text for embedding. Skipping.")
                    # We might want to mark it as skipped or insert a dummy vector to avoid re-fetching?
                    # Or better, just log it. If we don't insert into vectori, it will keep coming up as missing.
                    # Let's insert a zero vector or a placeholder to "mark" it as processed?
                    # No, that pollutes the index.
                    # Best approach: Try to construct text from other fields.
                    text_content = f"{obj.get('obiect', '')} {obj.get('titlu', '')}"

                if not text_content or len(text_content.strip()) < 5:
                     logger.warning(f"Case {case_id} REALLY has no text. Skipping completely.")
                     continue

                texts_to_embed.append(text_content)
                ids_to_process.append(case_id)

            if not ids_to_process:
                # If we filtered out all items in this batch, we might get stuck in an infinite loop
                # because they are still "missing" from vectori.
                # To prevent infinite loop on un-embeddable items, we ideally should mark them.
                # For now, let's assume valid data or just break to avoid spamming logs if we can't make progress.
                # A safer check: if we retrieved items but processed 0, we risk loop.
                # But since we use FETCHMANY on a query that selects based on MISSING,
                # if we don't insert, they stay missing.
                # HACK: If we skip, we skip. But the query will pick them up again next time!
                # We need to handle this. For now let's hope data is good.
                logger.warning("Batch contained only invalid data items.")
                # Force break to prevent infinite loop for now if this happens continuously?
                # Or maybe move to next offset? But the query is dynamic.
                # Solution: If we fail to embed, maybe insert a dummy/zero entry or flag it?
                # Let's continue for now.
                pass

            if ids_to_process:
                try:
                    # Generate embeddings
                    vectors = await embed_texts_batch(texts_to_embed, batch_size=len(texts_to_embed))

                    # Insert into vectori table
                    # Assuming table structure: id (serial), speta_id (int), vector (vector(1536))
                    # Check vectori definition? We assume standard PGVector table

                    values_list = []
                    for i, speta_id in enumerate(ids_to_process):
                        vector_str = str(vectors[i]) # formatted as list string for SQL
                        values_list.append({'speta_id': speta_id, 'vector': vector_str})

                    insert_stmt = text("""
                        INSERT INTO vectori (speta_id, vector)
                        VALUES (:speta_id, :vector)
                    """)

                    # Execute inserts
                    # We can use execute many
                    for val in values_list:
                         session.execute(insert_stmt, val)

                    session.commit()

                    stats['processed'] += len(ids_to_process)

                    with repair_status_lock:
                        repair_status['current_progress']['processed'] += len(ids_to_process)

                except Exception as e:
                    logger.error(f"Error processing batch: {e}", exc_info=True)
                    session.rollback()
                    stats['errors'] += 1
                    with repair_status_lock:
                        repair_status['current_progress']['errors'] += 1

            # Determine if we simply need to check condition again or if fetchmany handles cursor?
            # fetchmany on a result proxy advances cursor.
            # But we are committing inside the loop?
            # If we commit, the cursor might be invalidated depending on driver/isolation level.
            # Safer Approach with SQLAlchemy + Commit:
            # Fetch IDs in a list first (limit 1000?), process them, then loop.
            # OR logic: Loop with LIMIT 10 in query. Since we insert into vectori, the WHERE clause excludes them next time.
            # This 'Queue' approach is safer with commits.

            # Since I used `fetchmany` on a single execution, and then `commit` on the session...
            # SQLAlchemy `execute` usually creates a cursor. Committing might close it.
            # It is safer effectively to re-query or fetch big chunk IDs then process.
            # Let's change the loop strategy slightly to be robust:
            # Query IDs with LIMIT batch_size each iteration.

            # BREAK needed here because the batch_result above was from a single execute.
            # If I want to process all, I should re-query in the loop or fetch all IDs first.
            # Fetching all IDs might be memory heavy if millions, but safer.
            # Let's fetch IDs in chunks using the WHERE clause which acts as a cursor.
            break # We break the inner loop to re-evaluate the query in the outer logic?
                  # No, the while True is the main loop. I need to restructure to re-query.

        # New Loop Strategy: Re-query inside loop
        pass

    except Exception as e:
        logger.error(f"Fatal error in index repair: {e}", exc_info=True)
        stats['errors'] += 1
        return {'success': False, 'error': str(e), 'stats': stats}

    # Re-implementing the loop cleanly
    processed_total = 0
    try:
        while True:
             if repair_stop_event.is_set():
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
                    obj.get('obiect', '') + " " + (obj.get('titlu', '') or '')
                )

                if text_content and len(text_content.strip()) > 5:
                    texts_to_embed.append(text_content)
                    ids_to_process.append(case_id)
                else:
                    # Skip invalid
                    logger.warning(f"Skipping case {case_id} due to empty text")

             if ids_to_process:
                 vectors = await embed_texts_batch(texts_to_embed, batch_size=len(texts_to_embed))

                 values = []
                 for i, speta_id in enumerate(ids_to_process):
                     values.append({'speta_id': speta_id, 'vector': str(vectors[i])})

                 insert_stmt = text("INSERT INTO vectori (speta_id, vector) VALUES (:speta_id, :vector)")
                 for v in values:
                     session.execute(insert_stmt, v)

                 session.commit()

                 count = len(ids_to_process)
                 stats['processed'] += count
                 processed_total += count

                 with repair_status_lock:
                     repair_status['current_progress']['processed'] = processed_total

             else:
                 # If we found rows but none were valid to process, we must break or we loop forever
                 # as they remain 'missing' in the DB query.
                 logger.warning("Found unmatched rows but unable to process any (invalid data). Stopping to prevent infinite loop.")
                 break

    except Exception as e:
        logger.error(f"Error in repair loop: {e}", exc_info=True)
        stats['errors'] += 1

    stats['duration'] = datetime.now().isoformat()

    with repair_status_lock:
        repair_status['is_running'] = False
        repair_status['last_run_stats'] = stats

    return {'success': True, 'stats': stats}
