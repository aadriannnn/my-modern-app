"""
Service for pre-calculating tax suggestions for each case using LLM.
Includes intelligent pacing and waiting logic to manage LLM load.
"""
import logging
import threading
import time
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlmodel import Session, select, text

# Assumes these imports are available in the project structure
from ..db import get_session
from ..taxa_timbru_logic import suggest_tax_classification

logger = logging.getLogger(__name__)

# Global state for process control
tax_precalc_stop_event = threading.Event()
tax_precalc_status_lock = threading.Lock()
tax_precalc_status = {
    'is_running': False,
    'can_resume': False,
    'last_run_stats': None,
    'current_progress': {
        'processed': 0,
        'total': 0,
        'success_count': 0,
        'error_count': 0
    }
}

# Configuration for "Intelligent Waiting"
LLM_SHORT_PAUSE = 2      # Seconds to wait between successful calls
LLM_ERROR_PAUSE = 10     # Seconds to wait after an error before retrying
LLM_BATCH_PAUSE = 10     # Seconds to wait after a batch to allow "re-initialization" or cooling
BATCH_SIZE = 5           # Process 5 cases, then pause long

def ensure_tax_column_exist(session: Session) -> bool:
    """
    Ensures that 'sugestie_llm_taxa' column exists in the blocuri table.
    """
    logger.info("Checking if 'sugestie_llm_taxa' column exists in blocuri table...")
    try:
        check_query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'blocuri'
            AND column_name = 'sugestie_llm_taxa'
        """)
        result = session.execute(check_query).first()

        if result:
            logger.info("Column 'sugestie_llm_taxa' already exists.")
            return True

        logger.info("Adding column 'sugestie_llm_taxa' to blocuri table...")
        alter_query = text("ALTER TABLE blocuri ADD COLUMN IF NOT EXISTS sugestie_llm_taxa JSONB")
        session.execute(alter_query)
        session.commit()
        logger.info("Successfully added 'sugestie_llm_taxa' column.")
        return True

    except Exception as e:
        logger.error(f"Error ensuring tax column exists: {e}", exc_info=True)
        session.rollback()
        return False

def get_tax_precalculation_status(main_session: Session) -> Dict[str, Any]:
    """Get current status including incomplete count."""
    with tax_precalc_status_lock:
        status_copy = {
            'is_running': tax_precalc_status['is_running'],
            'can_resume': tax_precalc_status['can_resume'],
            'last_run_stats': tax_precalc_status['last_run_stats'],
            'current_progress': tax_precalc_status['current_progress'].copy()
        }

    if not status_copy['is_running']:
        try:
            # Count cases where sugestie_llm_taxa is NULL
            incomplete_query = text("SELECT COUNT(*) FROM blocuri WHERE sugestie_llm_taxa IS NULL")
            incomplete_count = main_session.execute(incomplete_query).scalar()
            status_copy['can_resume'] = incomplete_count > 0
            status_copy['incomplete_count'] = incomplete_count
        except Exception as e:
            logger.error(f"Error checking incomplete tax cases: {e}")
            status_copy['can_resume'] = False
            status_copy['incomplete_count'] = 0

    return status_copy

def stop_tax_precalculation() -> Dict[str, Any]:
    """Signals the process to stop."""
    with tax_precalc_status_lock:
        if not tax_precalc_status['is_running']:
            return {'success': False, 'message': 'No tax precalculation running'}

    tax_precalc_stop_event.set()
    logger.info("Stop signal sent to tax precalculation process")
    return {'success': True, 'message': 'Stop signal sent. Process will pause shortly.'}

async def process_single_case_tax(case_id: int, obj_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Process a single case: extract description, call LLM, return result.
    """
    # Extract description similar to how the UI does it (or use 'obiect'/'obiect_juridic')
    # Based on extract_case_metadata in precalculation_service.py
    obiect = obj_data.get('obiect', obj_data.get('obiect_juridic', ''))

    # If generic or empty, try to construct a better description
    if not obiect or len(obiect.strip()) < 3:
        # Fallback to 'materie' + generic text or just skip
        materie = obj_data.get('materie', '')
        if materie:
            obiect = f"{materie} - {obj_data.get('stadiu_procesual', '')}"
        else:
            return None # Skip empty cases

    # Retry logic loop
    max_retries = 2
    for attempt in range(max_retries):
        try:
            # Call the shared logic function
            # Since we are in an async function, we can await it directly
            result_model = await suggest_tax_classification(obiect)

            # Convert Pydantic model to dict for JSON storage
            return result_model.dict()

        except Exception as e:
            logger.warning(f"Error processing tax for case {case_id} (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(LLM_ERROR_PAUSE)
            else:
                return {"error": str(e), "original_input": obiect}

    return None

async def _run_tax_precalculation_async(
    main_session_factory, # pass factory/method to get session to be thread-safe if needed
    restart_from_zero: bool
):
    """
    Async implementation of the main loop loop.
    """
    # Create a dedicated session for this long-running task
    # Note: Ensure get_session() returns a session that can be used here.
    # Usually we use a context manager or create one manually.
    # Assuming standard SQLModel/SQLAlchemy session usage.

    # We need to manually handle the session lifecycle here since we are in a background task
    # We'll use the generator as a context manager if possible, or just create a new session
    # For safety, let's assume we can instantiate `Session(engine)` if we had the engine.
    # But `get_session` is a generator.

    # Quick fix: get the engine from `app.db` and create session?
    # Or iterate the generator.
    from ..db import engine # Assuming engine is exposed in db.py

    with Session(engine) as session:
        # Update status running
        with tax_precalc_status_lock:
            tax_precalc_status['is_running'] = True
            tax_precalc_status['current_progress']['processed'] = 0
            tax_precalc_status['current_progress']['success_count'] = 0
            tax_precalc_status['current_progress']['error_count'] = 0

        logger.info(f"Starting Tax Precalculation (Restart={restart_from_zero})")

        # 0. Ensure Column
        if not ensure_columns_exist_internal(session):
             # Status update fail handled in ensure
             with tax_precalc_status_lock:
                tax_precalc_status['is_running'] = False
             return

        # 1. Count Total
        if restart_from_zero:
            count_query = text("SELECT COUNT(*) FROM blocuri")
            select_query = text("SELECT id, obj FROM blocuri ORDER BY id")
        else:
            count_query = text("SELECT COUNT(*) FROM blocuri WHERE sugestie_llm_taxa IS NULL")
            select_query = text("SELECT id, obj FROM blocuri WHERE sugestie_llm_taxa IS NULL ORDER BY id")

        total_cases = session.execute(count_query).scalar()

        with tax_precalc_status_lock:
            tax_precalc_status['current_progress']['total'] = total_cases

        logger.info(f"Total cases to process: {total_cases}")

        # 2. Iterate in memory-efficient way (server-side cursor or paging)
        # Using simple paging logic to allow commits and pauses

        batch_limit = 50 # Fetch 50 at a time from DB
        offset = 0

        processed_count = 0
        success_count = 0
        error_count = 0

        # Reset state loop
        tax_precalc_stop_event.clear()

        while True:
            # Check stop
            if tax_precalc_stop_event.is_set():
                break

            # Fetch Batch from DB
            # Note: We can't easily use offset with the WHERE clause if we update the rows (they disappear from the result set in the next query)
            # If restart_from_zero=False, the "WHERE sugestie IS NULL" handles the "offset" naturally (always take top N).
            # If restart_from_zero=True, we likely want to just process all.
            # But wait, if restart=True, we process all.

            paged_query_text = select_query.text + f" LIMIT {batch_limit}"
            if restart_from_zero:
                 paged_query_text += f" OFFSET {offset}"

            # Execute query
            cursor = session.execute(text(paged_query_text))
            rows = cursor.mappings().all()

            if not rows:
                break

            logger.info(f"Fetched batch of {len(rows)} cases. Processing...")

            cases_processed_in_batch = 0

            for row in rows:
                if tax_precalc_stop_event.is_set():
                    break

                case_id = row['id']
                obj_data = row['obj']

                # --- PROCESS CASE ---
                try:
                    result = await process_single_case_tax(case_id, obj_data)

                    # Update DB
                    # We update immediately or in small transaction batches?
                    # Safer to update immediately or small groups to save progress.
                    update_q = text("""
                        UPDATE blocuri
                        SET sugestie_llm_taxa = CAST(:suggestion AS jsonb)
                        WHERE id = :case_id
                    """)
                    session.execute(update_q, {
                        'case_id': case_id,
                        'suggestion': json.dumps(result) if result else '{"error": "skipped"}'
                    })
                    session.commit()

                    if result and not result.get('error_message'):
                        success_count += 1
                    else:
                         error_count += 1

                except Exception as e:
                    logger.error(f"Failed case {case_id}: {e}")
                    error_count += 1

                processed_count += 1
                cases_processed_in_batch += 1

                # Update status
                with tax_precalc_status_lock:
                    tax_precalc_status['current_progress']['processed'] = processed_count
                    tax_precalc_status['current_progress']['success_count'] = success_count
                    tax_precalc_status['current_progress']['error_count'] = error_count

                # --- INTELLIGENT PACING ---
                # "Small pause to give time for LLM"
                if processed_count % BATCH_SIZE == 0:
                    logger.info(f"Batch pause ({LLM_BATCH_PAUSE}s) for LLM cooling/re-init...")
                    await asyncio.sleep(LLM_BATCH_PAUSE)
                else:
                    await asyncio.sleep(LLM_SHORT_PAUSE)

            # End of DB batch
            if restart_from_zero:
                offset += batch_limit

            # If not restarting from zero, and we just updated the rows (filled nulls),
            # the next "SELECT ... WHERE sugestie IS NULL" will return new rows automatically.
            # So we don't increment offset.

            # Check if we should stop loop (if fewer rows returned than limit)
            if len(rows) < batch_limit:
                break

        # Finished or Stopped
        logger.info(f"Tax Precalculation finished. Processed: {processed_count}")
        with tax_precalc_status_lock:
            tax_precalc_status['is_running'] = False
            tax_precalc_status['last_run_stats'] = {
                'processed': processed_count,
                'success': success_count,
                'errors': error_count,
                'stopped': tax_precalc_stop_event.is_set()
            }


def ensure_columns_exist_internal(session):
    return ensure_tax_column_exist(session)


def run_tax_precalculation_thread(restart_from_zero: bool):
    """Entry point for the background thread."""
    # We need to run async code in this thread
    asyncio.run(_run_tax_precalculation_async(None, restart_from_zero))

def start_tax_precalculation(restart_from_zero: bool = False):
    """Starts the background thread."""
    with tax_precalc_status_lock:
        if tax_precalc_status['is_running']:
            return {'success': False, 'message': 'Already running'}

    t = threading.Thread(target=run_tax_precalculation_thread, args=(restart_from_zero,), daemon=True)
    t.start()
    return {'success': True, 'message': 'Started tax precalculation'}
