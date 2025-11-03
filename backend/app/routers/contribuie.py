import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..models import Contributii

router = APIRouter()

UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

@router.post("/contribuie")
def create_contributie(
    denumire: str = Form(...),
    sursa: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    try:
        file_path = UPLOADS_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        contributie = Contributii(
            denumire=denumire,
            sursa=sursa,
            file_path=str(file_path),
        )
        session.add(contributie)
        session.commit()
        session.refresh(contributie)
        return {"message": "Contribuția a fost primită cu succes!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A apărut o eroare: {e}")
