"""
Logic for matching legal document models to cases based on multiple criteria:
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


def get_relevant_modele(
    session: Session,
    case_data: Dict[str, Any],
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Finds relevant document models for a case using multi-criteria scoring.

    Args:
        session: Database session for modele_documente database
        case_data: Dictionary containing case metadata (materie, obiect, keywords, situatia_de_fapt, etc.)
        limit: Maximum number of models to return

    Returns:
        List of document models with relevance scores, sorted by score (highest first)

    Scoring weights:
        - Exact materie match: 2.0
        - Exact obiect match: 2.5
        - Keywords overlap (regex match): 1.5
        - Embedding similarity: 1.0
        - Trigram similarity on combined text: 0.5
    """
    logger.info(f"Finding relevant modele for case with materie='{case_data.get('materie')}', obiect='{case_data.get('obiect')}'")

    # Extract case metadata
    materie = case_data.get('materie', '').strip()
    obiect = case_data.get('obiect', '').strip()
    keywords = case_data.get('keywords', [])
    situatia_de_fapt = case_data.get('situatia_de_fapt', '').strip()
    rezumat_ai = case_data.get('rezumat_ai', '').strip()

    # Generate embedding for the case
    # Combine relevant text fields for embedding generation
    text_for_embedding = ' '.join(filter(None, [
        situatia_de_fapt[:500] if situatia_de_fapt else '',  # Limit to 500 chars
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
        "limit": limit,
        "materie": materie.lower() if materie else '',
        "obiect": obiect.lower() if obiect else '',
    }

    # Normalize query text for trigram similarity
    q_norm = normalize_query(f"{materie} {obiect}")
    params["q"] = q_norm

    # Build keywords regex pattern for matching
    # Keywords can be a list or a string
    if isinstance(keywords, list):
        keywords_list = keywords
    elif isinstance(keywords, str):
        keywords_list = [kw.strip() for kw in keywords.split(',') if kw.strip()]
    else:
        keywords_list = []

    # Create regex pattern for keywords (word boundary matching)
    if keywords_list:
        # Escape special regex characters and join with OR
        escaped_keywords = [re.escape(normalize_query(kw)) for kw in keywords_list[:10]]  # Limit to 10 keywords
        keywords_regex = '|'.join(escaped_keywords)
        params["keywords_regex"] = f"\\y({keywords_regex})\\y"
    else:
        keywords_regex = ''
        params["keywords_regex"] = '^$'  # Pattern that never matches

    # Scoring weights
    W_EXACT_MATERIE = 3.0
    W_EXACT_OBIECT = 4.0
    W_KEYWORDS = 2.0
    W_EMBEDDING = 1.0
    W_TRIGRAM = 0.5

    # Build the query
    # We need to check if materie and obiect fields exist and match
    query_sql = text(f"""
        SELECT
            m.id,
            m.titlu_model,
            m.obiect_model,
            m.materie_model,
            m.sursa_model,
            m.text_model,
            m.keywords_model,
            (
                -- Exact materie match (case-insensitive)
                (CASE
                    WHEN LOWER(COALESCE(m.materie_model, '')) LIKE '%' || :materie || '%'
                    AND :materie != ''
                    THEN {W_EXACT_MATERIE}
                    ELSE 0
                END) +

                -- Exact obiect match (case-insensitive)
                (CASE
                    WHEN LOWER(COALESCE(m.obiect_model, '')) LIKE '%' || :obiect || '%'
                    AND :obiect != ''
                    THEN {W_EXACT_OBIECT}
                    ELSE 0
                END) +

                -- Keywords regex match
                (CASE
                    WHEN COALESCE(array_to_string(m.keywords_model, ' '), '') ~* :keywords_regex
                    THEN {W_KEYWORDS}
                    ELSE 0
                END) +

                -- Embedding cosine similarity (1 - cosine_distance)
                (CASE
                    WHEN m.comentariiLLM_model_embedding IS NOT NULL
                    THEN (1.0 - (m.comentariiLLM_model_embedding <=> :embedding)) * {W_EMBEDDING}
                    ELSE 0
                END) +

                -- Trigram similarity on combined fields
                (similarity(
                    COALESCE(m.obiect_model, '') || ' ' ||
                    COALESCE(m.materie_model, '') || ' ' ||
                    COALESCE(array_to_string(m.keywords_model, ' '), ''),
                    :q
                ) * {W_TRIGRAM})
            ) AS relevance_score
        FROM modele_documente m
        WHERE
            -- Only return results with some relevance
            (
                (LOWER(COALESCE(m.materie_model, '')) LIKE '%' || :materie || '%' AND :materie != '') OR
                (LOWER(COALESCE(m.obiect_model, '')) LIKE '%' || :obiect || '%' AND :obiect != '') OR
                (COALESCE(array_to_string(m.keywords_model, ' '), '') ~* :keywords_regex) OR
                (m.comentariiLLM_model_embedding IS NOT NULL AND
                 (1.0 - (m.comentariiLLM_model_embedding <=> :embedding)) > 0.5)
            )
        ORDER BY relevance_score DESC
        LIMIT :limit;
    """)

    try:
        result = session.execute(query_sql, params)
        rows = result.mappings().all()

        logger.info(f"Found {len(rows)} relevant modele")

        # Process results
        modele_list = []
        for row in rows:
            modele_list.append({
                "id": row['id'],
                "titlu_model": row['titlu_model'],
                "obiect_model": row['obiect_model'],
                "materie_model": row['materie_model'],
                "sursa_model": row['sursa_model'],
                "relevance_score": float(row['relevance_score']) if row['relevance_score'] else 0.0,
                # Don't include full text_model in list response to save bandwidth
            })

        return modele_list

    except Exception as e:
        logger.error(f"Error finding relevant modele: {e}", exc_info=True)
        return []


def get_model_by_id(session: Session, model_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a single document model by its ID.

    Args:
        session: Database session for modele_documente database
        model_id: The SHA1 hash ID of the model

    Returns:
        Dictionary containing the full model data, or None if not found
    """
    logger.info(f"Fetching model with ID: {model_id}")

    query = text("""
        SELECT
            id,
            titlu_model,
            text_model,
            obiect_model,
            materie_model,
            sursa_model,
            keywords_model
        FROM modele_documente
        WHERE id = :model_id
    """)

    try:
        result = session.execute(query, {"model_id": model_id}).mappings().first()

        if not result:
            logger.warning(f"Model with ID {model_id} not found")
            return None

        return {
            "id": result['id'],
            "titlu_model": result['titlu_model'],
            "text_model": result['text_model'],
            "obiect_model": result['obiect_model'],
            "materie_model": result['materie_model'],
            "sursa_model": result['sursa_model'],
            "keywords_model": result['keywords_model']
        }

    except Exception as e:
        logger.error(f"Error fetching model {model_id}: {e}", exc_info=True)
        return None
