from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
from ..db import get_session
from ..logic.filters import load_and_build_menu_data, save_menu_data_to_db
from ..models import FiltreEchivalente, FiltreCacheMenu
import csv
import codecs
from fastapi.responses import StreamingResponse
import io

router = APIRouter(prefix="/filters", tags=["filters"])


@router.post("/refresh")
async def refresh_filters(session: Session = Depends(get_session)):
    try:
        menu_data, materii_map, obiecte_map = load_and_build_menu_data(session)
        save_menu_data_to_db(session, menu_data, materii_map, obiecte_map)
        return {"message": "Filters refreshed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
async def get_filters(session: Session = Depends(get_session)):
    menu = session.get(FiltreCacheMenu, 1)
    if not menu:
        raise HTTPException(status_code=404, detail="Filter menu not found. Please refresh filters.")
    return menu.menu_data


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
