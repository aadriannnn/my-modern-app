from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session
from ..db import get_session
import csv
import json
import codecs
from typing import IO
from pydantic import BaseModel


router = APIRouter(prefix="/filters", tags=["filters"])


class EquivalenceItem(BaseModel):
    type: str
    term_canonic_original: str
    term_preferat: str


def get_db():
    pass


@router.post("/refresh")
async def refresh_filters(session: Session = Depends(get_db)):
    pass


@router.get("/equivalences/export")
async def export_equivalences(session: Session = Depends(get_db)):
    pass


@router.post("/equivalences/import")
async def import_equivalences(file: UploadFile = File(...), session: Session = Depends(get_db)):
    if file.content_type != 'text/csv':
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        csv_reader = csv.reader(codecs.iterdecode(file.file, 'utf-8-sig'))
        header = next(csv_reader)
        if header != ['type', 'term_canonic_original', 'term_preferat']:
            raise HTTPException(
                status_code=400, detail="Invalid CSV header")

        to_insert = [EquivalenceItem(type=row[0], term_canonic_original=row[1], term_preferat=row[2] or row[1])
                     for row in csv_reader if row and len(row) >= 3 and row[0] and row[1]]

        if not to_insert:
            raise HTTPException(
                status_code=400, detail="CSV file is empty or invalid")

        return {"message": f"Successfully imported {len(to_insert)} equivalences. Please refresh filters to apply changes."}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing file: {e}")

    finally:
        file.file.close()
