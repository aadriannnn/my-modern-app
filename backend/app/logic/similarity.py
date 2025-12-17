"""
Text similarity utilities for comparing legal case objects.

Provides normalized text comparison using Levenshtein distance.
"""

from rapidfuzz import fuzz
from .normalization import normalize_text
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
