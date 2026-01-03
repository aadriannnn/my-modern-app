"""
Text similarity utilities for comparing legal case objects.

Provides normalized text comparison using Levenshtein distance.
"""

from rapidfuzz import fuzz
from .normalization import normalize_text, normalize_materie
import logging

logger = logging.getLogger(__name__)


def calculate_similarity(text1: str, text2: str, normalize: bool = True) -> float:
    """
    Calculate similarity percentage between two texts using Levenshtein distance.

    Args:
        text1: First text to compare
        text2: Second text to compare
        normalize: Whether to normalize texts before comparison (default: True)

    Returns:
        Similarity percentage (0-100), where 100 is identical

    Examples:
        >>> calculate_similarity("furt calificat", "furt calificat")
        100.0
        >>> calculate_similarity("furt calificat", "furt")
        42.86  # approximately
    """
    # Handle empty strings
    if not text1 or not text2:
        return 0.0

    # Normalize if requested
    if normalize:
        text1 = normalize_text(text1)
        text2 = normalize_text(text2)

    # Handle case where normalization results in empty strings
    if not text1 or not text2:
        return 0.0

    # Calculate similarity ratio using rapidfuzz (returns 0-100)
    similarity_percentage = fuzz.ratio(text1, text2)

    return similarity_percentage


def find_similar_objects(
    target_object: str,
    candidate_objects: list[tuple[int, str]],
    threshold: float = 80.0
) -> list[tuple[int, str, float]]:
    """
    Find all objects that are similar to the target object above a threshold.

    Args:
        target_object: The object to match against
        candidate_objects: List of (id, object_text) tuples to compare
        threshold: Minimum similarity percentage (default: 80.0)

    Returns:
        List of (id, object_text, similarity) tuples for matches above threshold,
        sorted by similarity descending

    Example:
        >>> candidates = [(1, "furt calificat"), (2, "omor calificat"), (3, "furt")]
        >>> find_similar_objects("furt calificat", candidates, threshold=80.0)
        [(1, "furt calificat", 100.0)]
    """
    matches = []

    for case_id, candidate_object in candidate_objects:
        similarity = calculate_similarity(target_object, candidate_object)

        if similarity >= threshold:
            matches.append((case_id, candidate_object, similarity))
            logger.debug(f"Match found: ID={case_id}, similarity={similarity:.2f}%")

    # Sort by similarity descending
    matches.sort(key=lambda x: x[2], reverse=True)

    logger.info(f"Found {len(matches)} matches above {threshold}% threshold")

    return matches


def batch_calculate_similarity(
    target: str,
    candidates: list[str],
    normalize: bool = True
) -> list[float]:
    """
    Calculate similarity for a target against multiple candidates efficiently.

    Args:
        target: Target text to compare against
        candidates: List of candidate texts
        normalize: Whether to normalize texts

    Returns:
        List of similarity percentages in same order as candidates
    """
    if normalize:
        target = normalize_text(target)
        candidates = [normalize_text(c) for c in candidates]

    similarities = []
    for candidate in candidates:
        if not target or not candidate:
            similarities.append(0.0)
        else:
            # rapidfuzz returns 0-100 directly
            similarities.append(fuzz.ratio(target, candidate))

    return similarities


def calculate_composite_score(
    obiect_similarity: float,
    materie_portal: str,
    materie_db: str,
    weight_obiect: float = 0.7,
    weight_materie: float = 0.3
) -> float:
    """
    Calculate composite relevance score based on obiect similarity and materie match.

    Args:
        obiect_similarity: Similarity percentage (0-100) for obiect field
        materie_portal: Materie from ReJust portal
        materie_db: Materie from local database
        weight_obiect: Weight for obiect similarity (default: 0.7)
        weight_materie: Weight for materie match (default: 0.3)

    Returns:
        Composite score (0-100)

    Logic:
        - If materie matches: bonus = 100
        - If materie doesn't match: bonus = 0
        - Final score = (obiect_sim * weight_obiect) + (materie_bonus * weight_materie)
        - If one of the materie is missing, fallback to just obiect similarity (effectively re-normalizing weight to 1.0 for obiect)
    """
    # Normalize materie values for comparison
    materie_portal_norm = normalize_materie(materie_portal) if materie_portal else ""
    materie_db_norm = normalize_materie(materie_db) if materie_db else ""

    # If either is missing, we can't compare materie, so rely on object similarity
    if not materie_portal_norm or not materie_db_norm:
        return obiect_similarity

    # Calculate materie bonus
    materie_bonus = 100.0 if materie_portal_norm == materie_db_norm else 0.0

    # Composite score
    composite_score = (obiect_similarity * weight_obiect) + (materie_bonus * weight_materie)

    return composite_score


def find_similar_objects_with_materie(
    target_object: str,
    target_materie: str,
    candidate_objects: list[tuple[int, str, str]],  # (id, obiect, materie)
    threshold: float = 80.0
) -> list[tuple[int, str, float, float]]:  # (id, obiect, similarity, composite_score)
    """
    Find similar objects with materie-based ranking.

    Returns:
        List of (id, obiect, obiect_similarity, composite_score) tuples,
        sorted by composite_score descending
    """
    matches = []

    for case_id, candidate_object, candidate_materie in candidate_objects:
        # Calculate obiect similarity
        obiect_sim = calculate_similarity(target_object, candidate_object)

        # Determine effective threshold for initial filtering.
        # If we have a materie match, the score could be boosted.
        # But usually we still want some basic textual relevance.
        # Let's keep the threshold primarily on text similarity to filter out complete noise.
        # OR we could lower the threshold if materie matches?
        # For now, let's stick to the requested logic:
        # "Rezultat dorit: Cazurile cu aceeași materie să apară primele, chiar dacă au similaritate de obiect ușor mai mică."
        # This implies we still want related objects.

        if obiect_sim >= threshold:
            # Calculate composite score
            composite_score = calculate_composite_score(
                obiect_similarity=obiect_sim,
                materie_portal=target_materie,
                materie_db=candidate_materie
            )
            matches.append((case_id, candidate_object, obiect_sim, composite_score))

    # Sort by composite score descending
    matches.sort(key=lambda x: x[3], reverse=True)

    return matches
