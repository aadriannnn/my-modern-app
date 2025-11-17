import logging
import requests
import unicodedata
import re
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

def _process_results(rows: List[Dict], score_metric: str = "semantic_distance") -> List[Dict]:
    """
    Processes raw DB rows into the final result format.
    Handles both distance-based scores (lower is better) and similarity-based scores (higher is better).
    """
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
        metric_value = row.get(score_metric)

        if metric_value is not None:
            try:
                float_metric = float(metric_value)
                if not math.isnan(float_metric) and math.isfinite(float_metric):
                    if "distance" in score_metric:
                        # For distance metrics, score is 1 - distance
                        score = 1.0 - float_metric
                    else:
                        # For similarity metrics, score is the value itself
                        score = float_metric
                else:
                    logger.warning(f"Invalid float value for metric '{score_metric}': {metric_value}. Defaulting score to 0.")
            except (ValueError, TypeError):
                logger.warning(f"Could not convert metric '{score_metric}' ('{metric_value}') to float. Defaulting score to 0.")

        data = {
            "id": row['id'],
            **obj,
            "denumire": obj.get("denumire", f"Caz #{row['id']}"),
            "situatia_de_fapt": obj.get('text_situatia_de_fapt') or obj.get('situatia_de_fapt') or "",
            "argumente_instanta": obj.get('argumente_instanta') or "",
            "text_individualizare": obj.get('text_individualizare') or "",
            "text_doctrina": obj.get('text_doctrina') or "",
            "text_ce_invatam": obj.get('text_ce_invatam') or "",
            "Rezumat_generat_de_AI_Cod": obj.get('Rezumat_generat_de_AI_Cod') or "",
            "solutia": obj.get("solutia", ""),
            "tip_speta": obj.get('tip_speta', "—"),
            "materie": obj.get('materie', "—"),
        }
        results.append({
            "id": row['id'],
            "denumire": data['denumire'],
            "situatia_de_fapt_full": data['situatia_de_fapt'],
            "argumente_instanta": data['argumente_instanta'],
            "text_individualizare": data['text_individualizare'],
            "text_doctrina": data['text_doctrina'],
            "text_ce_invatam": data['text_ce_invatam'],
            "Rezumat_generat_de_AI_Cod": data['Rezumat_generat_de_AI_Cod'],
            "solutia": data['solutia'],
            "tip_speta": data['tip_speta'],
            "materie": data['materie'],
            "score": score if not math.isnan(score) else 0.0,
            "data": data
        })
    return results

def _search_postgres(session: Session, req: SearchRequest, embedding: List[float]) -> List[Dict]:
    """Performs semantic search on PostgreSQL using pgvector."""
    logger.info("Executing PostgreSQL vector search")
    filter_clause, params = _build_common_where_clause(req, 'postgresql')

    params["embedding"] = str(embedding)

    # Use request's limit and offset, falling back to settings for top_k if not provided
    limit = req.limit if req.limit is not None else settings.TOP_K
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

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
        LIMIT :limit OFFSET :offset;
    """)

    result = session.execute(query, params)
    return _process_results(result.mappings().all(), score_metric="semantic_distance")

def _normalize_text(text: str) -> str:
    """
    Normalizes text by lowercasing and removing diacritics.
    Ensures consistent matching against pre-normalized database fields.
    """
    if not text:
        return ""
    # NFD normalization decomposes characters into base characters and diacritics
    # e.g., 'é' becomes 'e' + '´'
    # We then filter out the diacritics.
    nfkd_form = unicodedata.normalize('NFD', text)
    ascii_text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    return ascii_text.lower()

def _search_by_keywords_postgres(session: Session, req: SearchRequest) -> List[Dict]:
    """
    Keyword-oriented search for short queries (<=3 words), tuned for recall + relevance.
    - Scanează atât keywords (array JSON → text) cât și textul situației de fapt.
    - Folosește scor agregat (pondere mai mare pe keywords).
    - Fără filtru dur cu '%' (crește recall); poți seta un prag moale din .env.
    """
    logger.info("[search] using keyword mode (<=3 words)")
    filter_clause, params = _build_common_where_clause(req, 'postgresql')

    q_norm = normalize_query(req.situatie)
    params["q"] = q_norm

    limit = req.limit if req.limit is not None else settings.TOP_K
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

    min_sim = float(getattr(settings, "MIN_TRGM_SIMILARITY", 0.02))  # prag moale foarte mic
    params["min_sim"] = min_sim

    # Concatenează keywords (array JSON) într-un text
    keywords_text_expr = """
        COALESCE(
          array_to_string(
            ARRAY(SELECT jsonb_array_elements_text(b.obj->'keywords')),
            ' '
          ),
          ''
        )
    """

    # Text lung pentru fallback/semnal secundar
    long_text_expr = """
        COALESCE(
          NULLIF(b.obj->>'text_situatia_de_fapt',''),
          b.obj->>'situatia_de_fapt'
        )
    """

    # Boost simplu pe tokeni (max 3). Construim parametri dinamici pentru ILIKE.
    tokens = [t for t in q_norm.split() if t]
    token_params = {}
    token_clauses = []
    for i, t in enumerate(tokens[:3]):
        pname = f"tok_{i}"
        token_params[pname] = f"%{t}%"
        # Dacă vreun token apare în vreun keyword, acordăm un mic boost
        token_clauses.append(f"EXISTS (SELECT 1 FROM jsonb_array_elements_text(b.obj->'keywords') kw WHERE kw ILIKE :{pname})")

    params.update(token_params)
    token_boost_sql = f"CASE WHEN {' OR '.join(token_clauses)} THEN 0.05 ELSE 0 END" if token_clauses else "0"

    # WHERE combinat cu filtrele existente + asigurăm că avem ceva text de comparat
    where_bits = []
    if filter_clause:
        where_bits.append(filter_clause)
    where_bits.append(f"(length({keywords_text_expr}) > 0 OR length(COALESCE({long_text_expr},'')) > 0)")

    # Adăugăm și filtrul de similaritate minimă la clauzele WHERE
    where_bits.append(f"""(
        similarity({keywords_text_expr}, :q) >= :min_sim
        OR similarity(COALESCE({long_text_expr},''), :q) >= :min_sim
    )""")

    where_sql = "WHERE " + " AND ".join(where_bits)

    # Scor agregat: 70% keywords, 30% text lung + un boost mic dacă apar tokeni în keywords
    query = text(f"""
        SELECT
            b.id,
            b.obj,
            (
              0.70 * similarity({keywords_text_expr}, :q) +
              0.30 * similarity(COALESCE({long_text_expr},''), :q) +
              {token_boost_sql}
            ) AS keyword_similarity
        FROM blocuri b
        {where_sql}
        ORDER BY keyword_similarity DESC
        LIMIT :limit OFFSET :offset;
    """)

    rows = session.execute(query, params).mappings().all()
    logger.info(f"[search] trigram results count: {len(rows)}")
    return _process_results(rows, score_metric="keyword_similarity")

def _search_by_keywords_sqlite(session: Session, req: SearchRequest) -> List[Dict]:
    """Performs a simple keyword search on SQLite using LIKE."""
    logger.info("Executing SQLite keyword search")
    filter_clause, params = _build_common_where_clause(req, 'sqlite')

    # Normalize and prepare the search term for LIKE query
    normalized_situatie = _normalize_text(req.situatie)
    params["situatie"] = f"%{normalized_situatie}%"

    # Simple LIKE search on keywords
    keyword_clause = "json_extract(b.obj, '$.keywords') LIKE :situatie"

    all_clauses = [c for c in [filter_clause, keyword_clause] if c]
    where_sql = f"WHERE {' AND '.join(all_clauses)}" if all_clauses else ""

    limit = req.limit if req.limit is not None else settings.TOP_K
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

    query_str = f"""
        SELECT id, obj
        FROM blocuri b
        {where_sql}
        LIMIT :limit OFFSET :offset;
    """.replace("ILIKE", "LIKE")

    result = session.execute(text(query_str), params)
    return _process_results(result.mappings().all(), score_metric=None)

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

    limit = req.limit if req.limit is not None else settings.TOP_K
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

    # In SQLite, ILIKE is case-insensitive by default for ASCII
    # We replace it for compatibility, though the behavior is the same.
    query_str = f"""
        SELECT id, obj
        FROM blocuri b
        {where_sql}
        LIMIT :limit OFFSET :offset;
    """.replace("ILIKE", "LIKE")

    result = session.execute(text(query_str), params)
    # No semantic distance in this case
    return _process_results(result.mappings().all(), score_metric=None)

def normalize_query(text: str) -> str:
    """
    Normalizes a search query by lowercasing, removing punctuation, and trimming spaces.
    """
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r'[^\w\s]', '', text)
    text = text.strip()
    return text

def search_cases(session: Session, search_request: SearchRequest) -> List[Dict]:
    """
    Main search function that orchestrates the search logic.
    - Routes to keyword search for short queries (<= 3 words).
    - Routes to semantic/vector search for longer queries.
    - Handles embedding failures by falling back to keyword search.
    - Handles searches with only "obiect" selected.
    """
    dialect = session.bind.dialect.name
    word_count = len(search_request.situatie.split())
    use_keyword_search = True

    if not search_request.situatie.strip() and search_request.obiect:
        logger.info("[search] using 'obiect' only mode")
        filter_clause, params = _build_common_where_clause(search_request, dialect)

        limit = search_request.limit if search_request.limit is not None else settings.TOP_K
        offset = search_request.offset if search_request.offset is not None else 0
        params["limit"] = limit
        params["offset"] = offset

        where_sql = f"WHERE {filter_clause}" if filter_clause else ""
        query_str = f"""
            SELECT id, obj
            FROM blocuri b
            {where_sql}
            LIMIT :limit OFFSET :offset;
        """.replace("ILIKE", "LIKE")
        result = session.execute(text(query_str), params)
        return _process_results(result.mappings().all(), score_metric=None)

    if word_count > 3:
        logger.info("[search] using embedding mode (>3 words)")
        embedding = embed_text(search_request.situatie)

        # Check if embedding failed (indicated by a zero vector)
        if any(v != 0.0 for v in embedding):
            use_keyword_search = False
            if dialect == 'postgresql':
                return _search_postgres(session, search_request, embedding)
            else:
                # Fallback for SQLite when embedding is successful but platform is not PG
                return _search_sqlite(session, search_request)
        else:
            logger.warning("[search] embedding failed, falling back to keyword search.")
            # Fallback to keyword search is implicitly handled below

    # This block is executed if word_count <= 3 OR if embedding failed
    if use_keyword_search:
        if dialect == 'postgresql':
            return _search_by_keywords_postgres(session, search_request)
        else:
            return _search_by_keywords_sqlite(session, search_request)

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
    processed_result = _process_results([result], score_metric=None)
    logger.info(f"Successfully fetched and processed case ID {case_id}.")
    return processed_result[0] if processed_result else None
