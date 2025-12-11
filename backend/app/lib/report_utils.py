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

    # Extract [cite: 12, 34] pattern
    cite_matches = re.findall(r'\[cite:\s*([\d,\s]+)\]', text_content, flags=re.IGNORECASE)
    for match in cite_matches:
        # split by comma
        ids = re.split(r'[,;]\s*', match)
        for i in ids:
            if i.strip().isdigit():
                case_ids.add(int(i.strip()))

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

    Priority:
    1. obj->>'titlu' (often contains the full citation)
    2. obj->>'denumire' (legacy title field)
    3. Fallback: "Decizia nr. {id}"
    """
    if not case_ids:
        return {}

    from sqlalchemy import text

    # Use raw SQL to extract 'titlu' then 'denumire' from JSONB obj field
    # COALESCE returns the first non-null, non-empty value
    query = text("""
        SELECT
            id,
            COALESCE(
                NULLIF(obj->>'titlu', ''),
                NULLIF(obj->>'denumire', ''),
                'Decizia nr. ' || id
            ) as title
        FROM blocuri
        WHERE id = ANY(:ids)
    """)

    result = session.execute(query, {"ids": list(case_ids)})
    rows = result.fetchall()

    id_to_title = {}
    for row in rows:
        case_id = row[0]
        title = row[1]
        if title:
            # Clean up title if needed (e.g., remove excess whitespace)
            id_to_title[case_id] = title.strip()

    logger.info(f"Fetched {len(id_to_title)} case titles from database")
    return id_to_title


def replace_case_ids_in_text(text: str, id_to_title: Dict[int, str], for_docx: bool = False) -> str:
    """
    Aggressively replace case ID references with actual titles.

    Strategy:
    1. Remove prefixes like "Jurisprudența anonimizată" or "Decizia" if followed by an ID.
    2. Expand lists of IDs `(#1, #2)` -> `(Title 1, Title 2)`.
    3. Handling bracket format `[ID]` -> `Title`.
    4. Replace generic `#ID` -> `Title`.

    Args:
        for_docx: If True, formats replacement as `[[CITATION:ID:Title]]` for post-processing.
    """
    if not text or not id_to_title:
        return text

    def format_replacement(case_id: int, title: str) -> str:
        if for_docx:
            # Return special marker for DOCX generator to turn into footnotes
            # Only use the title part, keep ID for reference
            return f"[[CITATION:{case_id}:{title}]]"
        return title

    # --- Step 1: Remove Prefixes ---
    # Removes "Jurisprudența anonimizată", "Decizia", "Cazul", "ID-urile"
    # if they are immediately followed by an ID pattern (with optional parens/brackets).
    # We replace the prefix with empty string, effectively leaving just the ID part for subsequent steps.
    # Group 1: The prefix to remove
    # Handles:
    # - "Jurisprudența anonimizată" / "Jurisprudenței anonimizate"
    # - "Decizia" / "Deciziei"
    # - "Hotărârea" / "Hotărârii"
    # - "Speța" / "Speței"
    # - "Cazul" / "Cazului"
    # - "ID-urile" / "ID-ul"

    prefix_pattern = r'(?:Jurispruden[tț][aăei]{1,2}\s+anonimizat[aăei]{1,2}|Decizi[aie]{1,2}|H[oa]t[aă]r[âa]re[ai]{0,2}|Spe[tț][aăei]{1,2}|Cazul(?:ui)?|ID(?:-ul|-urile)?)(?:\s+cu)?'

    # We replace the prefix with nothing, but we need to be careful not to merge words incorrectly.
    # actually, if we just remove the prefix, the next steps will find #ID and replace it.

    # This regex looks for Prefix + (OPTIONAL SPACE) + (# or [ or ( )
    text = re.sub(
        f'{prefix_pattern}\\s*(?=[#\\[(])',
        '',
        text,
        flags=re.IGNORECASE
    )

    # --- Step 2: Handle Lists of IDs ---
    # Matches patterns like `(#123, #456)` or `[#123; #456]`
    def replace_list_match(match):
        content = match.group(1) # The content inside parens
        # Split by comma or semicolon
        parts = re.split(r'[,;]\s*', content)
        new_parts = []
        modified = False

        for part in parts:
            part = part.strip()
            # Extract ID from "#123" or "123"
            id_match = re.search(r'#?(\d+)', part)
            if id_match:
                case_id = int(id_match.group(1))
                title = id_to_title.get(case_id)
                if title:
                    new_parts.append(format_replacement(case_id, title))
                    modified = True
                else:
                    new_parts.append(part) # Keep original if not found
            else:
                new_parts.append(part)

        if modified:
            # Reconstruct with commas
            # For DOCX, we simply list them. The footnote logic will handle them individually if found in text,
            # but here they are grouped.
            return f"({', '.join(new_parts)})"
        return match.group(0)

    # Apply to parens (...)
    text = re.sub(r'\((#\d+(?:,\s*#\d+)*)\)', replace_list_match, text)

    # --- Step 3: Handle Bracket Format [123] or [#123] ---
    # Common in generic LLM citations
    def replace_bracket_match(match):
        case_id = int(match.group(1))
        title = id_to_title.get(case_id)
        if title:
             return format_replacement(case_id, title) # Remove brackets, just put title/marker
        return match.group(0)

    text = re.sub(r'\[#?(\d+)\]', replace_bracket_match, text)

    # --- Step 4: Generic Standalone Replacement ---
    # Matches #123 anywhere else
    def replace_standalone(match):
        case_id = int(match.group(1))
        title = id_to_title.get(case_id)
        if title:
            return format_replacement(case_id, title)
        return match.group(0)

    text = re.sub(r'#(\d+)', replace_standalone, text)

    # --- Step 5: Handle [cite: 12, 34] Pattern ---
    # Matches patterns like `[cite: 1, 2]` or `[cite: 1]` output by LLM
    def replace_cite_tag_match(match):
        content = match.group(1) # The extracted IDs string e.g. "1, 2"
        parts = re.split(r'[,;]\s*', content)
        new_parts = []

        for part in parts:
            part = part.strip()
            if not part: continue
            if part.isdigit():
                case_id = int(part)
                title = id_to_title.get(case_id)
                if title:
                    new_parts.append(format_replacement(case_id, title))
                else:
                    new_parts.append(f"[cite: {case_id}]") # Keep original if not found
            else:
                new_parts.append(part)

        if not new_parts:
            return match.group(0)

        # Join them back.
        return " ".join(new_parts)

    text = re.sub(r'\[cite:\s*([\d,\s]+)\]', replace_cite_tag_match, text, flags=re.IGNORECASE)

    # --- Step 5: Final Cleanup ---
    # Fix double spaces created by prefix removal
    text = re.sub(r'\s{2,}', ' ', text)
    # Fix empty parens () if they occur (unlikely but possible)
    text = text.replace('()', '')

    return text.strip()


def enrich_report_with_titles(report: Dict[str, Any], session: Session, for_docx: bool = False) -> Dict[str, Any]:
    """
    Replace all case ID references with actual titles throughout the report.

    This function orchestrates:
    1. Extracting all case IDs from report
    2. Fetching titles from database (preferring 'titlu' over 'denumire')
    3. Replacing IDs with titles in text fields
    4. Populating bibliography with database-sourced titles

    Args:
        for_docx: If True, uses a special `[[CITATION:ID:Title]]` format for DOCX processing (footnotes).
                  EXCEPTION: Bibliography section always gets plain text replacement.
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

    # Step 3: Replace IDs in report (excluding bibliography first to avoid recursion mixup if we modify in place)
    # Actually, easier to let recursive replace happen, but we want different behavior for bibliography.
    # So we separate them.

    biblio = report.pop('bibliography', None)

    # Replace in main body (chapters, intro, etc) with requested format (e.g. footnotes for DOCX)
    _replace_ids_in_dict(report, id_to_title, for_docx)

    # Step 4: Populate bibliography with database-sourced titles
    if biblio:
        # Ensure bibliography has the correct structure
        if 'jurisprudence' not in biblio:
            biblio['jurisprudence'] = []

        # Update existing bibliography entries with database titles
        for item in biblio.get('jurisprudence', []):
            case_id = item.get('case_id')
            if case_id:
                # Convert to int if needed
                if isinstance(case_id, str):
                    try:
                        case_id = int(case_id)
                    except ValueError:
                        continue

                # Replace citation with database title if available
                db_title = id_to_title.get(case_id)
                if db_title:
                    item['citation'] = db_title
                    logger.info(f"Updated bibliography entry for case {case_id} with database title")

        # Add any missing cases to bibliography
        existing_case_ids = {item.get('case_id') for item in biblio.get('jurisprudence', []) if item.get('case_id')}
        for case_id in case_ids:
            if case_id not in existing_case_ids:
                db_title = id_to_title.get(case_id)
                if db_title:
                    biblio['jurisprudence'].append({
                        'case_id': case_id,
                        'citation': db_title
                    })
                    logger.info(f"Added missing case {case_id} to bibliography")


        # Note: We do NOT call _replace_ids_in_dict on bibliography here
        # because we've already explicitly set the citations from database above.
        # Calling it would overwrite our database-sourced citations!
        report['bibliography'] = biblio

    logger.info("Report enrichment completed")
    return report


def _replace_ids_in_dict(obj: Any, id_to_title: Dict[int, str], for_docx: bool = False) -> None:
    """
    Recursively replace case IDs in all string values within a dictionary/list structure.
    Modifies the object in-place.
    """
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str):
                obj[key] = replace_case_ids_in_text(value, id_to_title, for_docx)
            else:
                _replace_ids_in_dict(value, id_to_title, for_docx)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            if isinstance(item, str):
                obj[i] = replace_case_ids_in_text(item, id_to_title, for_docx)
            else:
                _replace_ids_in_dict(item, id_to_title, for_docx)
