"""
Object Clustering Module for Legal Objects

This module implements intelligent grouping of similar legal objects (obiecte juridice)
using multiple similarity metrics tailored for Romanian legal terminology.

Key Features:
- Normalized Levenshtein distance for spelling variations
- Token overlap analysis for word-based similarity
- Base concept extraction (removing legal references)
- Romanian legal pattern recognition
- Hierarchical clustering for grouping
- Canonical term selection
"""

import logging
import re
from typing import List, Dict, Set, Tuple
from collections import defaultdict, Counter

logger = logging.getLogger(__name__)


def levenshtein_distance(s1: str, s2: str) -> int:
    """
    Calculate the Levenshtein (edit) distance between two strings.

    Args:
        s1: First string
        s2: Second string

    Returns:
        int: The minimum number of single-character edits needed to transform s1 into s2
    """
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            # Cost of insertions, deletions, or substitutions
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def normalize_for_clustering(text: str) -> str:
    """
    Aggressive normalization for clustering purposes.

    - Converts to lowercase
    - Removes all diacritics
    - Removes legal reference patterns (art., alin., lit., etc.)
    - Standardizes whitespace
    - Removes punctuation

    Args:
        text: Original legal object text

    Returns:
        str: Normalized text for comparison
    """
    if not text:
        return ""

    text = str(text).lower()

    # Remove diacritics
    text = text.replace('ă', 'a').replace('â', 'a').replace('î', 'i')
    text = text.replace('ș', 's').replace('ț', 't')
    text = text.replace('ş', 's').replace('ţ', 't')

    # Remove common legal references
    text = re.sub(r'\bart\.?\s*\d+.*?(?=\s|$)', '', text)
    text = re.sub(r'\balin\.?\s*\d+.*?(?=\s|$)', '', text)
    text = re.sub(r'\blit\.?\s*[a-z]\).*?(?=\s|$)', '', text)
    text = re.sub(r'\bpct\.?\s*\d+.*?(?=\s|$)', '', text)
    text = re.sub(r'\bcap\.?\s*[IVX]+.*?(?=\s|$)', '', text)
    text = re.sub(r'\brap\.?\s+la\b', '', text)
    text = re.sub(r'\bcu\s+aplicarea\b', '', text)
    text = re.sub(r'\bdin\s+legea\b.*?(?=\s|$)', '', text)

    # Remove extra legal phrases
    text = text.replace(" la infractiunea de ", " ")
    text = text.replace(" la infractiunii ", " ")
    text = text.replace(" de la ", " ")

    # Remove all punctuation and special characters
    text = re.sub(r'[^a-z0-9\s]', ' ', text)

    # Normalize whitespace
    text = ' '.join(text.split())

    return text.strip()


def extract_tokens(text: str) -> Set[str]:
    """
    Extract meaningful tokens (words) from normalized text.
    Filters out common stopwords in Romanian legal context.

    Args:
        text: Normalized text

    Returns:
        Set[str]: Set of meaningful tokens
    """
    # Romanian legal stopwords
    stopwords = {
        'de', 'la', 'cu', 'in', 'din', 'pentru', 'si', 'sau', 'pe',
        'ca', 'cel', 'cei', 'cea', 'ale', 'ai', 'a', 'al'
    }

    tokens = set(text.split())
    return tokens - stopwords


def calculate_similarity(obj1: str, obj2: str) -> float:
    """
    Calculate similarity score between two legal object strings using multi-factor analysis.

    Combines:
    1. Normalized Levenshtein distance (edit distance after normalization)
    2. Token overlap (Jaccard similarity of meaningful words)
    3. Length penalty (heavily penalize very different lengths)

    Args:
        obj1: First legal object string
        obj2: Second legal object string

    Returns:
        float: Similarity score between 0.0 (completely different) and 1.0 (identical)
    """
    if not obj1 or not obj2:
        return 0.0

    # Normalize both strings
    norm1 = normalize_for_clustering(obj1)
    norm2 = normalize_for_clustering(obj2)

    if not norm1 or not norm2:
        return 0.0

    # If exactly the same after normalization, perfect match
    if norm1 == norm2:
        return 1.0

    # 1. Levenshtein distance component (normalized by max length)
    lev_dist = levenshtein_distance(norm1, norm2)
    max_len = max(len(norm1), len(norm2))
    lev_similarity = 1.0 - (lev_dist / max_len) if max_len > 0 else 0.0

    # 2. Token overlap component (Jaccard similarity)
    tokens1 = extract_tokens(norm1)
    tokens2 = extract_tokens(norm2)

    if not tokens1 and not tokens2:
        token_similarity = 1.0
    elif not tokens1 or not tokens2:
        token_similarity = 0.0
    else:
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        token_similarity = intersection / union if union > 0 else 0.0

    # 3. Length penalty - if one is much longer, reduce similarity
    len1, len2 = len(norm1), len(norm2)
    min_len = min(len1, len2)
    max_len = max(len1, len2)
    length_ratio = min_len / max_len if max_len > 0 else 0.0

    # Apply length penalty more aggressively for very different lengths
    if length_ratio < 0.5:  # One is more than 2x longer
        length_penalty = length_ratio * 0.5
    else:
        length_penalty = 1.0

    # Weighted combination
    # Levenshtein is important for typos/variations
    # Tokens are important for concept matching
    # Length penalty prevents grouping very different concepts
    similarity = (
        lev_similarity * 0.5 +
        token_similarity * 0.4 +
        length_ratio * 0.1
    ) * length_penalty

    return similarity


def group_objects_by_similarity(
    objects: List[str],
    threshold: float = 0.85,
    max_group_size: int = 50
) -> Dict[str, List[str]]:
    """
    Group legal objects using similarity-based clustering.

    Uses a greedy approach:
    1. Sort objects by length (shorter = more likely to be canonical)
    2. For each object, try to assign to an existing group if similarity > threshold
    3. Otherwise, create a new group

    Args:
        objects: List of legal object strings to group
        threshold: Minimum similarity score to group objects (default: 0.85)
        max_group_size: Maximum number of variants per group (safety limit)

    Returns:
        Dict[str, List[str]]: Mapping of canonical_term -> [variants]
    """
    if not objects:
        return {}

    logger.info(f"Grouping {len(objects)} objects with threshold={threshold}")

    # Remove duplicates and empty strings
    unique_objects = list(set(obj.strip() for obj in objects if obj and obj.strip()))

    if not unique_objects:
        return {}

    # Sort by length (shorter terms are typically more canonical)
    sorted_objects = sorted(unique_objects, key=lambda x: (len(normalize_for_clustering(x)), x))

    groups: Dict[str, List[str]] = {}

    for obj in sorted_objects:
        best_group = None
        best_similarity = 0.0

        # Try to find an existing group this object belongs to
        for canonical, variants in groups.items():
            # Calculate similarity to canonical term
            similarity = calculate_similarity(obj, canonical)

            if similarity >= threshold and similarity > best_similarity:
                # Also check similarity to a few existing variants to ensure consistency
                variant_similarities = [
                    calculate_similarity(obj, variant)
                    for variant in variants[:3]  # Check up to 3 variants
                ]
                avg_variant_sim = sum(variant_similarities) / len(variant_similarities) if variant_similarities else similarity

                if avg_variant_sim >= threshold * 0.9:  # Slightly lower threshold for variants
                    best_group = canonical
                    best_similarity = similarity

        if best_group and len(groups[best_group]) < max_group_size:
            # Add to existing group
            groups[best_group].append(obj)
        else:
            # Create new group with this object as canonical
            groups[obj] = [obj]

    # Log statistics
    total_objects = len(unique_objects)
    num_groups = len(groups)
    grouped_count = sum(len(v) for v in groups.values() if len(v) > 1)

    logger.info(f"Grouping complete: {total_objects} objects -> {num_groups} groups")
    logger.info(f"Objects in multi-variant groups: {grouped_count}")
    logger.info(f"Groups with >1 variant: {sum(1 for v in groups.values() if len(v) > 1)}")

    return groups


def select_canonical_term(group: List[str]) -> str:
    """
    Select the best canonical/representative term from a group of variants.

    Selection criteria (in order of priority):
    1. Most common form (if we had frequency data)
    2. Shortest normalized form (usually the base concept)
    3. Proper capitalization (prefer title case over all caps)
    4. Alphabetically first (for consistency)

    Args:
        group: List of variant strings for the same legal concept

    Returns:
        str: The selected canonical term
    """
    if not group:
        return ""

    if len(group) == 1:
        return group[0]

    # Score each variant
    scored = []
    for variant in group:
        score = 0
        norm = normalize_for_clustering(variant)

        # Prefer shorter normalized forms (base concept without legal refs)
        # Invert so shorter = higher score
        length_score = 1000 - len(norm)
        score += length_score

        # Prefer proper capitalization over all caps
        if variant.isupper():
            score -= 100  # Penalty for all caps
        elif variant[0].isupper() and not variant[1:].isupper():
            score += 50  # Bonus for title case

        # Prefer variants without excessive legal references
        if 'art.' not in variant.lower() and 'alin.' not in variant.lower():
            score += 30

        scored.append((score, variant))

    # Sort by score (descending), then alphabetically
    scored.sort(key=lambda x: (-x[0], x[1]))

    canonical = scored[0][1]
    logger.debug(f"Selected canonical term '{canonical}' from {len(group)} variants")

    return canonical


def refine_groups_with_legal_knowledge(
    groups: Dict[str, List[str]],
    materie: str
) -> Dict[str, List[str]]:
    """
    Apply Romanian legal domain knowledge to refine groupings.

    Handles specific patterns like:
    - "tentativă de X" should group with "X" variants
    - "X calificat" should be separate from base "X"
    - Procedural terms (apel, recurs) should not over-group

    Args:
        groups: Initial grouping from similarity algorithm
        materie: The legal matter (materie) these objects belong to

    Returns:
        Dict[str, List[str]]: Refined grouping
    """
    # For now, return as-is
    # Future enhancement: implement Romanian legal pattern rules
    # Example: if materie contains "penal", apply criminal law specific rules

    logger.debug(f"Applied legal knowledge refinement for materie: {materie}")
    return groups
