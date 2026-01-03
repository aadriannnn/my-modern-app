"""
Service for pre-calculating and caching relevant models and legal codes for each case.
This optimization reduces query response times by storing pre-computed matches.
"""
import logging
import threading
from sqlmodel import Session, select, text
from typing import Dict, Any, List, Optional
from datetime import datetime

from ..db import get_session
from ..db_modele import get_modele_session
from ..db_coduri import get_coduri_session
from .modele_matching import get_relevant_modele
from .coduri_matching import get_relevant_articles

logger = logging.getLogger(__name__)

# Global state for process control
precalc_stop_event = threading.Event()
precalc_status_lock = threading.Lock()
precalc_status = {
    'is_running': False,
    'can_resume': False,
    'last_run_stats': None,
    'current_progress': {
        'processed': 0,
        'total': 0,
        'with_modele': 0,
        'with_coduri': 0
    }
}


def ensure_columns_exist(session: Session) -> bool:
    """
    Ensures that modele_speta and coduri_speta columns exist in the blocuri table.
    Uses ALTER TABLE to add columns if they don't exist.

    Returns:
        True if columns exist or were successfully created, False otherwise
    """
    logger.info("Checking if pre-calculation columns exist in blocuri table...")

    try:
        # Check if columns already exist
        check_query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'blocuri'
            AND column_name IN ('modele_speta', 'coduri_speta')
        """)

        result = session.execute(check_query)
        existing_columns = {row[0] for row in result}

        columns_to_add = []
        if 'modele_speta' not in existing_columns:
            columns_to_add.append('modele_speta')
        if 'coduri_speta' not in existing_columns:
            columns_to_add.append('coduri_speta')
        if 'updated_at' not in existing_columns:
            columns_to_add.append('updated_at')

        if not columns_to_add:
            logger.info("Pre-calculation columns already exist")
            return True

        # Add missing columns
        for column_name in columns_to_add:
            logger.info(f"Adding column {column_name} to blocuri table...")
            if column_name == 'updated_at':
                alter_query = text(f"""
                    ALTER TABLE blocuri
                    ADD COLUMN IF NOT EXISTS {column_name} TIMESTAMP DEFAULT NOW()
                """)
            else:
                alter_query = text(f"""
                    ALTER TABLE blocuri
                    ADD COLUMN IF NOT EXISTS {column_name} JSONB
                """)
            session.execute(alter_query)

        session.commit()
        logger.info(f"Successfully added columns: {', '.join(columns_to_add)}")
        return True

    except Exception as e:
        logger.error(f"Error ensuring columns exist: {e}", exc_info=True)
        session.rollback()
        return False


def extract_case_metadata(obj_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts relevant metadata from a case's obj JSONB field for matching.

    Args:
        obj_data: The obj field from blocuri table

    Returns:
        Dictionary with standardized field names for matching logic
    """
    # Extract fields, handling various possible field names
    materie = obj_data.get('materie', '')
    obiect = obj_data.get('obiect', obj_data.get('obiect_juridic', ''))

    # Keywords can be in different formats
    keywords = obj_data.get('keywords', [])
    if not keywords:
        keywords = obj_data.get('cuvinte_cheie', [])

    # Situatia de fapt
    situatia_de_fapt = obj_data.get('situatia_de_fapt', obj_data.get('situatie_fapt', ''))

    # AI summary
    rezumat_ai = obj_data.get('Rezumat_generat_de_AI_Cod', obj_data.get('rezumat_ai', ''))

    return {
        'materie': materie,
        'obiect': obiect,
        'keywords': keywords,
        'situatia_de_fapt': situatia_de_fapt,
        'rezumat_ai': rezumat_ai
    }


def precalculate_for_single_case(
    case_id: int,
    obj_data: Dict[str, Any],
    modele_session: Session,
    coduri_session: Session,
    limit_modele: int = 5,
    limit_coduri: int = 5
) -> tuple[Optional[List[Dict]], Optional[List[Dict]]]:
    """
    Pre-calculates relevant models and codes for a single case.

    Args:
        case_id: ID of the case
        obj_data: The obj JSONB field data
        modele_session: Database session for modele_documente
        coduri_session: Database session for coduri
        limit_modele: Maximum number of models to store
        limit_coduri: Maximum number of codes to store

    Returns:
        Tuple of (modele_list, coduri_list)
    """
    case_metadata = extract_case_metadata(obj_data)

    # Skip if no meaningful metadata
    if not case_metadata.get('materie') and not case_metadata.get('obiect'):
        logger.debug(f"Skipping case {case_id} - no materie or obiect")
        return None, None

    modele_results = None
    coduri_results = None

    # Get relevant models
    try:
        modele_results = get_relevant_modele(modele_session, case_metadata, limit=limit_modele)
        if modele_results:
            # Store only essential fields to save space
            modele_results = [
                {
                    'id': m['id'],
                    'titlu_model': m.get('titlu_model'),
                    'relevance_score': m.get('relevance_score', 0.0)
                }
                for m in modele_results
            ]
    except Exception as e:
        logger.error(f"Error getting models for case {case_id}: {e}", exc_info=True)

    # Get relevant codes
    try:
        coduri_results = get_relevant_articles(coduri_session, case_metadata, limit=limit_coduri)
        if coduri_results:
            # Store only essential fields
            coduri_results = [
                {
                    'id': c['id'],
                    'numar': c.get('numar'),
                    'titlu': c.get('titlu'),
                    'cod_sursa': c.get('cod_sursa'),
                    'relevance_score': c.get('relevance_score', 0.0)
                }
                for c in coduri_results
            ]
    except Exception as e:
        logger.error(f"Error getting codes for case {case_id}: {e}", exc_info=True)

    return modele_results, coduri_results


def get_precalculation_status(main_session: Session) -> Dict[str, Any]:
    """
    Get the current status of the precalculation process.

    Args:
        main_session: Database session for checking incomplete cases

    Returns:
        Dictionary with current status information
    """
    with precalc_status_lock:
        status_copy = {
            'is_running': precalc_status['is_running'],
            'can_resume': precalc_status['can_resume'],
            'last_run_stats': precalc_status['last_run_stats'],
            'current_progress': precalc_status['current_progress'].copy()
        }

    # Check if there are incomplete cases (only if not currently running)
    if not status_copy['is_running']:
        try:
            incomplete_query = text("""
                SELECT COUNT(*)
                FROM blocuri
                WHERE modele_speta IS NULL OR coduri_speta IS NULL
            """)
            incomplete_count = main_session.execute(incomplete_query).scalar()
            status_copy['can_resume'] = incomplete_count > 0
            status_copy['incomplete_count'] = incomplete_count
        except Exception as e:
            logger.error(f"Error checking incomplete cases: {e}")
            status_copy['can_resume'] = False
            status_copy['incomplete_count'] = 0

    return status_copy


def stop_precalculation() -> Dict[str, Any]:
    """
    Stop the currently running precalculation process.

    Returns:
        Confirmation dictionary
    """
    with precalc_status_lock:
        if not precalc_status['is_running']:
            return {
                'success': False,
                'message': 'No precalculation process is currently running'
            }

    # Set the stop event
    precalc_stop_event.set()
    logger.info("Stop signal sent to precalculation process")

    return {
        'success': True,
        'message': 'Stop signal sent. The process will stop after completing the current batch.'
    }


def precalculate_models_and_codes(
    main_session: Session,
    modele_session: Session,
    coduri_session: Session,
    batch_size: int = 100,
    limit_modele: int = 5,
    limit_coduri: int = 5,
    restart_from_zero: bool = False
) -> Dict[str, Any]:
    """
    Main function to pre-calculate and store models and codes for all cases.

    Args:
        main_session: Database session for main database (blocuri)
        modele_session: Database session for modele_documente
        coduri_session: Database session for coduri
        batch_size: Number of cases to process before committing
        limit_modele: Maximum models to store per case
        limit_coduri: Maximum codes to store per case
        restart_from_zero: If True, reset all precalculated data and start from scratch.
                          If False, only process cases with incomplete data.

    Returns:
        Statistics dictionary with processing results
    """
    start_time = datetime.now()
    logger.info("=" * 80)
    logger.info(f"Starting pre-calculation (restart_from_zero={restart_from_zero})")
    logger.info("=" * 80)

    # Clear stop event and set running status
    precalc_stop_event.clear()
    with precalc_status_lock:
        precalc_status['is_running'] = True
        precalc_status['current_progress'] = {
            'processed': 0,
            'total': 0,
            'with_modele': 0,
            'with_coduri': 0
        }

    # Ensure columns exist
    if not ensure_columns_exist(main_session):
        with precalc_status_lock:
            precalc_status['is_running'] = False
        return {
            'success': False,
            'error': 'Failed to ensure database columns exist',
            'processed': 0
        }

    # Note: When restart_from_zero=True, we process all cases and overwrite existing data
    # No need to explicitly reset - the UPDATE will handle it
    if restart_from_zero:
        logger.info("Restart mode: Will process ALL cases and overwrite existing data")

    stats = {
        'total_cases': 0,
        'processed': 0,
        'with_modele': 0,
        'with_coduri': 0,
        'errors': 0,
        'skipped': 0,
        'stopped': False
    }

    try:
        # Build query based on restart mode
        if restart_from_zero:
            count_query = text("SELECT COUNT(*) FROM blocuri")
            logger.info("Processing ALL cases (restart from zero)")
        else:
            count_query = text("""
                SELECT COUNT(*) FROM blocuri
                WHERE modele_speta IS NULL OR coduri_speta IS NULL
            """)
            logger.info("Processing only INCOMPLETE cases (resume mode)")

        total_cases = main_session.execute(count_query).scalar()
        stats['total_cases'] = total_cases

        # Update status with total
        with precalc_status_lock:
            precalc_status['current_progress']['total'] = total_cases

        logger.info(f"Total cases to process: {total_cases}")

        # Process in batches
        offset = 0

        while True:
            # Check for stop signal
            if precalc_stop_event.is_set():
                logger.warning("Stop signal received. Stopping precalculation...")
                stats['stopped'] = True
                break

            # Fetch batch of cases
            if restart_from_zero:
                query = text("""
                    SELECT id, obj
                    FROM blocuri
                    ORDER BY id
                    LIMIT :batch_size OFFSET :offset
                """)
            else:
                query = text("""
                    SELECT id, obj
                    FROM blocuri
                    WHERE modele_speta IS NULL OR coduri_speta IS NULL
                    ORDER BY id
                    LIMIT :batch_size OFFSET :offset
                """)

            result = main_session.execute(
                query,
                {'batch_size': batch_size, 'offset': offset}
            )
            rows = result.mappings().all()

            if not rows:
                break  # No more cases to process

            logger.info(f"Processing batch: cases {offset + 1} to {offset + len(rows)}")

            # Process each case in batch
            for row in rows:
                # Check for stop signal at the start of each case
                if precalc_stop_event.is_set():
                    logger.warning("Stop signal detected during case processing")
                    stats['stopped'] = True
                    break

                case_id = row['id']
                obj_data = row['obj']

                try:
                    modele_results, coduri_results = precalculate_for_single_case(
                        case_id,
                        obj_data,
                        modele_session,
                        coduri_session,
                        limit_modele,
                        limit_coduri
                    )

                    if modele_results is None and coduri_results is None:
                        stats['skipped'] += 1
                        continue

                    # Update the case with pre-calculated data
                    import json
                    update_query = text("""
                        UPDATE blocuri
                        SET modele_speta = CAST(:modele AS jsonb),
                            coduri_speta = CAST(:coduri AS jsonb),
                            updated_at = :updated_at
                        WHERE id = :case_id
                    """)

                    main_session.execute(update_query, {
                        'case_id': case_id,
                        'modele': json.dumps(modele_results) if modele_results else None,
                        'coduri': json.dumps(coduri_results) if coduri_results else None,
                        'updated_at': datetime.now()
                    })

                    stats['processed'] += 1
                    if modele_results:
                        stats['with_modele'] += 1
                    if coduri_results:
                        stats['with_coduri'] += 1

                except Exception as e:
                    logger.error(f"Error processing case {case_id}: {e}", exc_info=True)
                    stats['errors'] += 1
                    main_session.rollback()
                    continue

            # Check if we should stop after processing this batch
            if stats.get('stopped'):
                logger.info("Stopping after current batch as requested")
                break

            # Commit batch
            main_session.commit()
            logger.info(f"Committed batch. Progress: {stats['processed']}/{total_cases}")

            # Update status after each batch
            with precalc_status_lock:
                precalc_status['current_progress']['processed'] = stats['processed']
                precalc_status['current_progress']['with_modele'] = stats['with_modele']
                precalc_status['current_progress']['with_coduri'] = stats['with_coduri']

            offset += batch_size

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        logger.info("=" * 80)
        if stats['stopped']:
            logger.info("Pre-calculation STOPPED by user")
        else:
            logger.info("Pre-calculation completed successfully")
        logger.info(f"Total cases: {stats['total_cases']}")
        logger.info(f"Processed: {stats['processed']}")
        logger.info(f"With models: {stats['with_modele']}")
        logger.info(f"With codes: {stats['with_coduri']}")
        logger.info(f"Skipped: {stats['skipped']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info("=" * 80)

        stats['success'] = True
        stats['duration_seconds'] = duration

        # Update final status
        with precalc_status_lock:
            precalc_status['is_running'] = False
            precalc_status['last_run_stats'] = stats.copy()

        return stats

    except Exception as e:
        logger.error(f"Fatal error in pre-calculation: {e}", exc_info=True)
        main_session.rollback()

        # Update status on error
        with precalc_status_lock:
            precalc_status['is_running'] = False
            error_stats = {
                'success': False,
                'error': str(e),
                **stats
            }
            precalc_status['last_run_stats'] = error_stats

        return {
            'success': False,
            'error': str(e),
            **stats
        }
