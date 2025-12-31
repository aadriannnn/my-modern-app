from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Any
from ..db import get_session
from ..models import DosarItem, ClientDB
from ..routers.auth import get_current_user

router = APIRouter(
    prefix="/dosar",
    tags=["dosar"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[DosarItem])
async def get_dosar_items(
    current_user: ClientDB = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all saved cases for the current user.
    """
    statement = select(DosarItem).where(DosarItem.user_id == current_user.id).order_by(DosarItem.created_at.desc())
    items = session.exec(statement).all()
    return items

@router.post("/", response_model=DosarItem)
async def add_dosar_item(
    item_data: dict,
    current_user: ClientDB = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Add a case to the user's dosar.
    Enforces a limit of 10 cases per user.
    """
    # Check current count
    count_statement = select(DosarItem).where(DosarItem.user_id == current_user.id)
    existing_items = session.exec(count_statement).all()

    if len(existing_items) >= 10:
        raise HTTPException(status_code=400, detail="Limita de 10 dosare a fost atinsă. Ștergeți un dosar vechi pentru a adăuga unul nou.")

    case_id = str(item_data.get("id"))
    if not case_id:
        raise HTTPException(status_code=400, detail="Missing case ID")

    # Check if already exists
    for item in existing_items:
        if str(item.case_id) == case_id:
             raise HTTPException(status_code=400, detail="Această speță este deja în dosar.")

    new_item = DosarItem(
        user_id=current_user.id,
        case_id=case_id,
        case_data=item_data
    )

    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item

@router.delete("/{case_id}")
async def remove_dosar_item(
    case_id: str,
    current_user: ClientDB = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Remove a case from the user's dosar.
    """
    statement = select(DosarItem).where(DosarItem.user_id == current_user.id, DosarItem.case_id == case_id)
    result = session.exec(statement).first()

    if not result:
        raise HTTPException(status_code=404, detail="Item not found")

    session.delete(result)
    session.commit()
    return {"ok": True}
