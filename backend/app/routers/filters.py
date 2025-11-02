import logging
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
from ..db import get_session, init_db
from ..logic.filters import refresh_and_reload
from ..models import Blocuri, FiltreCache, FiltreEchivalente, FiltreCacheMenu
import csv
import codecs
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/filters", tags=["filters"])
logger = logging.getLogger(__name__)


@router.post("/refresh")
async def refresh_filters(session: Session = Depends(get_session)):
    logger.info("Received request to refresh filters.")
    try:
        refresh_and_reload(session)
        logger.info("Filter refresh process completed successfully.")
        return {"message": "Filters refreshed successfully"}
    except Exception as e:
        logger.error(f"Error refreshing filters: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/menu")
async def get_filters(session: Session = Depends(get_session)):
    logger.info("--- Request received for GET /api/filters/menu ---")

    logger.info("Step 1: Fetching main menu data from 'filtre_cache_menu'.")
    menu_row = session.get(FiltreCacheMenu, 1)
    if not menu_row:
        logger.error("Menu data not found in 'filtre_cache_menu'. Raising 404.")
        raise HTTPException(404, "Menu not generated yet. Run POST /api/filters/refresh first.")
    logger.info("Main menu data fetched successfully.")

    logger.info("Step 2: Fetching simple filters from 'filtre_cache'.")
    tip_speta_query = select(FiltreCache.valoare).where(FiltreCache.tip == "tip_speta").order_by(FiltreCache.valoare)
    parte_query = select(FiltreCache.valoare).where(FiltreCache.tip == "parte").order_by(FiltreCache.valoare)

    tip_speta = session.exec(tip_speta_query).scalars().all()
    parte = session.exec(parte_query).scalars().all()
    logger.info(f"Found {len(tip_speta)} 'tip_speta' values.")
    logger.info(f"Found {len(parte)} 'parte' values.")

    response_data = {
        "menuData": menu_row.menu_data,
        "tipSpeta": tip_speta,
        "parte": parte,
        "last_updated": menu_row.last_updated
    }

    logger.info("Successfully assembled filter data. Returning response.")
    # Optional: Log the first few items of each list to avoid huge log entries
    logger.debug(f"Returning tipSpeta (sample): {tip_speta[:5]}")
    logger.debug(f"Returning parte (sample): {parte[:5]}")

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
