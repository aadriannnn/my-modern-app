import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..logic.filters import refresh_and_reload
from ..models import FiltreEchivalente
from ..cache import get_cached_filters, load_all_filters_into_memory
import csv
import codecs
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/filters", tags=["filters"])
logger = logging.getLogger(__name__)


@router.post("/refresh")
async def refresh_filters(session: Session = Depends(get_session)):
    """
    Forces a full refresh of the database cache tables and then reloads
    the in-memory cache from that data.
    """
    logger.info("Received request to refresh filters.")
    try:
        # 1. Refresh the underlying database tables
        refresh_and_reload(session)
        logger.info("Database filter tables have been refreshed.")

        # 2. Reload the in-memory cache from the newly populated DB tables
        load_all_filters_into_memory(session)
        logger.info("In-memory filter cache has been reloaded.")

        return {"message": "Filters refreshed and reloaded successfully"}
    except Exception as e:
        logger.error(f"Error during filter refresh and reload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/menu")
async def get_filters():
    """
    Returns the filter data from the pre-populated in-memory cache.
    This is fast and consistent.
    """
    logger.info("--- Request received for GET /api/filters/menu ---")

    cached_data = get_cached_filters()

    # The cache should always be loaded by the startup event.
    # If it's not, it indicates a server startup problem.
    if not cached_data.get("is_loaded"):
        logger.error("CRITICAL: Filter cache is not loaded. Server startup may have failed.")
        raise HTTPException(
            status_code=503,
            detail="Filter data is not available at the moment. Please try again later."
        )

    logger.info(f"Returning {len(cached_data['tipSpeta'])} 'tipSpeta' and {len(cached_data['parte'])} 'parte' items from cache.")

    # Don't return the 'is_loaded' flag to the client
    response_data = {k: v for k, v in cached_data.items() if k != 'is_loaded'}

    return response_data


@router.get("/equivalences/export")
async def export_equivalences(session: Session = Depends(get_session)):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['type', 'term_canonic_original', 'term_preferat'])
    equivalences = session.exec(select(FiltreEchivalente)).all()
    for eq in equivalences:
        writer.writerow([eq.type, eq.term_canonic_original, eq.term_preferat])
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=equivalences.csv"})


@router.post("/equivalences/import")
async def import_equivalences(file: UploadFile = File(...), session: Session = Depends(get_session)):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        csv_reader = csv.reader(codecs.iterdecode(file.file, 'utf-8-sig'))
        header = next(csv_reader)
        if header != ['type', 'term_canonic_original', 'term_preferat']:
            raise HTTPException(status_code=400, detail="Invalid CSV header")

        session.exec(FiltreEchivalente).delete()

        to_insert = []
        for row in csv_reader:
            if not row or len(row) < 3 or not row[0] or not row[1]:
                continue
            to_insert.append(FiltreEchivalente(type=row[0], term_canonic_original=row[1], term_preferat=row[2] or row[1]))

        if not to_insert:
            raise HTTPException(status_code=400, detail="CSV file is empty or invalid")

        session.add_all(to_insert)
        session.commit()

        return {"message": f"Successfully imported {len(to_insert)} equivalences. Please refresh filters to apply changes."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {e}")

    finally:
        file.file.close()
