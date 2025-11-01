from fastapi import APIRouter, HTTPException, Depends
from ..schemas import SearchQuery
from ..logic.search_logic import embed_text, search_similar, get_db_connection, get_cached_menu_data
from ..logic.filters import refresh_and_reload
import psycopg2
import psycopg2.extras
from typing import List
from sqlmodel import Session
from ..db import get_session
from ..models import Case

router = APIRouter()

@router.post("/search/")
def search(query: SearchQuery):
    try:
        query_parts = [query.text]
        if query.filters.get("materie"):
            query_parts.append(f"Materie: {', '.join(query.filters['materie'])}")
        if query.filters.get("obiect"):
            query_parts.append(f"Obiect: {', '.join(query.filters['obiect'])}")
        if query.filters.get("tip_speta"):
            query_parts.append(f"Tip speță: {', '.join(query.filters['tip_speta'])}")
        if query.filters.get("parte"):
            query_parts.append(f"Părți: {', '.join(query.filters['parte'])}")

        query_text = " | ".join(query_parts)
        embedding = embed_text(query_text[:8000])
        results = search_similar(query.text, embedding, query.filters)
        return results
    except Exception as e:
        import traceback
        return {"error": str(e), "traceback": traceback.format_exc()}

@router.get("/filters/tip_speta", response_model=List[str])
def get_tip_speta_filters():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT valoare FROM filtre_cache WHERE tip=%s ORDER BY valoare;", ('tip_speta',))
                return [row[0] for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filters/parte", response_model=List[str])
def get_parte_filters():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT valoare FROM filtre_cache WHERE tip=%s ORDER BY valoare;", ('parte',))
                return [row[0] for row in cur.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/filters/menu")
def get_menu_filters():
    menu_data, _, _ = get_cached_menu_data()
    return menu_data or {}

@router.post("/filters/menu/refresh")
def refresh_filters(session: Session = Depends(get_session)):
    try:
        refresh_and_reload(session)
        return {"status": "success", "message": "Cache-ul a fost actualizat."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cases/", response_model=Case)
def create_case(case: Case, session: Session = Depends(get_session)):
    session.add(case)
    session.commit()
    session.refresh(case)
    return case

@router.get("/cases/", response_model=List[Case])
def read_cases(session: Session = Depends(get_session)):
    return session.query(Case).all()
