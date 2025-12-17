import re

def normalize_text(text, remove_spaces=False):
    if not text or text.lower() == 'null':
        return ""
    text = str(text).lower()
    text = text.replace('ă', 'a').replace('â', 'a').replace('î', 'i')
    text = text.replace('ș', 's').replace('ț', 't')
    text = text.replace('ş', 's').replace('ţ', 't')
    text = text.replace(" la infractiunea de ", " de ")
    text = text.replace(" la infractiunii ", " de ")
    text = text.replace(" la ", " de ")
    text = re.sub(r'[^a-z0-9 /]', ' ', text)
    if remove_spaces:
        text = text.replace(" ", "")
    else:
        text = ' '.join(text.split())
    return text

def find_canonical_key(subject, canonical_map_normalized):
    if not subject:
        return None
    norm_subject = normalize_text(subject)
    norm_subject_no_spaces = normalize_text(subject, remove_spaces=True)
    if not norm_subject:
        return None
    for key, (norm_key, norm_key_no_spaces) in canonical_map_normalized.items():
        if norm_key in norm_subject:
            return key
        if norm_key_no_spaces in norm_subject_no_spaces:
            return key
    return None

SPLIT_REGEX = re.compile(
    r'\s*[\(;,]\s*|\s+art\.|\s+lit\.|\s+alin\.|\s+rap\.|\s+cu\s+aplicarea',
    re.IGNORECASE
)

def extract_base_obiect(obiect_orig):
    if not obiect_orig:
        return None
    norm_text = normalize_text(obiect_orig)
    if not norm_text:
        return None
    parts = SPLIT_REGEX.split(norm_text, 1)
    base_term = parts[0].strip()
    if not base_term:
        return None
    return base_term

def normalize_materie(materie: str) -> str:
    """
    Normalize materie field for consistent comparison.

    Mapping:
        "CIVIL", "Civil", "Drept civil" -> "civil"
        "PENAL", "Penal", "Drept penal" -> "penal"
        "ADMINISTRATIV", "Contencios administrativ" -> "administrativ"
    """
    if not materie:
        return ""

    # Use existing normalize_text for basic cleanup (lowercase, diacritics, etc.)
    materie_lower = normalize_text(materie)

    # Canonical mappings
    if "civil" in materie_lower:
        return "civil"
    elif "penal" in materie_lower:
        return "penal"
    elif "admin" in materie_lower or "contencios" in materie_lower:
        return "administrativ"
    elif "munc" in materie_lower:
        return "munca"
    elif "comercial" in materie_lower:
        return "comercial"
    elif "faliment" in materie_lower or "insolvent" in materie_lower:
        return "faliment"
    elif "minor" in materie_lower and "familie" in materie_lower:
        return "minori si familie"
    elif "intellectual" in materie_lower or "intelectuala" in materie_lower:
        return "proprietate intelectuala"
    else:
        return materie_lower
