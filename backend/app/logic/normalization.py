import re
from collections import defaultdict

# ===================== LISTĂ PĂRȚI (MODIFICAT) =====================
# Lista fixă pentru secțiunea "Parte", conform cerinței
PARTI_FIXE = [
"ANAF",
"Administratia Fondului pentru Mediu",
"Administratia Nationala a Penitenciarelor",
"Agentia de Plati si Interventie pentru Agricultura",
"Autoritatea Nationala pentru Persoane cu Dizabilitati",
"Autoritatea Nationala pentru Restituirea Proprietatilor",
"Bancă",
"Casă de pensii",
"Comisie pentru Stabilirea Dreptului de Proprietate Privata Asupra Terenurilor",
"Consiliu Judetean",
"Consiliu Local",
"Consiliul National pentru Combaterea Discriminarii",
"Curtea de Conturi a Romaniei",
"Directia Silvica",
"Executor judecătoresc",
"Furnizor utilitati",
"IFN",
"Instanta de judecată",
"Instituție de stat",
"Minister",
"Ministerul Finanțelor Publice",
"Ministerul Public",
"Oficiul National al Registrului Comertului",
"Persoană fizică",
"Poliție",
"Primar",
"Primarie",
"Primarie/Primar",
"Regia Nationala a Padurilor Romsilva",
"Societate comercială",
"Societate de asigurare",
"Spital"
]

# ===================== LOGICA DE SIMPLIFICARE (Neschimbată) =====================

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

# NOU: Funcția _overlap adăugată conform Punctului 3
def _overlap(a, b):
    """Calculează Jaccard overlap între două string-uri."""
    if not a or not b: return 0.0
    A, B = set(normalize_text(a).split()), set(normalize_text(b).split())
    if not A: return 0.0
    return len(A & B) / len(A)


# --- Chei Canonice pentru MATERII (Neschimbate) ---
CANONICAL_KEYS_MATERII = [
"Legea 8/1996", "Legea 7/1996", "Legea 10/2001", "Legea 11/1991", "Legea 14/2003",
"Legea 17/2014", "Legea 18/1991", "Legea 19/2000", "Legea 21/1991", "Legea 21/1996",
"Legea 26/2000", "Legea 31/1990", "Legea 33/1994", "Legea 36/1991", "Legea 36/1995",
"Legea 39/2003", "Legea 46/2003", "Legea 46/2008", "Legea 47/1992", "Legea 50/1991",
"Legea 51/1995", "Legea 58/1934", "Legea 59/1934", "Legea 62/2011", "Legea 64/1991",
"Legea 71/2011", "Legea 76/2002", "Legea 77/2016", "Legea 78/2000", "Legea 84/1998",
"Legea 85/2006", "Legea 85/2014", "Legea 86/2006", "Legea 95/2006", "Legea 112/1995",
"Legea 115/2015", "Legea 118/2019", "Legea 119/1996", "Legea 129/1992", "Legea 129/2019",
"Legea 132/2017", "Legea 136/1995", "Legea 143/2000", "Legea 161/2003", "Legea 165/2013",
"Legea 169/1997", "Legea 176/2010", "Legea 187/2012", "Legea 192/2006", "Legea 193/2000",
"Legea 194/2002", "Legea 196/2018", "Legea 208/2015", "Legea 211/2004", "Legea 213/2015",
"Legea 217/2003", "Legea 221/2009", "Legea 223/2015", "Legea 230/2007", "Legea 241/2005",
"Legea 248/2005", "Legea 253/2013", "Legea 254/2013", "Legea 255/2010", "Legea 263/2010",
"Legea 272/2004", "Legea 273/2004", "Legea 292/2011", "Legea 297/2004", "Legea 302/2004",
"Legea 303/2004", "Legea 3/1977", "Legea 331/2024", "Legea 341/2004", "Legea 350/2007",
"Legea 360/2023", "Legea 365/2002", "Legea 367/2022", "Legea 422/2001", "Legea 448/2006",
"Legea 487/2002", "Legea 554/2004", "Legea 678/2001", "Legea 207/2015",
"Ordonanta 2/2001", "Ordonanta 5/2001", "Ordonanta de urgenta 195/2002",
"Regulamentul 679/2016",
"Codul Civil", "Codul de Procedura Civila", "Codul Penal",
"Codul de Procedura Penala", "Codul Muncii",
"Codul de Procedura Fiscala", "Codul Fiscal", "Codul Administrativ",
"Codul Silvic", "Codul Familiei", "Codul Comercial",
"Contencios administrativ si fiscal", "Contencios administrativ",
"Asigurari sociale", "Litigii de munca", "Minori si familie",
"Proprietate Intelectuala", "Litigii cu profesionistii",
"Penal", "Civil"
]

# --- Liste de DEDUCERE (Neschimbate) ---
OBIECT_DEDUCTION_FAMILIE = {
"abandon de familie", "violență în familie", "ordin de protecție",
"stabilire paternitate", "tăgadă paternitate", "autoritate părintească",
"stabilire domiciliu minor", "încredințare minor", "vizitare minor",
"pensie de întreținere", "majorare pensie de întreținere",
"divorț", "partaj bunuri comune"
}
OBIECT_DEDUCTION_PENAL = {
"tentativă de omor", "omor calificat", "omor", "lovire sau alte violențe", "vătămare corporală",
"furt calificat", "furt", "tâlhărie calificată", "tâlhărie",
"conducere sub influența alcoolului", "conducere fără permis",
"trafic de droguri", "trafic de persoane", "trafic de influență",
"luare de mită", "dare de mită", "abuz în serviciu", "evaziune fiscală",
"violare de domiciliu", "amenințare", "distrugere", "înșelăciune", "fals",
"viol"
}
OBIECT_DEDUCTION_PROCEDURAL = {
"apel", "recurs", "contestație în anulare", "revizuire"
}

# --- Chei Canonice pentru OBIECTE (Neschimbate) ---
CANONICAL_KEYS_OBIECTE = [
"tentativă de omor calificat", "tentativă de omor", "omor calificat", "omor",
"tâlhărie calificată", "tâlhărie", "furt calificat", "furt",
"lovire sau alte violențe", "vătămare corporală",
"conducere sub influența alcoolului", "conducere fără permis",
"trafic de droguri", "trafic de persoane", "trafic de influență",
"luare de mită", "dare de mită", "abuz în serviciu", "evaziune fiscală",
"violare de domiciliu", "amenințare", "distrugere", "înșelăciune", "fals",
"viol",
"majorare pensie de întreținere", "reducere pensie de întreținere", "pensie de întreținere",
"abandon de familie", "violență în familie", "ordin de protecție",
"stabilire paternitate", "tăgadă paternitate", "autoritate părintească",
"stabilire domiciliu minor", "încredințare minor", "vizitare minor",
"divorț", "partaj bunuri comune",
"contestație la executare", "plângere contravențională",
"anulare proces verbal", "ordonanță președințială",
"anulare act administrativ", "anulare act", "anulare contract",
"pretenții", "acțiune în constatare", "răspundere civilă delictuală",
"daune morale", "daune materiale", "revendicare imobiliară", "uzucapiune",
"ieșire din indiviziune", "succesiune", "somație de plată", "insolvență",
"cerere de valoare redusă", "contestație decizie de impunere",
"contestație decizie de pensionare", "încuviințare executare silită",
"cerere de strămutare", "învestire cu formulă executorie", "recuzare",
"acțiune civilă",
"apel", "recurs", "contestație în anulare", "revizuire"
]

# Regex și Mapări (Neschimbate)
SPLIT_REGEX = re.compile(r'\s*[\(;,]\s*|\s+art\.|\s+lit\.|\s+alin\.|\s+rap\.|\s+cu\s+aplicarea', re.IGNORECASE)
CANONICAL_MAP_MATERII = {
key: (normalize_text(key), normalize_text(key, remove_spaces=True))
for key in CANONICAL_KEYS_MATERII
}
CANONICAL_MAP_OBIECTE = {
key: (normalize_text(key), normalize_text(key, remove_spaces=True))
for key in CANONICAL_KEYS_OBIECTE
}

def find_canonical_key(subject, canonical_map_normalized):
    if not subject: return None
    norm_subject = normalize_text(subject)
    norm_subject_no_spaces = normalize_text(subject, remove_spaces=True)
    if not norm_subject: return None
    for key, (norm_key, norm_key_no_spaces) in canonical_map_normalized.items():
        if norm_key in norm_subject: return key
        if norm_key_no_spaces in norm_subject_no_spaces: return key
    return None

def extract_base_obiect(obiect_orig):
    if not obiect_orig: return None
    norm_text = normalize_text(obiect_orig)
    if not norm_text: return None
    parts = SPLIT_REGEX.split(norm_text, 1)
    base_term = parts[0].strip()
    if not base_term: return None
    return base_term
