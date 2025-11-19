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


def determine_relevant_codes(materie: str) -> List[str]:
    """
    Maps a case's materie (legal matter) to relevant code table names.

    Args:
        materie: Legal matter field from case (e.g., "civil", "penal")

    Returns:
        List of table names to query (e.g., ["cod_civil"])
    """
    if not materie:
        # If no materie specified, return common codes
        return ["cod_civil", "cod_penal"]

    materie_lower = materie.lower().strip()

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
    materie = case_data.get('materie', '').strip()
    obiect = case_data.get('obiect', '').strip()
    keywords = case_data.get('keywords', [])
    situatia_de_fapt = case_data.get('situatia_de_fapt', '').strip()
    rezumat_ai = case_data.get('rezumat_ai', '').strip()

    # Get available code tables in the database
    available_tables = get_available_code_tables(session)
    if not available_tables:
        logger.warning("No code tables found in database")
        return []

    # Determine which tables to query based on materie
    relevant_table_names = determine_relevant_codes(materie)

    # Filter to only query tables that actually exist
    tables_to_query = [t for t in relevant_table_names if t in available_tables]

    if not tables_to_query:
        logger.warning(f"None of the relevant tables {relevant_table_names} exist in database")
        # Fall back to querying all available tables
        tables_to_query = available_tables[:3]  # Limit to first 3 tables for performance

    logger.info(f"Querying tables: {tables_to_query}")

    # Generate embedding for the case
    text_for_embedding = ' '.join(filter(None, [
        situatia_de_fapt[:500] if situatia_de_fapt else '',
        rezumat_ai[:300] if rezumat_ai else '',
        obiect,
        materie
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
    }

    # Normalize query text for trigram similarity
    q_norm = normalize_query(f"{materie} {obiect}")
    params["q"] = q_norm

    # Build keywords regex pattern
    if isinstance(keywords, list):
        keywords_list = keywords
    elif isinstance(keywords, str):
        keywords_list = [kw.strip() for kw in keywords.split(',') if kw.strip()]
    else:
        keywords_list = []

    if keywords_list:
        escaped_keywords = [re.escape(normalize_query(kw)) for kw in keywords_list[:10]]
        keywords_regex = '|'.join(escaped_keywords)
        params["keywords_regex"] = f"\\y({keywords_regex})\\y"
    else:
        params["keywords_regex"] = '^$'  # Never matches

    # Scoring weights
    W_EXACT_MATERIE = 3.0
    W_EXACT_OBIECT = 4.0
    W_KEYWORDS = 2.5
    W_EMBEDDING = 1.5
    W_TRIGRAM = 0.5

    # Collect results from all relevant tables
    all_results = []

    for table_name in tables_to_query:
        logger.info(f"Querying table: {table_name}")

        # Build the query for this specific table
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

                    -- Keywords regex match in text or keywords field
                    (CASE
                        WHEN COALESCE(t.text, '') ~* :keywords_regex
                        OR COALESCE(t.keywords, '') ~* :keywords_regex
                        THEN {W_KEYWORDS}
                        ELSE 0
                    END) +

                    -- Embedding cosine similarity
                    (CASE
                        WHEN t.text_embeddings IS NOT NULL
                        THEN (1.0 - (t.text_embeddings <=> :embedding)) * {W_EMBEDDING}
                        ELSE 0
                    END) +

                    -- Trigram similarity on text
                    (similarity(
                        COALESCE(t.text, '') || ' ' || COALESCE(t.keywords, ''),
                        :q
                    ) * {W_TRIGRAM})
                ) AS relevance_score
            FROM {table_name} t
            WHERE
                -- Only return results with some relevance
                (
                    (LOWER(COALESCE(t.materie, '')) LIKE '%' || :materie || '%' AND :materie != '') OR
                    (LOWER(COALESCE(t.obiect, '')) LIKE '%' || :obiect || '%' AND :obiect != '') OR
                    (COALESCE(t.text, '') ~* :keywords_regex OR COALESCE(t.keywords, '') ~* :keywords_regex) OR
                    (t.text_embeddings IS NOT NULL AND
                     (1.0 - (t.text_embeddings <=> :embedding)) > 0.3)
                )
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
                all_results.append({
                    "id": row['id'],
                    "numar": row['numar'],
                    "titlu": row['titlu'],
                    "obiect": row['obiect'],
                    "materie": row['materie'],
                    "text": row['text'],
                    "keywords": row['keywords'],
                    "art_conex": row['art_conex'],
                    "doctrina": row['doctrina'],
                    "relevance_score": float(row['relevance_score']) if row['relevance_score'] else 0.0,
                    "cod_sursa": table_name
                })

            logger.info(f"Found {len(rows)} articles in {table_name}")

        except Exception as e:
            logger.error(f"Error querying table {table_name}: {e}", exc_info=True)
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

    try:
        result = session.execute(query, {"article_id": article_id}).mappings().first()

        if not result:
            logger.warning(f"Article with ID {article_id} not found in {table_name}")
            return None

        return {
            "id": result['id'],
            "numar": result['numar'],
            "titlu": result['titlu'],
            "obiect": result['obiect'],
            "materie": result['materie'],
            "text": result['text'],
            "keywords": result['keywords'],
            "art_conex": result['art_conex'],
            "doctrina": result['doctrina'],
            "cod_sursa": table_name
        }

    except Exception as e:
        logger.error(f"Error fetching article {article_id} from {table_name}: {e}", exc_info=True)
        return None
