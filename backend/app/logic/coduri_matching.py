"""
Logic for matching legal code articles to cases based on multiple criteria:
- Exact materie match
- Exact obiect match
- Keywords overlap
- Embedding cosine similarity
- Trigram text similarity
"""
import logging
import re
from sqlmodel import Session, text
from typing import List, Dict, Any, Optional

from ..config import get_settings
from .search_logic import embed_text, normalize_query
from ..settings_manager import settings_manager

settings = get_settings()
logger = logging.getLogger(__name__)


# Cache for available code tables
_code_tables_cache: Optional[List[str]] = None


def get_available_code_tables(session: Session) -> List[str]:
    """
    Discover all legal code tables in the database by querying information_schema.
    Results are cached for performance.

    Returns:
        List of table names matching pattern 'cod_%'
    """
    global _code_tables_cache

    if _code_tables_cache is not None:
        return _code_tables_cache

    logger.info("Discovering available code tables from database...")

    query = text("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE 'cod_%'
        ORDER BY table_name
    """)

    try:
        result = session.execute(query)
        tables = [row[0] for row in result]
        _code_tables_cache = tables
        logger.info(f"Found {len(tables)} code tables: {tables}")
        return tables
    except Exception as e:
        logger.error(f"Error discovering code tables: {e}", exc_info=True)
        return []


def determine_relevant_codes(materie: str, available_tables: List[str] = None) -> List[str]:
    """
    Maps a case's materie (legal matter) to relevant code table names.

    Args:
        materie: Legal matter field from case (e.g., "civil", "penal")
        available_tables: List of available tables in DB to check against

    Returns:
        List of table names to query (e.g., ["cod_civil"])
    """
    if not materie:
        # If no materie specified, return common codes
        return ["cod_civil", "cod_penal"]

    materie_lower = materie.lower().strip()

    # 1. Try to find specific law table (e.g. "Legea nr. 302/2004..." -> "legea_302_2004")
    if available_tables:
        # Match "Legea 302/2004" or "Legea nr. 302/2004"
        match = re.search(r'legea\s+(?:nr\.?\s*)?(\d+)/(\d{4})', materie_lower)
        if match:
            number, year = match.groups()
            candidate_table = f"legea_{number}_{year}"
            if candidate_table in available_tables:
                logger.info(f"Materie '{materie}' mapped to specific table: {candidate_table}")
                return [candidate_table]

        # Match "OUG 195/2002" etc.
        match_oug = re.search(r'(?:oug|ordonanta de urgenta)\s+(?:nr\.?\s*)?(\d+)/(\d{4})', materie_lower)
        if match_oug:
            number, year = match_oug.groups()
            candidate_table = f"oug_{number}_{year}" # Assuming naming convention, or check variations
            # Actually, let's just check if we can find it.
            # If not found, fall back.
            pass

    # Mapping of materie keywords to code tables
    materie_mapping = {
        "civil": ["cod_civil"],
        "penal": ["cod_penal", "cod_procedura_penala"],
        "comercial": ["cod_civil"],  # Commercial law is part of civil code
        "procedura civila": ["cod_procedura_civila", "cod_civil"],
        "procedura penala": ["cod_procedura_penala", "cod_penal"],
        "fiscal": ["cod_fiscal"],
        "muncii": ["codul_muncii"],
        "munca": ["codul_muncii"],
        "familie": ["cod_civil"],  # Family law is in civil code
        "administrativ": ["cod_administrativ"],
        "silvic": ["cod_silvic"],
    }

    # Try exact match first
    for keyword, tables in materie_mapping.items():
        if keyword in materie_lower:
            logger.info(f"Materie '{materie}' mapped to tables: {tables}")
            return tables

    # Default fallback: most common codes
    logger.info(f"No specific mapping for materie '{materie}', using default codes")
    return ["cod_civil", "cod_penal"]


def get_relevant_articles(
    session: Session,
    case_data: Dict[str, Any],
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Finds relevant legal code articles for a case using multi-criteria scoring.

    Args:
        session: Database session for coduri database
        case_data: Dictionary containing case metadata (materie, obiect, keywords, situatia_de_fapt, etc.)
        limit: Maximum number of articles to return

    Returns:
        List of legal articles with relevance scores, sorted by score (highest first)

    Scoring weights:
        - Exact materie match: 3.0
        - Exact obiect match: 4.0
        - Keywords regex match: 2.5
        - Embedding similarity: 1.5
        - Trigram similarity on text: 0.5
    """
    logger.info(f"Finding relevant legal articles for case with materie='{case_data.get('materie')}', obiect='{case_data.get('obiect')}'")

    # Extract case metadata
    materie = (case_data.get('materie') or '').strip()
    obiect = (case_data.get('obiect') or '').strip()
    keywords = case_data.get('keywords') or []
    situatia_de_fapt = (case_data.get('situatia_de_fapt') or '').strip()
    rezumat_ai = (case_data.get('rezumat_ai') or '').strip()

    # Extract extra search parameters
    table_name_filter = case_data.get('table_name')
    article_number = case_data.get('article_number')
    text_query = case_data.get('text_query')

    # Get available code tables in the database
    available_tables = get_available_code_tables(session)
    if not available_tables:
        logger.warning("No code tables found in database")
        return []

    # Determine which tables to query
    if table_name_filter and table_name_filter in available_tables:
        # Explicit table requested
        tables_to_query = [table_name_filter]
    else:
        # Fallback to logic based on materie
        relevant_table_names = determine_relevant_codes(materie, available_tables)
        tables_to_query = [t for t in relevant_table_names if t in available_tables]

        if not tables_to_query:
             # Fall back to querying all available tables if none match (or top 3)
            tables_to_query = available_tables[:3]

    logger.info(f"Querying tables: {tables_to_query}")

    # Generate embedding for the case (only if necessary)
    # If we are doing a simple keyword search, embedding might be overkill or irrelevant if text is short
    # But let's keep it for hybrid search
    text_for_embedding = ' '.join(filter(None, [
        situatia_de_fapt[:500] if situatia_de_fapt else '',
        rezumat_ai[:300] if rezumat_ai else '',
        obiect,
        materie,
        text_query if text_query else '' # Include search query in embedding
    ])).strip()

    if not text_for_embedding:
        logger.warning("No text available for embedding generation, using zero vector")
        embedding = [0.0] * settings.VECTOR_DIM
    else:
        embedding = embed_text(text_for_embedding)

    # Prepare query parameters
    params = {
        "embedding": str(embedding),
        "materie": materie.lower() if materie else '',
        "obiect": obiect.lower() if obiect else '',
        "article_number": article_number.strip() if article_number else '',
        "text_query": text_query.strip() if text_query else ''
    }

    # Normalize query text for trigram similarity
    q_norm = normalize_query(f"{materie} {obiect} {text_query or ''}")
    params["q"] = q_norm

    # Build keywords regex pattern
    keywords_list = []
    if isinstance(keywords, list):
        keywords_list = keywords
    elif isinstance(keywords, str):
        keywords_list = [kw.strip() for kw in keywords.split(',') if kw.strip()]

    # Add text_query to keywords list for regex matching if it's short
    if text_query and len(text_query.split()) < 5:
        keywords_list.append(text_query)

    if keywords_list:
        escaped_keywords = [re.escape(normalize_query(kw)) for kw in keywords_list[:10]]
        keywords_regex = '|'.join(escaped_keywords)
        params["keywords_regex"] = f"\\y({keywords_regex})\\y"
    else:
        params["keywords_regex"] = '^$'  # Never matches

    # Scoring weights - optimized for legal relevance
    W_EXACT_ARTICLE = settings_manager.get_value("ponderi_cautare_coduri", "w_exact_article", 20.0) # Boosted for direct search
    W_EXACT_MATERIE = settings_manager.get_value("ponderi_cautare_coduri", "w_exact_materie", 3.0)
    W_EXACT_OBIECT = settings_manager.get_value("ponderi_cautare_coduri", "w_exact_obiect", 4.0)
    W_KEYWORDS = settings_manager.get_value("ponderi_cautare_coduri", "w_keywords", 5.0) # Boosted for text search
    W_EMBEDDING = settings_manager.get_value("ponderi_cautare_coduri", "w_embedding", 2.0)
    W_TRIGRAM = settings_manager.get_value("ponderi_cautare_coduri", "w_trigram", 1.0)

    MIN_EMBEDDING_SCORE = settings_manager.get_value("ponderi_cautare_coduri", "min_embedding_score", 0.20)
    params["min_embedding_score"] = MIN_EMBEDDING_SCORE

    # Collect results from all relevant tables
    all_results = []

    for table_name in tables_to_query:
        logger.info(f"Querying table: {table_name}")

        # Build the query for this specific table with proper array handling
        # Note: We filter strictly by article number if provided

        where_clauses = []
        if article_number:
            where_clauses.append("(LOWER(COALESCE(t.numar, '')) = LOWER(:article_number) OR LOWER(COALESCE(t.numar, '')) LIKE '%' || LOWER(:article_number) || '%')")

        # If explicit search is performed, relax other filters or enforce them?
        # If text_query is provided, we use it for scoring.

        # Base where clause for relevance if no strict filter
        if not article_number:
            where_clauses.append(f"""
                (
                    (:text_query != '' AND (COALESCE(t.text, '') ~* :keywords_regex OR array_to_string(t.keywords, ' ', '') ~* :keywords_regex)) OR
                    (LOWER(COALESCE(t.materie, '')) LIKE '%' || :materie || '%' AND :materie != '') OR
                    (LOWER(COALESCE(t.obiect, '')) LIKE '%' || :obiect || '%' AND :obiect != '') OR
                    (COALESCE(t.text, '') ~* :keywords_regex) OR
                    (array_to_string(t.keywords, ' ', '') ~* :keywords_regex) OR
                    (t.text_embeddings IS NOT NULL AND
                     (1.0 - (t.text_embeddings <=> :embedding)) > :min_embedding_score)
                )
            """)

        where_sql = " AND ".join(where_clauses) if where_clauses else "TRUE"

        query_sql = text(f"""
            SELECT
                t.id,
                t.numar,
                t.titlu,
                t.obiect,
                t.materie,
                t.text,
                t.keywords,
                t.art_conex,
                t.doctrina,
                (
                    -- Exact article number match (highest priority)
                    (CASE
                        WHEN :article_number != '' AND LOWER(COALESCE(t.numar, '')) = LOWER(:article_number)
                        THEN {W_EXACT_ARTICLE} * 2
                        WHEN :article_number != '' AND LOWER(COALESCE(t.numar, '')) LIKE '%' || LOWER(:article_number) || '%'
                        THEN {W_EXACT_ARTICLE}
                        ELSE 0
                    END) +

                    -- Exact materie match
                    (CASE
                        WHEN LOWER(COALESCE(t.materie, '')) LIKE '%' || :materie || '%'
                        AND :materie != ''
                        THEN {W_EXACT_MATERIE}
                        ELSE 0
                    END) +

                    -- Exact obiect match
                    (CASE
                        WHEN LOWER(COALESCE(t.obiect, '')) LIKE '%' || :obiect || '%'
                        AND :obiect != ''
                        THEN {W_EXACT_OBIECT}
                        ELSE 0
                    END) +

                    -- Keywords/Text Query regex match in text field
                    (CASE
                        WHEN COALESCE(t.text, '') ~* :keywords_regex
                        THEN {W_KEYWORDS}
                        ELSE 0
                    END) +

                    -- Keywords match in array field (convert array to text first)
                    (CASE
                        WHEN array_to_string(t.keywords, ' ', '') ~* :keywords_regex
                        THEN {W_KEYWORDS}
                        ELSE 0
                    END) +

                    -- Embedding cosine similarity
                    (CASE
                        WHEN t.text_embeddings IS NOT NULL
                        THEN (1.0 - (t.text_embeddings <=> :embedding)) * {W_EMBEDDING}
                        ELSE 0
                    END) +

                    -- Trigram similarity on combined text (handle array properly)
                    (similarity(
                        COALESCE(t.text, '') || ' ' ||
                        COALESCE(t.titlu, '') || ' ' ||
                        COALESCE(t.obiect, '') || ' ' ||
                        array_to_string(COALESCE(t.keywords, ARRAY[]::text[]), ' ', ''),
                        :q
                    ) * {W_TRIGRAM})
                ) AS relevance_score
            FROM {table_name} t
            WHERE {where_sql}
            ORDER BY relevance_score DESC
            LIMIT :limit_per_table;
        """)

        try:
            # Query each table with a per-table limit
            params_with_limit = {**params, "limit_per_table": limit}
            result = session.execute(query_sql, params_with_limit)
            rows = result.mappings().all()

            # Add results with table name annotation
            for row in rows:
                # Convert PostgreSQL arrays to strings for Pydantic validation
                keywords_str = None
                if row['keywords']:
                    if isinstance(row['keywords'], list):
                        keywords_str = ', '.join(row['keywords'])
                    else:
                        keywords_str = str(row['keywords'])

                art_conex_str = None
                if row['art_conex']:
                    if isinstance(row['art_conex'], list):
                        art_conex_str = '; '.join(row['art_conex'])
                    else:
                        art_conex_str = str(row['art_conex'])

                all_results.append({
                    "id": row['id'],
                    "numar": row['numar'],
                    "titlu": row['titlu'],
                    "obiect": row['obiect'],
                    "materie": row['materie'],
                    "text": row['text'],
                    "keywords": keywords_str,
                    "art_conex": art_conex_str,
                    "doctrina": row['doctrina'],
                    "relevance_score": float(row['relevance_score']) if row['relevance_score'] else 0.0,
                    "cod_sursa": table_name
                })

            logger.info(f"Found {len(rows)} articles in {table_name}")

        except Exception as e:
            logger.error(f"Error querying table {table_name}: {e}", exc_info=True)
            # Rollback the transaction to prevent "current transaction is aborted" errors
            session.rollback()
            continue

    # Sort all results by relevance score and return top N
    all_results.sort(key=lambda x: x['relevance_score'], reverse=True)
    final_results = all_results[:limit]

    logger.info(f"Returning {len(final_results)} total relevant articles from {len(tables_to_query)} tables")
    return final_results


def get_article_by_id(session: Session, article_id: str, table_name: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single legal article by its ID from a specific table.

    Args:
        session: Database session for coduri database
        article_id: The SHA1 hash ID of the article
        table_name: The name of the code table (e.g., "cod_civil")

    Returns:
        Dictionary containing the full article data, or None if not found
    """
    logger.info(f"Fetching article with ID: {article_id} from table: {table_name}")

    # Validate table name to prevent SQL injection
    available_tables = get_available_code_tables(session)
    if table_name not in available_tables:
        logger.warning(f"Table {table_name} not found in available tables")
        return None


    # Determine if we are looking up by ID (hash) or by Article Number
    if article_id.lower().startswith("art_"):
        # Extract number: "art_953" -> "953"
        target_numar = article_id[4:]
        # Database format appears to be "Art. 953"
        fmt_numar = f"Art. {target_numar}"

        logger.info(f"Looking up article by number: {target_numar} (DB format: {fmt_numar})")

        query = text(f"""
            SELECT
                id,
                numar,
                titlu,
                obiect,
                materie,
                text,
                keywords,
                art_conex,
                doctrina
            FROM {table_name}
            WHERE numar = :target_numar OR numar = :fmt_numar
            LIMIT 1
        """)
        params = {"target_numar": target_numar, "fmt_numar": fmt_numar}
    else:
        # Standard lookup by ID
        query = text(f"""
            SELECT
                id,
                numar,
                titlu,
                obiect,
                materie,
                text,
                keywords,
                art_conex,
                doctrina
            FROM {table_name}
            WHERE id = :article_id
        """)
        params = {"article_id": article_id}


    try:
        result = session.execute(query, params).mappings().first()

        if not result:
            logger.warning(f"Article with ID {article_id} not found in {table_name}")
            return None

        # Convert PostgreSQL arrays to strings for Pydantic validation
        keywords_str = None
        if result['keywords']:
            if isinstance(result['keywords'], list):
                keywords_str = ', '.join(result['keywords'])
            else:
                keywords_str = str(result['keywords'])

        art_conex_str = None
        if result['art_conex']:
            if isinstance(result['art_conex'], list):
                art_conex_str = '; '.join(result['art_conex'])
            else:
                art_conex_str = str(result['art_conex'])

        return {
            "id": result['id'],
            "numar": result['numar'],
            "titlu": result['titlu'],
            "obiect": result['obiect'],
            "materie": result['materie'],
            "text": result['text'],
            "keywords": keywords_str,
            "art_conex": art_conex_str,
            "doctrina": result['doctrina'],
            "cod_sursa": table_name
        }

    except Exception as e:
        logger.error(f"Error fetching article {article_id} from {table_name}: {e}", exc_info=True)
        return None
