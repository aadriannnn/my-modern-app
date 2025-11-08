import logging
import requests
from sqlmodel import Session, text
from typing import List, Dict, Any

from ..config import get_settings
from ..schemas import SearchRequest
from ..cache import get_cached_filters

settings = get_settings()
logger = logging.getLogger(__name__)

def embed_text(text_to_embed: str) -> List[float]:
    """
    Embeds the given text using the Ollama service.
    Returns a zero-filled vector if embedding fails for any reason.
    """
    if not text_to_embed or not text_to_embed.strip():
        logger.warning("Embed text called with empty string. Returning zero vector.")
        return [0.0] * settings.VECTOR_DIM

    logger.info("Calling Ollama API for embedding...")
    try:
        r = requests.post(
            f"{settings.OLLAMA_URL}/api/embed",
            json={"model": settings.MODEL_NAME, "input": text_to_embed},
            timeout=60  # seconds
        )
        r.raise_for_status()

        # Correctly parse the new response structure
        embedding = r.json().get("embeddings", [[]])[0]

        if not embedding:
            raise ValueError("Ollama returned an empty embedding.")
        if len(embedding) != settings.VECTOR_DIM:
            raise ValueError(
                f"Embedding dimension mismatch. Expected {settings.VECTOR_DIM}, "
                f"got {len(embedding)} from model '{settings.MODEL_NAME}'."
            )

        logger.info(f"Embedding generated successfully ({len(embedding)} dims)")
        return embedding
    except (requests.RequestException, ValueError) as e:
        logger.warning(f"Failed to get embedding, returning zero vector. Error: {e}")
        return [0.0] * settings.VECTOR_DIM

def _build_common_where_clause(req: SearchRequest, dialect: str) -> (str, Dict[str, Any]):
    """Builds the filter part of the WHERE clause, aware of SQL dialect."""
    where_clauses = []
    params = {}

    # Helper to get the correct JSON access syntax
    def json_accessor(field: str) -> str:
        if dialect == 'postgresql':
            return f"b.obj->>'{field}'"
        else:  # sqlite
            return f"json_extract(b.obj, '$.{field}')"

    cached_filters = get_cached_filters()
    materii_map = cached_filters.get("materii_map", {})
    obiecte_map = cached_filters.get("obiecte_map", {})

    def get_original_terms(canonical_terms: List[str], term_map: Dict[str, List[str]]) -> List[str]:
        original_terms = set(canonical_terms)
        for term in canonical_terms:
            original_terms.update(term_map.get(term, []))
        return list(original_terms)

    # Each filter now uses the json_accessor helper
    if req.materie:
        materii_to_check = get_original_terms(req.materie, materii_map)
        conditions = []
        for i, term in enumerate(materii_to_check):
            param_name = f"materie_{i}"
            conditions.append(f"{json_accessor('materie')} ILIKE :{param_name}")
            params[param_name] = f"%{term}%"
        where_clauses.append(f"({' OR '.join(conditions)})")

    if req.obiect:
        obiecte_to_check = get_original_terms(req.obiect, obiecte_map)
        conditions = []
        for i, term in enumerate(obiecte_to_check):
            param_name = f"obiect_{i}"
            conditions.append(f"{json_accessor('obiect')} ILIKE :{param_name}")
            params[param_name] = f"%{term}%"
        where_clauses.append(f"({' OR '.join(conditions)})")

    if req.tip_speta:
        conditions = []
        for i, term in enumerate(req.tip_speta):
            param_name = f"tip_speta_{i}"
            conditions.append(f"{json_accessor('tip_speta')} ILIKE :{param_name}")
            params[param_name] = f"%{term}%"
        where_clauses.append(f"({' OR '.join(conditions)})")

    if req.parte:
        conditions = []
        for i, term in enumerate(req.parte):
            param_name = f"parte_{i}"
            conditions.append(f"{json_accessor('parte')} ILIKE :{param_name}")
            params[param_name] = f"%{term}%"
        where_clauses.append(f"({' OR '.join(conditions)})")

    return " AND ".join(where_clauses), params

import math
import json

def _process_results(rows: List[Dict], distance_metric: str = "semantic_distance") -> List[Dict]:
    """Processes raw DB rows into the final result format."""
    results = []
    for row in rows:
        obj_data = row.get('obj', '{}')
        if isinstance(obj_data, str):
            try:
                obj = json.loads(obj_data)
            except json.JSONDecodeError:
                logger.warning(f"Could not decode JSON for row {row.get('id')}. Skipping.")
                continue
        else:
            obj = obj_data

        score = 0.0
        distance = row.get(distance_metric)

        if distance is not None:
            try:
                # Ensure the distance is a valid float before calculation
                float_distance = float(distance)
                # Check for NaN or infinity before calculating the score
                if not math.isnan(float_distance) and math.isfinite(float_distance):
                    score = 1.0 - float_distance
                else:
                    logger.warning(f"Invalid float value for distance: {distance}. Defaulting score to 0.")
            except (ValueError, TypeError):
                logger.warning(f"Could not convert distance '{distance}' to float. Defaulting score to 0.")

        results.append({
            "id": row['id'],
            "denumire": obj.get("denumire", f"Caz #{row['id']}"),
            "situatia_de_fapt_full": obj.get('text_situatia_de_fapt') or obj.get('situatia_de_fapt') or "",
            "argumente_instanta": obj.get('argumente_instanta') or "",
            "text_individualizare": obj.get('text_individualizare') or "",
            "text_doctrina": obj.get('text_doctrina') or "",
            "text_ce_invatam": obj.get('text_ce_invatam') or "",
            "Rezumat_generat_de_AI_Cod": obj.get('Rezumat_generat_de_AI_Cod') or "",
            "solutia": obj.get("solutia", ""),
            "tip_speta": obj.get('tip_speta', "—"),
            "materie": obj.get('materie', "—"),
            "score": score if not math.isnan(score) else 0.0,
            "data": obj
        })
    return results

def _search_postgres(session: Session, req: SearchRequest, embedding: List[float]) -> List[Dict]:
    """Performs semantic search on PostgreSQL using pgvector."""
    logger.info("Executing PostgreSQL vector search")
    filter_clause, params = _build_common_where_clause(req, 'postgresql')

    params["embedding"] = str(embedding)
    params["top_k"] = settings.TOP_K

    where_sql = f"WHERE {filter_clause}" if filter_clause else ""

    query = text(f"""
        SELECT
            b.id,
            b.obj,
            (v.embedding <=> :embedding) AS semantic_distance
        FROM blocuri b
        JOIN vectori v ON b.id = v.speta_id
        {where_sql}
        ORDER BY semantic_distance ASC
        LIMIT :top_k;
    """)

    result = session.execute(query, params)
    return _process_results(result.mappings().all())

def _search_sqlite(session: Session, req: SearchRequest) -> List[Dict]:
    """Performs a simple fallback search on SQLite using LIKE."""
    logger.info("Executing SQLite fallback search")
    filter_clause, params = _build_common_where_clause(req, 'sqlite')

    # Add text search for 'situatie'
    situatie_clause = ""
    if req.situatie and req.situatie.strip():
        # Using json_extract for text search in SQLite
        situatie_clause = """
        (json_extract(b.obj, '$.text_situatia_de_fapt') LIKE :situatie OR
         json_extract(b.obj, '$.situatia_de_fapt') LIKE :situatie OR
         json_extract(b.obj, '$.tip_speta') LIKE :situatie OR
         json_extract(b.obj, '$.parte') LIKE :situatie OR
         json_extract(b.obj, '$.materie') LIKE :situatie OR
         json_extract(b.obj, '$.obiect') LIKE :situatie)
        """
        params["situatie"] = f"%{req.situatie}%"

    # Combine all clauses
    all_clauses = [c for c in [filter_clause, situatie_clause] if c]
    where_sql = f"WHERE {' AND '.join(all_clauses)}" if all_clauses else ""

    params["top_k"] = settings.TOP_K

    # In SQLite, ILIKE is case-insensitive by default for ASCII
    # We replace it for compatibility, though the behavior is the same.
    query_str = f"""
        SELECT id, obj
        FROM blocuri b
        {where_sql}
        LIMIT :top_k;
    """.replace("ILIKE", "LIKE")

    result = session.execute(text(query_str), params)
    # No semantic distance in this case
    return _process_results(result.mappings().all(), distance_metric=None)

def search_cases(session: Session, search_request: SearchRequest) -> List[Dict]:
    """
    Main search function that dispatches to the correct implementation
    based on the database dialect.
    """
    embedding = embed_text(search_request.situatie)
    dialect = session.bind.dialect.name

    if dialect == 'postgresql':
        return _search_postgres(session, search_request, embedding)
    else:
        return _search_sqlite(session, search_request)

def get_case_by_id(session: Session, case_id: int) -> Dict[str, Any] | None:
    """
    Retrieves a single case by its ID from the database.
    """
    logger.info(f"Fetching case with ID: {case_id}")
    query = text("SELECT id, obj FROM blocuri WHERE id = :case_id")
    result = session.execute(query, {"case_id": case_id}).mappings().first()

    if not result:
        logger.warning(f"Case with ID {case_id} not found.")
        return None

    # Process the single result to match the structure of search results
    processed_result = _process_results([result], distance_metric=None)
    logger.info(f"Successfully fetched and processed case ID {case_id}.")
    return processed_result[0] if processed_result else None
