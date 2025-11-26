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
    import logging

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

        # Use helper to generate data and prompt
        spete_export, optimized_prompt = _generate_llm_data(session, ultima)

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


@router.post("/analyze-llm-data", response_model=Dict[str, Any])
async def analyze_llm_data(
    session: Session = Depends(get_session)
):
    """
    Start LLM analysis and return job_id immediately.
    Client should poll /analyze-llm-status/{job_id} for results.
    """
    from ..models import UltimaInterogare
    from ..logic.queue_manager import queue_manager
    import logging
    import httpx

    logger = logging.getLogger(__name__)

    try:
        # Get last query data
        ultima = session.get(UltimaInterogare, 1)

        if not ultima or not ultima.speta_ids:
            return {
                'success': False,
                'message': 'Nu există rezultate salvate din ultima căutare.',
            }

        # Generate the prompt using the helper
        _, optimized_prompt = _generate_llm_data(session, ultima)

        # Define async processor function
        async def process_llm_analysis(payload: dict):
            """Process the LLM analysis."""
            # Get LLM URL from settings
            llm_url = settings_manager.get_value('setari_llm', 'llm_url', 'http://192.168.1.30:8005/generate')
            logger.info(f"Sending request to LLM at {llm_url}...")

            llm_payload = {
                "prompt": payload['prompt'],
                "max_tokens": 512,
                "temperature": 0.1
            }

            async with httpx.AsyncClient(timeout=1200.0) as client:
                response = await client.post(llm_url, json=llm_payload)
                response.raise_for_status()
                result = response.json()

            logger.info("Received response from LLM")

            return {
                'success': True,
                'response': result.get('response', ''),
                'full_response': result
            }

        # Add to queue and get job_id immediately
        payload = {'prompt': optimized_prompt}
        job_id, _ = await queue_manager.add_to_queue(payload, process_llm_analysis)

        logger.info(f"LLM analysis queued with job_id: {job_id}")

        return {
            'success': True,
            'job_id': job_id,
            'message': 'Analiză pusă în coadă. Folosește job_id pentru a verifica statusul.'
        }

    except RuntimeError as e:
        logger.error(f"Queue error: {e}")
        raise HTTPException(status_code=503, detail=f"Coada este plină. Vă rugăm să încercați din nou mai târziu.")
    except Exception as e:
        logger.error(f"Error queuing LLM analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Eroare internă: {str(e)}")


@router.get("/analyze-llm-status/{job_id}", response_model=Dict[str, Any])
async def get_analyze_llm_status(job_id: str):
    """
    Check the status of an LLM analysis job.
    Returns: {status: 'queued'|'processing'|'completed'|'failed'|'not_found', ...}
    """
    from ..logic.queue_manager import queue_manager
    import logging

    logger = logging.getLogger(__name__)

    try:
        status = queue_manager.get_job_status(job_id)
        logger.info(f"Job {job_id} status: {status.get('status')}")
        return status
    except Exception as e:
        logger.error(f"Error getting job status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Eroare la verificarea statusului: {str(e)}")


def _generate_llm_data(session: Session, ultima: Any):
    """
    Helper to generate the export data and optimized prompt.
    """
    from sqlmodel import text
    import json
    import logging

    logger = logging.getLogger(__name__)

    # Fetch cases by IDs using raw SQL
    placeholders = ', '.join([f':id_{i}' for i in range(len(ultima.speta_ids))])
    query = text(f"SELECT id, obj FROM blocuri WHERE id IN ({placeholders})")

    params = {f'id_{i}': speta_id for i, speta_id in enumerate(ultima.speta_ids)}

    result = session.execute(query, params)
    results = result.mappings().all()

    spete_export = []
    spete_text_list = []

    for row in results:
        obj_data = row['obj']
        if isinstance(obj_data, str):
            try:
                obj = json.loads(obj_data)
            except json.JSONDecodeError:
                continue
        else:
            obj = obj_data

        situatia = (
            obj.get('text_situatia_de_fapt') or
            obj.get('situatia_de_fapt') or
            obj.get('situatie') or
            ""
        )

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

        spete_text_list.append(f"""
CAZ #{row['id']}:
OBIECT: {obiect}
SITUATIA DE FAPT: {situatia}
ELEMENTE DE INDIVIDUALIZARE: {text_individualizare}
--------------------------------------------------
""")

    prompt_spete = "\n".join(spete_text_list)

    # Get prompt template from settings
    prompt_template = settings_manager.get_value(
        'setari_llm',
        'llm_prompt_template',
        # Default fallback value
        'Esti un judecator cu experienta, capabil sa analizeze spete juridice complexe si sa identifice precedente relevante.\n\nSARCINA TA:\nAnalizeaza situatia de fapt prezentata de justitiabil mai jos si compar-o cu lista de spete (cazuri) furnizate.\nIdentifica cele mai relevante 5 spete care sunt cele mai asemanatoare cu situatia de fapt a utilizatorului, luand in considerare situatia de fapt, obiectul si elementele de individualizare.\n\nSITUATIA DE FAPT A JUSTITIABILULUI:\n"{query_text}"\n\nLISTA DE SPETE PENTRU COMPARATIE:\n{prompt_spete}\n\nFORMATUL RASPUNSULUI:\nGenereaza EXCLUSIV o lista cu ID-urile celor mai relevante 5 spete, separate prin virgula.\nNu adauga niciun alt text, comentariu, explicatie sau introducere.\nExemplu de raspuns valid: 123, 456, 789, 101, 112'
    )

    # Format the template with actual data
    optimized_prompt = prompt_template.format(
        query_text=ultima.query_text,
        prompt_spete=prompt_spete
    )

    return spete_export, optimized_prompt
