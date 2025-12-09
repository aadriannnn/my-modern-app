"""
Utility functions for final report processing.
Handles case ID to title replacement throughout report content.
"""
import re
import logging
from typing import Dict, Any, Set
from sqlmodel import Session

logger = logging.getLogger(__name__)


def extract_all_case_ids_from_report(report: Dict[str, Any]) -> Set[int]:
    """
    Extract all case IDs from the entire report structure.

    Searches through:
    - bibliography.jurisprudence[].case_id
    - bibliography citations containing (#ID) pattern
    - All text content (chapters, conclusions, etc.)

    Returns:
        Set of unique case IDs found in the report
    """
    case_ids = set()

    # Extract from bibliography
    jurisprudence = report.get('bibliography', {}).get('jurisprudence', [])
    for item in jurisprudence:
        case_id = item.get('case_id')
        if case_id:
            if isinstance(case_id, str):
                try:
                    case_id = int(case_id)
                except ValueError:
                    continue
            case_ids.add(case_id)

        # Also check citation field for (#ID) pattern
        citation = item.get('citation', '')
        ids_in_citation = re.findall(r'#(\d+)', citation)
        case_ids.update(int(id_str) for id_str in ids_in_citation)

    # Extract from all text content using regex
    text_content = _extract_all_text_from_report(report)
    ids_in_text = re.findall(r'#(\d+)', text_content)
    case_ids.update(int(id_str) for id_str in ids_in_text)

    logger.info(f"Extracted {len(case_ids)} unique case IDs from report")
    return case_ids


def _extract_all_text_from_report(report: Dict[str, Any]) -> str:
    """
    Recursively extract all string values from report dict.
    Used to find all case ID references in text.
    """
    text_parts = []

    def extract_strings(obj):
        if isinstance(obj, dict):
            for value in obj.values():
                extract_strings(value)
        elif isinstance(obj, list):
            for item in obj:
                extract_strings(item)
        elif isinstance(obj, str):
            text_parts.append(obj)

    extract_strings(report)
    return ' '.join(text_parts)


def fetch_case_titles(session: Session, case_ids: Set[int]) -> Dict[int, str]:
    """
    Fetch case titles from database for given IDs.

    Args:
        session: SQLModel database session
        case_ids: Set of case IDs to fetch

    Returns:
        Dictionary mapping case_id -> title (denumire)
    """
    if not case_ids:
        return {}

    from ..models import Blocuri
    from sqlalchemy import text

    # Use raw SQL to extract 'denumire' from JSONB obj field
    # This handles the Blocuri table structure where data is in obj JSONB column
    query = text("""
        SELECT id, obj->>'denumire' as title
        FROM blocuri
        WHERE id = ANY(:ids)
    """)

    result = session.execute(query, {"ids": list(case_ids)})
    rows = result.fetchall()

    id_to_title = {}
    for row in rows:
        case_id = row[0]
        title = row[1]
        if title:  # Only add if title is not null/empty
            id_to_title[case_id] = title.strip()

    logger.info(f"Fetched {len(id_to_title)} case titles from database")

    # Log missing IDs
    missing_ids = case_ids - set(id_to_title.keys())
    if missing_ids:
        logger.warning(f"Case IDs not found in database or missing denumire: {missing_ids}")

    return id_to_title


def replace_case_ids_in_text(text: str, id_to_title: Dict[int, str]) -> str:
    """
    Replace case ID references with actual titles in text.

    Replaces patterns like:
    - "Jurisprudența anonimizată (#72)" -> "Decizia ÎCCJ nr. 1234/2023"
    - "(#179, #99, #170)" -> "(Decizia ..., Decizia ..., Decizia ...)"
    - "#294" -> "Decizia ..."

    Args:
        text: Text containing case ID references
        id_to_title: Dictionary mapping case_id -> title

    Returns:
        Text with IDs replaced by titles
    """
    if not text or not id_to_title:
        return text

    # Pattern: "Jurisprudența anonimizată (#ID)" -> full title
    def replace_full_pattern(match):
        case_id = int(match.group(1))
        title = id_to_title.get(case_id)
        if title:
            return title
        return match.group(0)  # Keep original if no title found

    text = re.sub(
        r'Jurisprudența anonimizată \(#(\d+)\)',
        replace_full_pattern,
        text
    )

    # Pattern: "(#ID1, #ID2, #ID3)" -> "(Title1, Title2, Title3)"
    def replace_list_pattern(match):
        full_match = match.group(0)
        id_strs = re.findall(r'\d+', full_match)
        titles = []
        for id_str in id_strs:
            case_id = int(id_str)
            title = id_to_title.get(case_id)
            if title:
                titles.append(title)
            else:
                titles.append(f"#{id_str}")  # Keep ID if no title

        if titles:
            return f"({', '.join(titles)})"
        return full_match

    text = re.sub(
        r'\(#\d+(?:,\s*#\d+)*\)',
        replace_list_pattern,
        text
    )

    # Pattern: standalone "#ID" -> title
    def replace_standalone_id(match):
        case_id = int(match.group(1))
        title = id_to_title.get(case_id)
        if title:
            return title
        return match.group(0)

    # Only replace if not already replaced (avoid double replacement)
    # Use negative lookbehind to avoid replacing IDs in URLs or already processed text
    text = re.sub(
        r'(?<![a-zA-Z])#(\d+)(?![a-zA-Z0-9])',
        replace_standalone_id,
        text
    )

    return text


def enrich_report_with_titles(report: Dict[str, Any], session: Session) -> Dict[str, Any]:
    """
    Replace all case ID references with actual titles throughout the report.

    This is the main function that orchestrates:
    1. Extracting all case IDs from report
    2. Fetching titles from database
    3. Replacing IDs with titles in all text fields

    Args:
        report: Final report dictionary
        session: SQLModel database session

    Returns:
        Enriched report with titles replacing IDs
    """
    logger.info("Starting report enrichment with case titles...")

    # Step 1: Extract all case IDs
    case_ids = extract_all_case_ids_from_report(report)

    if not case_ids:
        logger.warning("No case IDs found in report")
        return report

    # Step 2: Fetch titles
    id_to_title = fetch_case_titles(session, case_ids)

    if not id_to_title:
        logger.warning("No titles fetched from database")
        return report

    # Step 3: Replace IDs in all text fields
    _replace_ids_in_dict(report, id_to_title)

    logger.info("Report enrichment completed")
    return report


def _replace_ids_in_dict(obj: Any, id_to_title: Dict[int, str]) -> None:
    """
    Recursively replace case IDs in all string values within a dictionary/list structure.
    Modifies the object in-place.
    """
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str):
                obj[key] = replace_case_ids_in_text(value, id_to_title)
            else:
                _replace_ids_in_dict(value, id_to_title)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, str):
                obj[i] = replace_case_ids_in_text(item, id_to_title)
            else:
                _replace_ids_in_dict(item, id_to_title)
