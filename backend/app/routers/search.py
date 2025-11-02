from fastapi import APIRouter, HTTPException
from ..schemas import SearchQuery
from ..logic.search_logic import embed_text, search_similar
from typing import List
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
