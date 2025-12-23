import logging
import requests
import unicodedata
import re
from sqlmodel import Session, text, select
from typing import List, Dict, Any, Tuple

from ..config import get_settings
from ..schemas import SearchRequest
from ..cache import get_cached_filters
from ..settings_manager import settings_manager

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
            timeout=30  # Reduced - model is pre-loaded in VRAM
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

def _build_common_where_clause(req: SearchRequest, dialect: str) -> Tuple[str, Dict[str, Any]]:
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
            "situatia_de_fapt": obj.get('text_situatia_de_fapt') or obj.get('situatia_de_fapt') or obj.get('situatie') or "",
            "argumente_instanta": obj.get('argumente_instanta') or "",
            "considerente_speta": obj.get('considerente_speta') or "",
            "text_individualizare": obj.get('text_individualizare') or "",
            "text_doctrina": obj.get('text_doctrina') or "",
            "text_ce_invatam": obj.get('text_ce_invatam') or "",
            "Rezumat_generat_de_AI_Cod": obj.get('Rezumat_generat_de_AI_Cod') or "",
            "solutia": obj.get("solutia", ""),
            "tip_speta": obj.get('tip_speta', "—"),
            "materie": obj.get('materie', "—"),
        }
        data['situatia_de_fapt_full'] = data.get('situatia_de_fapt', '')
        results.append({
            "id": row['id'],
            "denumire": data['denumire'],
            "situatia_de_fapt_full": data['situatia_de_fapt'],
            "argumente_instanta": data['argumente_instanta'],
            "considerente_speta": data['considerente_speta'],
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
    """
    Performs semantic search on PostgreSQL using pgvector combined with metadata text similarity.

    Logic:
    - Vector Search: Uses cosine distance (via <=>) on the 'situatia de fapt' embedding.
    - Metadata Search: Uses trigram similarity on a concatenated string of metadata fields:
      (obiect, materie, parte, Rezumat_generat_de_AI_Cod, text_ce_invatam, tip_speta).
    - Hybrid Scoring:
      Final Score = (Vector Distance * 1.0) - (Metadata Similarity * 0.5)

      Lower score is better (since it's based on distance).
      - Vector distance is [0, 2] (0 = identical).
      - Similarity is [0, 1] (1 = identical).
      - Subtracting similarity reduces the "distance", effectively boosting the rank.
    """
    logger.info("Executing PostgreSQL hybrid vector search")
    filter_clause, params = _build_common_where_clause(req, 'postgresql')

    params["embedding"] = str(embedding)

    # Normalize query for text similarity
    q_norm = normalize_query(req.situatie)
    params["q"] = q_norm

    # Use request's limit and offset, falling back to settings for top_k if not provided
    limit = req.limit if req.limit is not None else settings.TOP_K
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

    where_sql = f"WHERE {filter_clause}" if filter_clause else ""

    # Define the metadata text expression for similarity comparison
    # We use COALESCE to handle nulls and concatenate with spaces
    metadata_text_expr = """
        COALESCE(b.obj->>'obiect', '') || ' ' ||
        COALESCE(b.obj->>'materie', '') || ' ' ||
        COALESCE(b.obj->>'parte', '') || ' ' ||
        COALESCE(b.obj->>'Rezumat_generat_de_AI_Cod', '') || ' ' ||
        COALESCE(b.obj->>'text_ce_invatam', '') || ' ' ||
        COALESCE(b.obj->>'tip_speta', '')
    """

    # Weights for the hybrid score
    W_VECTOR = settings_manager.get_value("ponderi_cautare_spete", "w_vector", 1.0)
    W_METADATA = settings_manager.get_value("ponderi_cautare_spete", "w_metadata", 0.5)

    query = text(f"""
        SELECT
            b.id,
            b.obj,
            (v.embedding <=> :embedding) AS vector_distance,
            similarity({metadata_text_expr}, :q) AS metadata_similarity,
            (
                (v.embedding <=> :embedding) * {W_VECTOR} -
                (similarity({metadata_text_expr}, :q) * {W_METADATA})
            ) AS hybrid_distance
        FROM blocuri b
        JOIN vectori v ON b.id = v.speta_id
        {where_sql}
        ORDER BY hybrid_distance ASC
        LIMIT :limit OFFSET :offset;
    """)

    result = session.execute(query, params)

    # We pass hybrid_distance as the metric.
    # _process_results will see "distance" in the name and do: score = 1.0 - metric
    # Best case (dist=0, sim=1) => metric = -0.5 => score = 1.5
    # Worst case (dist=2, sim=0) => metric = 2.0 => score = -1.0
    # This results in a "higher is better" score which is intuitive.

    rows = result.mappings().all()

    return _process_results(rows, score_metric="hybrid_distance")

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
    Keyword-oriented search for short queries (<=3 words), optimized for legal context.

    Improvements:
    - Exact Word Boundary Match: Uses regex `\\y` to distinguish e.g. "viol" from "violare".
    - Context Awareness: Detects if query words match 'materie' or 'obiect' fields.
    - Weighted Scoring:
        - High boost for exact word match in 'obiect' (user intent is often the object).
        - Boost for matching 'materie'.
        - Boost for exact word match in 'keywords'.
        - Base score from trigram similarity for fuzzy matching.
    """
    logger.info("[search] using optimized keyword mode (<=3 words)")
    filter_clause, params = _build_common_where_clause(req, 'postgresql')

    q_norm = normalize_query(req.situatie)
    params["q"] = q_norm

    # Prepare regex for exact word matching (whole query as a word or sequence of words)
    # Escape special regex characters in the query just in case
    q_regex_safe = re.escape(q_norm)
    # Postgres regex for "word boundary" is \y.
    # We want to match the query as a distinct phrase.
    params["q_regex"] = f"\\y{q_regex_safe}\\y"

    limit = req.limit if req.limit is not None else settings.TOP_K
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

    # Soft threshold for similarity to filter out complete noise
    min_sim = float(settings_manager.get_value("setari_generale", "min_trgm_similarity", 0.05))
    params["min_sim"] = min_sim

    # Extract potential "materie" from query to boost if it matches the materie column
    # We'll pass the whole query to check against materie column too

    # JSON accessors
    obiect_expr = "COALESCE(b.obj->>'obiect', '')"
    materie_expr = "COALESCE(b.obj->>'materie', '')"
    keywords_expr = """
        COALESCE(
          array_to_string(
            ARRAY(SELECT jsonb_array_elements_text(b.obj->'keywords')),
            ' '
          ),
          ''
        )
    """
    # Long text for fallback similarity
    long_text_expr = """
        COALESCE(
          NULLIF(b.obj->>'text_situatia_de_fapt',''),
          NULLIF(b.obj->>'situatia_de_fapt',''),
          b.obj->>'situatie'
        )
    """

    # SCORING WEIGHTS
    # 1. Exact Object Match (Highest Priority): If user searches "viol", cases with object "viol" should be top.
    W_EXACT_OBIECT = settings_manager.get_value("ponderi_cautare_spete", "w_exact_obiect", 2.0)

    # 2. Materie Match: If user searches "penal", cases with materie "penal" get a boost.
    W_MATERIE = settings_manager.get_value("ponderi_cautare_spete", "w_materie", 1.5)

    # 3. Exact Keyword Match: If query appears exactly in keywords.
    W_EXACT_KEYWORD = settings_manager.get_value("ponderi_cautare_spete", "w_exact_keyword", 1.2)

    # 4. Similarity Scores (0-1 range)
    W_SIM_OBIECT = settings_manager.get_value("ponderi_cautare_spete", "w_sim_obiect", 1.0)
    W_SIM_KEYWORDS = settings_manager.get_value("ponderi_cautare_spete", "w_sim_keywords", 0.8)
    W_SIM_TEXT = settings_manager.get_value("ponderi_cautare_spete", "w_sim_text", 0.4)

    # Construct the query
    # We use a CASE statement for regex matches to return 1.0 (true) or 0.0 (false)

    # Construct the WHERE clause properly
    where_conditions = []
    if filter_clause:
        where_conditions.append(filter_clause)

    # Add the relevance condition to ensure we don't return zero-score results
    where_conditions.append(f"""(
        {obiect_expr} ~* :q_regex OR
        {materie_expr} ~* :q_regex OR
        {keywords_expr} ~* :q_regex OR
        similarity({obiect_expr}, :q) > :min_sim OR
        similarity({keywords_expr}, :q) > :min_sim OR
        similarity(COALESCE({long_text_expr},''), :q) > :min_sim
    )""")

    where_sql = "WHERE " + " AND ".join(where_conditions)

    query = text(f"""
        SELECT
            b.id,
            b.obj,
            (
                -- Exact match boosts (Binary: 1 or 0 * Weight)
                (CASE WHEN {obiect_expr} ~* :q_regex THEN {W_EXACT_OBIECT} ELSE 0 END) +
                (CASE WHEN {materie_expr} ~* :q_regex THEN {W_MATERIE} ELSE 0 END) +
                (CASE WHEN {keywords_expr} ~* :q_regex THEN {W_EXACT_KEYWORD} ELSE 0 END) +

                -- Similarity scores (Continuous: 0.0 to 1.0 * Weight)
                (similarity({obiect_expr}, :q) * {W_SIM_OBIECT}) +
                (similarity({keywords_expr}, :q) * {W_SIM_KEYWORDS}) +
                (similarity(COALESCE({long_text_expr},''), :q) * {W_SIM_TEXT})
            ) AS relevance_score
        FROM blocuri b
        {where_sql}
        ORDER BY relevance_score DESC
        LIMIT :limit OFFSET :offset;
    """)

    rows = session.execute(query, params).mappings().all()
    logger.info(f"[search] optimized keyword results count: {len(rows)}")

    # We use 'relevance_score' directly (higher is better)
    return _process_results(rows, score_metric="relevance_score")

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
    Main search function implementing three-level cascading search strategy.

    Level 1: Semantic embeddings search (fastest, always executed)
    Level 2: Standard keyword search (moderate cost, only if Level 1 < 5 results)
    Level 3: Considerente deep search (slowest, only if Level 2 < 5 results)

    Each level adds to the previous results, with early exit when >= 5 results found.
    """
    dialect = session.bind.dialect.name

    # Handle "obiect only" mode
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

    # Calculate range to fetch
    orig_limit = search_request.limit if search_request.limit is not None else settings.TOP_K
    orig_offset = search_request.offset if search_request.offset is not None else 0

    # Store original values
    saved_limit = search_request.limit
    saved_offset = search_request.offset

    try:
        # For progressive search, we need to fetch enough to know if we have < 5 results
        # We'll fetch (offset + limit) to handle pagination correctly
        fetch_limit = orig_limit + orig_offset
        search_request.limit = fetch_limit
        search_request.offset = 0

        # =================================================================
        # LEVEL 1: EMBEDDINGS SEMANTIC SEARCH (Always executed first)
        # =================================================================
        logger.info("[Level 1] Executing semantic embeddings search...")

        embedding = embed_text(search_request.situatie)

        # Check if embedding succeeded (indicated by a non-zero vector)
        if any(v != 0.0 for v in embedding):
            logger.info("[Level 1] Embedding successful, executing semantic search...")

            # Execute semantic search
            if dialect == 'postgresql':
                level1_results = _search_postgres(session, search_request, embedding)
            else:
                level1_results = _search_sqlite(session, search_request)

            logger.info(f"[Level 1] Embeddings search returned {len(level1_results)} results")

            # Check if we have enough results
            if len(level1_results) >= 5:
                logger.info(f"[Level 1] Sufficient results ({len(level1_results)} >= 5), returning without escalation")

                # Slice to requested page
                start = orig_offset
                end = orig_offset + orig_limit
                final_results = level1_results[start:end]

                logger.info(f"[Level 1] Returning {len(final_results)} results")
                return final_results

            # Track results for next levels
            all_results = level1_results.copy()
            seen_ids = {r['id'] for r in level1_results}
        else:
            # Embedding failed, start with empty results
            logger.warning("[Level 1] Embedding generation failed, starting with 0 results")
            all_results = []
            seen_ids = set()

        # =================================================================
        # LEVEL 2: STANDARD KEYWORD SEARCH (Only if < 5 results)
        # =================================================================
        logger.info(f"[Level 2] Insufficient results ({len(all_results)} < 5), trying standard keyword search...")

        if dialect == 'postgresql':
            level2_results = _search_by_keywords_postgres(session, search_request)
        else:
            level2_results = _search_by_keywords_sqlite(session, search_request)

        # Merge Level 2 results (deduplicate)
        level2_added = 0
        for r in level2_results:
            if r['id'] not in seen_ids:
                all_results.append(r)
                seen_ids.add(r['id'])
                level2_added += 1

        logger.info(f"[Level 2] Standard keyword search added {level2_added} new results -> {len(all_results)} total")

        # Check if we now have enough results
        if len(all_results) >= 5:
            logger.info(f"[Level 2] Sufficient results ({len(all_results)} >= 5), returning without further escalation")

            # Slice to requested page
            start = orig_offset
            end = orig_offset + orig_limit
            final_results = all_results[start:end]

            logger.info(f"[Level 2] Returning {len(final_results)} results")
            return final_results

        # =================================================================
        # LEVEL 3: CONSIDERENTE DEEP SEARCH (Last resort if < 5 results)
        # =================================================================
        logger.info(f"[Level 3] Still insufficient results ({len(all_results)} < 5), searching in considerente...")

        # Search in considerente
        level3_results = _search_pro_keyword(session, search_request)

        # Merge Level 3 results (deduplicate)
        level3_added = 0
        for r in level3_results:
            if r['id'] not in seen_ids:
                all_results.append(r)
                seen_ids.add(r['id'])
                level3_added += 1

        logger.info(f"[Level 3] Considerente search added {level3_added} new results -> {len(all_results)} total")

        # Slice to requested page
        start = orig_offset
        end = orig_offset + orig_limit
        final_results = all_results[start:end]

        logger.info(f"[Level 3] Final results: returning {len(final_results)} from {len(all_results)} total unique cases")
        return final_results

    finally:
        # Restore original request parameters
        search_request.limit = saved_limit
        search_request.offset = saved_offset

def _build_pro_search_components(term: str) -> Dict[str, Any]:
    """
    Internal helper to build shared components for Pro Search.
    Returns:
        Dict with:
            - terms_to_search: List[str]
            - total_occurrences: str (SQL expression)
            - match_conditions: List[str] (SQL conditions)
    """
    raw_query = term.strip()
    if not raw_query:
        return {
            "terms_to_search": [],
            "total_occurrences": "0",
            "match_conditions": ["1=0"]
        }

    # Strict Diacritics Logic
    normalized_query = _normalize_text(raw_query)
    terms_to_search = [raw_query]

    if raw_query != normalized_query:
        terms_to_search.append(normalized_query)

    terms_to_search = list(set(terms_to_search))

    # Build Expressions
    target_field = "COALESCE(b.obj->>'considerente_speta', '')"

    # Relevance Score (Occurrence Count)
    occurrence_exprs = []
    for term_str in terms_to_search:
        # SQL Injection Protection: Escape single quotes for string literals
        safe_term = term_str.replace("'", "''")
        expr = f"(LENGTH({target_field}) - LENGTH(REPLACE(LOWER({target_field}), LOWER('{safe_term}'), ''))) / LENGTH('{safe_term}')"
        occurrence_exprs.append(expr)

    total_occurrences = " + ".join(occurrence_exprs) if occurrence_exprs else "0"

    # WHERE conditions (Regex Word Boundaries)
    match_conditions = []
    for term_str in terms_to_search:
        # SQL Injection Protection:
        # 1. Escape regex special characters (e.g. '.', '*', etc.)
        regex_safe = re.escape(term_str)
        # 2. Escape single quotes for SQL string literal (after regex escape)
        # This prevents breaking the SQL string: '... ~* ''...'''
        sql_safe_regex = regex_safe.replace("'", "''")

        # In SQL: '... ~* ''\yterm\y'''
        match_conditions.append(f"{target_field} ~* '\\y{sql_safe_regex}\\y'")

    return {
        "terms_to_search": terms_to_search,
        "total_occurrences": total_occurrences,
        "match_conditions": match_conditions
    }

def build_pro_search_query_sql(term: str, limit: int = 20, offset: int = 0) -> Dict[str, str]:
    """
    Builds the SQL queries for Pro Keyword Search without executing them.
    Useful for LLM Analyzer to generate valid strategies.

    Returns:
        Dict with keys: 'count_query', 'id_list_query'
    """
    components = _build_pro_search_components(term)

    if not components["terms_to_search"]:
         return {"count_query": "", "id_list_query": ""}

    where_sql = f"WHERE ({' OR '.join(components['match_conditions'])})"

    # Construct Final Queries
    count_query = f"SELECT COUNT(*) FROM blocuri b {where_sql}"

    id_list_query = f"""
        SELECT id FROM blocuri b
        {where_sql}
        ORDER BY ({components['total_occurrences']}) DESC
        LIMIT {limit} OFFSET {offset}
    """

    return {
        "count_query": count_query,
        "id_list_query": id_list_query
    }

def build_vector_search_query_sql(term: str, limit: int = 100) -> Dict[str, str]:
    """
    Builds the SQL queries for Vector Search (Embeddings).
    Synchronously calls the embedding service and constructs the SQL.
    Useful for LLM Analyzer.

    Returns:
        Dict with keys: 'count_query', 'id_list_query'
    """
    if not term or not term.strip():
        return {"count_query": "", "id_list_query": ""}

    logger.info(f"Generating embedding for Vector Search Strategy: {term}")

    try:
        # 1. Generate embedding (synchronous call)
        embedding = embed_text(term)

        # 2. Format vector literal for pgvector
        # Format: '[0.1,0.2,...]'
        vector_literal = str(embedding)

        # 3. Construct SQL
        # We perform a hybrid sort or just pure vector distance.
        # For simplicity in Analyzer phase, we rely on vector distance.
        # We need filtering on NULLs usually, but the LLM strategy implies broad search.
        # However, to be safe, we might want to ensure we don't get junk.

        # Query for Count is tricky with vector search because standard vector search usually does KNN (limit).
        # COUNT(*) on all records ordered by distance is meaningless without a threshold.
        # Usually we just return a fixed number of most relevant results.
        # So count_query will be effectively "LIMIT" size or we can use a distance threshold if we knew it.
        # Let's return a count of the LIMIT we are imposing, or just a generic count.
        # Actually, Analyzer uses count_query to show "Total cases found".
        # For KNN, "Total cases" is technically the whole DB, but "Relevant cases" is top K.
        # Let's set count query to return the limit number as a proxy for "relevant found".

        count_query = f"SELECT {limit}"

        id_list_query = f"""
            SELECT b.id
            FROM blocuri b
            JOIN vectori v ON b.id = v.speta_id
            ORDER BY v.embedding <=> '{vector_literal}'
            LIMIT {limit}
        """

        return {
            "count_query": count_query,
            "id_list_query": id_list_query
        }

    except Exception as e:
        logger.error(f"Failed to build vector search query: {e}")
        return {"count_query": "", "id_list_query": ""}

def _search_pro_keyword(session: Session, req: SearchRequest) -> List[Dict]:
    """
    Pro Keyword Search (used as Consideration Search):
    - Searches in 'considerente'.
    - Returns matching cases ranked by occurrence density.
    """
    # logger.info("[search] using PRO keyword mode")

    components = _build_pro_search_components(req.situatie)

    if not components["terms_to_search"]:
        return []

    # Mix with common filters
    filter_clause, params = _build_common_where_clause(req, 'postgresql')
    where_conditions = []
    if filter_clause:
        where_conditions.append(filter_clause)

    # Add Pro Search conditions
    where_conditions.append(f"({' OR '.join(components['match_conditions'])})")

    where_sql = "WHERE " + " AND ".join(where_conditions)

    limit = req.limit if req.limit is not None else 20
    offset = req.offset if req.offset is not None else 0
    params["limit"] = limit
    params["offset"] = offset

    query = text(f"""
        SELECT
            b.id,
            b.obj,
            ({components['total_occurrences']}) as relevance_score
        FROM blocuri b
        {where_sql}
        ORDER BY relevance_score DESC
        LIMIT :limit OFFSET :offset;
    """)

    try:
        result = session.execute(query, params)
        rows = result.mappings().all()
        # logger.info(f"[search] Pro keyword results: {len(rows)}")
        results = _process_results(rows, score_metric="relevance_score")

        # Inject highlight terms
        for res in results:
            if 'data' in res:
                res['data']['highlight_terms'] = components["terms_to_search"]

        return results
    except Exception as e:
        logger.error(f"[search] Pro keyword search failed: {e}")
        # Return empty list so hybrid search can fall back/continue
        return []

def get_case_by_id(session: Session, case_id: int) -> Dict[str, Any] | None:
    """
    Retrieves a single case by its ID from the database.
    The ID is stored in the JSON obj field as obj->>'id'.
    """
    logger.info(f"Fetching case with ID: {case_id}")
    # Query using the JSON field obj->>'id' for PostgreSQL
    query = text("SELECT id, obj FROM blocuri WHERE (obj->>'id')::int = :case_id")
    result = session.execute(query, {"case_id": case_id}).mappings().first()

    if not result:
        logger.warning(f"Case with ID {case_id} not found.")
        return None

    # Process the single result to match the structure of search results
    processed_result = _process_results([result], score_metric=None)
    logger.info(f"Successfully fetched and processed case ID {case_id}.")
    return processed_result[0] if processed_result else None


def detect_company_query(query: str) -> tuple:
    """
    Detect if query is for company search.

    Returns:
        (is_company_query, is_cui)
    """
    query_clean = query.strip()

    # Check if numeric and > 10000 (CUI pattern)
    if query_clean.isdigit() and int(query_clean) > 10000:
        return (True, True)

    # Check for company keywords (case-insensitive)
    company_keywords = ['SC', 'S.C.', 'SA', 'S.A.', 'SRL', 'S.R.L.', 'PF', 'P.F.', 'II']
    query_upper = query_clean.upper()

    for keyword in company_keywords:
        if keyword in query_upper:
            return (True, False)

    return (False, False)


def search_companies(session: Session, query: str, is_cui: bool) -> List[Dict[str, Any]]:
    """
    Search for companies in blocuri_firme table.

    Args:
        session: Database session
        query: Search query (CUI or company name)
        is_cui: True if searching by CUI, False if searching by name

    Returns:
        List of company results formatted for frontend display
    """
    from ..models import BlocuriFirme

    results = []

    try:
        if is_cui:
            # Exact CUI match
            statement = select(BlocuriFirme).where(
                text("obj->>'CUI' = :query")
            ).params(query=query).limit(10)
            rows = session.exec(statement).all()
        else:
            # Company name search with smart matching

            # 1. Try exact case-insensitive match first
            exact_statement = select(BlocuriFirme).where(
                text("LOWER(obj->>'DENUMIRE') = LOWER(:query)")
            ).params(query=query).limit(1)

            exact_rows = session.exec(exact_statement).all()

            if exact_rows:
                # Found exact match
                rows = exact_rows
            else:
                # 2. Try partial match with ILIKE (contains)
                ilike_statement = select(BlocuriFirme).where(
                    text("obj->>'DENUMIRE' ILIKE :query_pattern")
                ).params(query_pattern=f"%{query}%").limit(5)

                ilike_rows = session.exec(ilike_statement).all()

                if len(ilike_rows) > 0:
                    # Found partial matches
                    rows = ilike_rows
                else:
                    # 3. Fuzzy trigram search as last resort
                    # Normalize query: remove spaces, lowercase for better fuzzy matching
                    normalized_query = query.lower().replace(' ', '').replace('.', '')

                    # Use trigram similarity on normalized names
                    fuzzy_statement = select(BlocuriFirme).order_by(
                        text("LOWER(REPLACE(REPLACE(obj->>'DENUMIRE', ' ', ''), '.', '')) <-> :normalized_query")
                    ).params(normalized_query=normalized_query).limit(3)

                    rows = session.exec(fuzzy_statement).all()

        for row in rows:
            company_data = row.obj

            # Build full address from ADR_* fields
            address_parts = []
            if company_data.get('ADR_DEN_STRADA'):
                address_parts.append(company_data['ADR_DEN_STRADA'])
            if company_data.get('ADR_NR_STRADA'):
                address_parts.append(f"nr. {company_data['ADR_NR_STRADA']}")
            if company_data.get('ADR_BLOC'):
                address_parts.append(f"bl. {company_data['ADR_BLOC']}")
            if company_data.get('ADR_SCARA'):
                address_parts.append(f"sc. {company_data['ADR_SCARA']}")
            if company_data.get('ADR_ETAJ'):
                address_parts.append(f"et. {company_data['ADR_ETAJ']}")
            if company_data.get('ADR_APARTAMENT'):
                address_parts.append(f"ap. {company_data['ADR_APARTAMENT']}")
            if company_data.get('ADR_LOCALITATE'):
                address_parts.append(company_data['ADR_LOCALITATE'])
            if company_data.get('ADR_JUDET'):
                address_parts.append(f"jud. {company_data['ADR_JUDET']}")

            full_address = ", ".join(address_parts) if address_parts else ""

            # Extract status description from stare field
            # stare is a LIST: [{'cod_stare': '1048', 'descriere_stare': 'funcțiune'}]
            stare_value = company_data.get('stare', '')
            stare_display = ''

            if isinstance(stare_value, list) and len(stare_value) > 0:
                # stare is a list, get first element
                first_stare = stare_value[0]
                if isinstance(first_stare, dict):
                    stare_display = first_stare.get('descriere_stare', '')
                else:
                    stare_display = str(first_stare)
            elif isinstance(stare_value, dict):
                # Fallback for dict format
                stare_display = stare_value.get('descriere_stare', '')
            elif stare_value:
                # Fallback for string
                stare_display = str(stare_value)

            # Format CAEN codes - extract just the code if it's an object
            caen_raw = company_data.get('activitati_caen', [])
            caen_codes = []
            if isinstance(caen_raw, list):
                for item in caen_raw:
                    if isinstance(item, dict):
                        # If CAEN is an object, extract the code field
                        code = item.get('cod', item.get('code', item.get('caen', '')))
                        if code:
                            caen_codes.append(str(code))
                    elif item:
                        caen_codes.append(str(item))

            results.append({
                'id': row.id,
                'type': 'company',
                'denumire': company_data.get('DENUMIRE', ''),
                'cui': str(company_data.get('CUI', '')),
                'adresa': full_address,
                'nr_reg_com': company_data.get('COD_INMATRICULARE', ''),
                'stare': stare_display,
                'caen': caen_codes,
                'data': company_data  # Full data for detailed view
            })
    except Exception as e:
        logger.error(f"Error searching companies: {e}")
        # Return empty results on error
        pass

    return results
