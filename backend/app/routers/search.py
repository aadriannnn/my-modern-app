from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from ..db import get_session
from ..logic.embedding import embed_text
from ..logic.search import search_similar

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/")
async def search(payload: dict, session: Session = Depends(get_session)):
    query_text = payload.get("query_text")
    filters = payload.get("filters")
    if not query_text:
        raise HTTPException(status_code=400, detail="Query text is required")
    try:
        embedding = await embed_text(query_text)
        results = await search_similar(session, query_text, embedding, filters)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
