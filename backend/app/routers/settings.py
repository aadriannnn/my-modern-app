from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from ..settings_manager import settings_manager
from ..routers.auth import get_current_user

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=Dict[str, Any])
async def get_settings():
    """
    Get all current settings.
    """
    return settings_manager.get_settings()

@router.put("/", response_model=Dict[str, Any])
async def update_settings(new_settings: Dict[str, Any]):
    """
    Update settings.
    """
    try:
        settings_manager.save_settings(new_settings)
        return settings_manager.get_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reset", response_model=Dict[str, Any])
async def reset_settings():
    """
    Reset settings to defaults.
    """
    try:
        settings_manager.reset_to_defaults()
        return settings_manager.get_settings()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/precalculate-models-codes", response_model=Dict[str, Any])
async def precalculate_models_codes(
    restart: bool = False
):
    """
    Triggers pre-calculation of models and codes for all cases.
    This is a resource-intensive operation that should be run during off-peak hours.
    Runs in a background thread to avoid blocking the API.

    Query Parameters:
        restart: If True, reset all precalculated data and start from scratch.
                If False, only process incomplete cases (resume mode).
    """
    from ..db import engine as main_engine
    from ..db_modele import modele_engine
    from ..db_coduri import coduri_engine
    from sqlmodel import Session
    from ..logic.precalculation_service import precalculate_models_and_codes, precalc_status, precalc_status_lock
    import logging
    import threading

    logger = logging.getLogger(__name__)
    logger.info(f"Pre-calculation endpoint called, restart={restart}")

    # Check if already running
    with precalc_status_lock:
        if precalc_status['is_running']:
            return {
                'success': False,
                'message': 'A precalculation process is already running',
                'is_running': True
            }

    def run_precalculation():
        """Background thread function to run precalculation"""
        try:
            with Session(main_engine) as main_session, \
                 Session(modele_engine) as modele_session, \
                 Session(coduri_engine) as coduri_session:

                results = precalculate_models_and_codes(
                    main_session=main_session,
                    modele_session=modele_session,
                    coduri_session=coduri_session,
                    batch_size=100,
                    limit_modele=5,
                    limit_coduri=5,
                    restart_from_zero=restart
                )
                logger.info(f"Precalculation completed: {results}")
        except Exception as e:
            logger.error(f"Error in background precalculation: {e}", exc_info=True)

    # Start the background thread
    thread = threading.Thread(target=run_precalculation, daemon=True)
    thread.start()

    return {
        'success': True,
        'message': 'Precalculation started in background',
        'is_running': True,
        'restart_mode': restart
    }


@router.get("/precalculate-status", response_model=Dict[str, Any])
async def get_precalculate_status():
    """
    Get the current status of the precalculation process.
    """
    from ..db import engine as main_engine
    from sqlmodel import Session
    from ..logic.precalculation_service import get_precalculation_status

    try:
        with Session(main_engine) as main_session:
            status = get_precalculation_status(main_session)
            return status
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting precalculation status: {str(e)}"
        )


@router.post("/precalculate-stop", response_model=Dict[str, Any])
async def stop_precalculate():
    """
    Stop the currently running precalculation process.
    """
    from ..logic.precalculation_service import stop_precalculation
    import logging

    logger = logging.getLogger(__name__)
    logger.info("Stop precalculation requested")

    try:
        result = stop_precalculation()
        return result
    except Exception as e:
        logger.error(f"Error stopping precalculation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error stopping precalculation: {str(e)}"
        )
