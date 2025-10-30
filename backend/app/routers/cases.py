from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, Session
from ..db import get_session
from ..models import Case
from ..schemas import CaseCreate, CaseRead

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("/", response_model=list[CaseRead])
def list_cases(session: Session = Depends(get_session)):
    return session.exec(select(Case)).all()


@router.post("/", response_model=CaseRead, status_code=201)
def create_case(payload: CaseCreate, session: Session = Depends(get_session)):
    item = Case(**payload.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.get("/{case_id}", response_model=CaseRead)
def get_case(case_id: int, session: Session = Depends(get_session)):
    item = session.get(Case, case_id)
    if not item:
        raise HTTPException(status_code=404, detail="Case not found")
    return item


@router.put("/{case_id}", response_model=CaseRead)
def update_case(case_id: int, payload: CaseCreate, session: Session = Depends(get_session)):
    item = session.get(Case, case_id)
    if not item:
        raise HTTPException(status_code=404, detail="Case not found")
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{case_id}", status_code=204)
def delete_case(case_id: int, session: Session = Depends(get_session)):
    item = session.get(Case, case_id)
    if not item:
        raise HTTPException(status_code=404, detail="Case not found")
    session.delete(item)
    session.commit()
