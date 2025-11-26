from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from sqlmodel import Session
from ..settings_manager import settings_manager
from ..routers.auth import get_current_user
from ..db import get_session

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


@router.get("/export-llm-data", response_model=Dict[str, Any])
async def export_llm_data(
    session: Session = Depends(get_session)
):
    """
    Export fact situations from last search query for LLM refinement.
    Returns JSON with case IDs, names, and full fact situations.

    Only exports results from the most recent search query, not all cases in database.
    This is useful for creating prompts like:
    "Given this user's fact situation, choose the most similar from the following..."
    """
    from ..models import UltimaInterogare
    from sqlmodel import text
    import logging
    import json

    logger = logging.getLogger(__name__)

    try:
        # Get last query data
        ultima = session.get(UltimaInterogare, 1)

        if not ultima or not ultima.speta_ids:
            return {
                'success': False,
                'message': 'Nu există rezultate salvate din ultima căutare.',
                'query_text': '',
                'total_spete': 0,
                'spete': []
            }

        # Fetch cases by IDs using raw SQL to avoid column issues
        # Only select id and obj columns
        placeholders = ', '.join([f':id_{i}' for i in range(len(ultima.speta_ids))])
        query = text(f"""
            SELECT id, obj
            FROM blocuri
            WHERE id IN ({placeholders})
        """)

        # Create parameter dict
        params = {f'id_{i}': speta_id for i, speta_id in enumerate(ultima.speta_ids)}

        # Execute query
        result = session.execute(query, params)
        results = result.mappings().all()

        # Build export data
        spete_export = []
        spete_text_list = []

        for i, row in enumerate(results):
            # Handle obj being either dict or JSON string
            obj_data = row['obj']
            if isinstance(obj_data, str):
                try:
                    obj = json.loads(obj_data)
                except json.JSONDecodeError:
                    logger.warning(f"Could not decode JSON for speta {row['id']}")
                    continue
            else:
                obj = obj_data

            # Extract fact situation from various possible fields
            situatia = (
                obj.get('text_situatia_de_fapt') or
                obj.get('situatia_de_fapt') or
                obj.get('situatie') or
                ""
            )

            # Extract new fields
            text_individualizare = obj.get('text_individualizare', '')
            obiect = obj.get('obiect', '')

            speta_item = {
                'id': row['id'],
                'denumire': obj.get('denumire', f'Caz #{row["id"]}'),
                'situatia_de_fapt': situatia,
                'text_individualizare': text_individualizare,
                'obiect': obiect
            }
            spete_export.append(speta_item)

            # Format for prompt
            spete_text_list.append(f"""
CAZ #{row['id']}:
OBIECT: {obiect}
SITUATIA DE FAPT: {situatia}
ELEMENTE DE INDIVIDUALIZARE: {text_individualizare}
--------------------------------------------------
""")

        # Generate optimized prompt
        prompt_spete = "\n".join(spete_text_list)
        optimized_prompt = f"""Esti un judecator cu experienta, capabil sa analizeze spete juridice complexe si sa identifice precedente relevante.

SARCINA TA:
Analizeaza situatia de fapt prezentata de justitiabil mai jos si compar-o cu lista de spete (cazuri) furnizate.
Identifica cele mai relevante 5 spete care sunt cele mai asemanatoare cu situatia de fapt a utilizatorului, luand in considerare situatia de fapt, obiectul si elementele de individualizare.

SITUATIA DE FAPT A JUSTITIABILULUI:
"{ultima.query_text}"

LISTA DE SPETE PENTRU COMPARATIE:
{prompt_spete}

FORMATUL RASPUNSULUI:
Genereaza EXCLUSIV o lista cu ID-urile celor mai relevante 5 spete, separate prin virgula.
Nu adauga niciun alt text, comentariu, explicatie sau introducere.
Exemplu de raspuns valid: 123, 456, 789, 101, 112
"""

        logger.info(f"Exported {len(spete_export)} cases for LLM from last query: '{ultima.query_text[:50]}'")

        return {
            'success': True,
            'query_text': ultima.query_text,
            'total_spete': len(spete_export),
            'spete': spete_export,
            'optimized_prompt': optimized_prompt
        }

    except Exception as e:
        logger.error(f"Error exporting LLM data: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Eroare la exportul datelor: {str(e)}"
        )
