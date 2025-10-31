import json
import re
import socket
from collections import defaultdict
from functools import lru_cache

import psycopg2
import psycopg2.extras
import requests

from ..config import get_settings

settings = get_settings()

menu_cache = {"menu_data": None, "materii_map": None, "obiecte_map": None}

def normalize_text(text, remove_spaces=False):
    if not text or text.lower() == 'null': return ""
    text = str(text).lower()
    text = text.replace('ă', 'a').replace('â', 'a').replace('î', 'i')
    text = text.replace('ș', 's').replace('ț', 't').replace('ş', 's').replace('ţ', 't')
    text = text.replace(" la infractiunea de ", " de ").replace(" la infractiunii ", " de ").replace(" la ", " de ")
    text = re.sub(r'[^a-z0-9 /]', ' ', text)
    if remove_spaces: text = text.replace(" ", "")
    else: text = ' '.join(text.split())
    return text

# ===================== UTILITY FUNCTIONS & CONSTANTS =====================

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
    "Regulamentul 679/2016", "Codul Civil", "Codul de Procedura Civila", "Codul Penal",
    "Codul de Procedura Penala", "Codul Muncii", "Codul de Procedura Fiscala", "Codul Fiscal", "Codul Administrativ",
    "Codul Silvic", "Codul Familiei", "Codul Comercial",
    "Contencios administrativ si fiscal", "Contencios administrativ", "Asigurari sociale",
    "Litigii de munca", "Minori si familie", "Proprietate Intelectuala", "Litigii cu profesionistii",
    "Penal", "Civil"
]
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
OBIECT_DEDUCTION_FAMILIE = {
    "abandon de familie", "violență în familie", "ordin de protecție", "stabilire paternitate",
    "tăgadă paternitate", "autoritate părintească", "stabilire domiciliu minor", "încredințare minor",
    "vizitare minor", "pensie de întreținere", "majorare pensie de întreținere",
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
SPLIT_REGEX = re.compile(r'\s*[\(;,]\s*|\s+art\.|\s+lit\.|\s+alin\.|\s+rap\.|\s+cu\s+aplicarea', re.IGNORECASE)
CANONICAL_MAP_MATERII = {key: (normalize_text(key), normalize_text(key, remove_spaces=True)) for key in CANONICAL_KEYS_MATERII}
CANONICAL_MAP_OBIECTE = {key: (normalize_text(key), normalize_text(key, remove_spaces=True)) for key in CANONICAL_KEYS_OBIECTE}
PARTI_FIXE = [
    "ANAF", "Administratia Fondului pentru Mediu", "Administratia Nationala a Penitenciarelor",
    "Agentia de Plati si Interventie pentru Agricultura", "Autoritatea Nationala pentru Persoane cu Dizabilitati",
    "Autoritatea Nationala pentru Restituirea Proprietatilor", "Bancă", "Casă de pensii",
    "Comisie pentru Stabilirea Dreptului de Proprietate Privata Asupra Terenurilor", "Consiliu Judetean",
    "Consiliu Local", "Consiliul National pentru Combaterea Discriminarii", "Curtea de Conturi a Romaniei",
    "Directia Silvica", "Executor judecătoresc", "Furnizor utilitati", "IFN", "Instanta de judecată",
    "Instituție de stat", "Minister", "Ministerul Finanțelor Publice", "Ministerul Public",
    "Oficiul National al Registrului Comertului", "Persoană fizică", "Poliție", "Primar", "Primarie",
    "Primarie/Primar", "Regia Nationala a Padurilor Romsilva", "Societate comercială", "Societate de asigurare",
    "Spital"
]

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

def _overlap(a, b):
    if not a or not b: return 0.0
    A, B = set(normalize_text(a).split()), set(normalize_text(b).split())
    if not A: return 0.0
    return len(A & B) / len(A)

def get_db_connection():
    return psycopg2.connect(settings.DATABASE_URL)

def embed_text(text: str) -> list[float]:
    try:
        r = requests.post(
            f"{settings.OLLAMA_URL}/api/embeddings",
            json={"model": settings.MODEL_NAME, "prompt": text},
            timeout=60
        )
        r.raise_for_status()
        emb = r.json().get("embedding")
        if not emb or len(emb) != settings.VECTOR_DIM:
            raise RuntimeError(f"Embedding invalid: size {len(emb) if emb else 0}")
        return emb
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Eroare la contactarea Ollama: {e}")

def vector_to_literal(vec: list[float]) -> str:
    return "[" + ",".join(map(str, vec)) + "]"

# ===================== LOGIC FUNCTIONS =====================

def load_and_build_menu_data():
    print("START PROCESARE: Se încarcă și se procesează perechile materie-obiect...")
    eq_map_materii = {}
    eq_map_obiecte = {}
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("SELECT type, term_canonic_original, term_preferat FROM filtre_echivalente")
                for row in cur:
                    if row['type'] == 'materie':
                        eq_map_materii[row['term_canonic_original']] = row['term_preferat']
                    elif row['type'] == 'obiect':
                        eq_map_obiecte[row['term_canonic_original']] = row['term_preferat']
    except Exception as e:
        print(f"Avertisment: Nu s-au putut încărca echivalențele: {e}")
    sql = "SELECT DISTINCT NULLIF(TRIM(COALESCE(b.data->>'materie', b.data->>'materia', b.data->>'materie_principala')), '') as materie_orig, NULLIF(TRIM(b.data->>'obiect'), '') as obiect_orig FROM blocuri b;"
    mapare_materii_originale = {}
    mapare_obiecte_originale = {}
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    for materie_orig, obiect_orig in rows:
        if materie_orig not in mapare_materii_originale:
            mapare_materii_originale[materie_orig] = find_canonical_key(materie_orig, CANONICAL_MAP_MATERII)
        if obiect_orig not in mapare_obiecte_originale:
            canon_key = find_canonical_key(obiect_orig, CANONICAL_MAP_OBIECTE)
            mapare_obiecte_originale[obiect_orig] = canon_key if canon_key else extract_base_obiect(obiect_orig)
    for orig, cod_canon in mapare_materii_originale.items():
        if cod_canon in eq_map_materii:
            mapare_materii_originale[orig] = eq_map_materii[cod_canon]
    for orig, cod_canon in mapare_obiecte_originale.items():
        if cod_canon in eq_map_obiecte:
            mapare_obiecte_originale[orig] = eq_map_obiecte[cod_canon]
    menu_data = defaultdict(set)
    for materie_orig, obiect_orig in rows:
        materie_canon = mapare_materii_originale.get(materie_orig)
        obiect_canon = mapare_obiecte_originale.get(obiect_orig)
        if not materie_canon and obiect_canon:
            if obiect_canon in OBIECT_DEDUCTION_PROCEDURAL: materie_canon = "Procedural"
            elif obiect_canon in OBIECT_DEDUCTION_FAMILIE: materie_canon = "Minori si familie"
            elif obiect_canon in OBIECT_DEDUCTION_PENAL: materie_canon = "Penal"
            else: materie_canon = "Civil"
        materie_canon = eq_map_materii.get(materie_canon, materie_canon)
        if materie_canon and not obiect_canon: obiect_canon = "(fără obiect specific)"
        obiect_canon = eq_map_obiecte.get(obiect_canon, obiect_canon)
        if not materie_canon: materie_canon = "Necunoscut"
        materie_canon = eq_map_materii.get(materie_canon, materie_canon)
        if not obiect_canon: obiect_canon = "(fără obiect)"
        obiect_canon = eq_map_obiecte.get(obiect_canon, obiect_canon)
        menu_data[materie_canon].add(obiect_canon)
    menu_final = {materie: sorted(list(obiecte)) for materie, obiecte in sorted(menu_data.items())}
    materii_canon_to_orig = defaultdict(set)
    for orig, canon in mapare_materii_originale.items():
        if canon: materii_canon_to_orig[canon].add(orig)
    obiecte_canon_to_orig = defaultdict(set)
    for orig, canon in mapare_obiecte_originale.items():
        if canon: obiecte_canon_to_orig[canon].add(orig)
    materii_canon_to_orig = {k: list(v) for k, v in materii_canon_to_orig.items()}
    obiecte_canon_to_orig = {k: list(v) for k, v in obiecte_canon_to_orig.items()}
    return menu_final, materii_canon_to_orig, obiecte_canon_to_orig

def save_menu_data_to_db(menu_data, materii_map, obiecte_map):
    sql = "INSERT INTO filtre_cache_menu (id, menu_data, materii_map, obiecte_map, last_updated) VALUES (1, %s, %s, %s, NOW()) ON CONFLICT (id) DO UPDATE SET menu_data = EXCLUDED.menu_data, materii_map = EXCLUDED.materii_map, obiecte_map = EXCLUDED.obiecte_map, last_updated = NOW();"
    params = (json.dumps(menu_data), json.dumps(materii_map), json.dumps(obiecte_map))
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()

def refresh_menu_cache():
    menu_data, materii_map, obiecte_map = load_and_build_menu_data()
    save_menu_data_to_db(menu_data, materii_map, obiecte_map)
    load_menu_cache()

def load_menu_cache():
    print("Loading menu data into cache...")
    try:
        sql = "SELECT menu_data, materii_map, obiecte_map FROM filtre_cache_menu WHERE id = 1;"
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(sql)
                row = cur.fetchone()
                if row:
                    menu_cache["menu_data"] = row['menu_data']
                    menu_cache["materii_map"] = row['materii_map']
                    menu_cache["obiecte_map"] = row['obiecte_map']
                    print("Menu data successfully loaded into cache.")
                else:
                    print("No pre-calculated menu found in DB. Forcing a refresh.")
                    refresh_menu_cache()
    except Exception as e:
        print(f"Failed to load menu data into cache: {e}")


def get_cached_menu_data():
    return menu_cache["menu_data"], menu_cache["materii_map"], menu_cache["obiecte_map"]

def search_similar(user_text: str, embedding: list[float], filters: dict):
    emb = vector_to_literal(embedding)
    materii_canon = filters.get("materie") or []
    obiecte_canon = filters.get("obiect") or []
    tipuri_orig = filters.get("tip_speta") or []
    parti_selectate = filters.get("parte") or []

    _, materii_map, obiecte_map = get_cached_menu_data()

    materii_orig = []
    if materii_map:
        for m_canon in materii_canon:
            materii_orig.extend(materii_map.get(m_canon, [m_canon]))
    else:
        materii_orig = materii_canon

    obiecte_orig = []
    if obiecte_map:
        for o_canon in obiecte_canon:
            obiecte_orig.extend(obiecte_map.get(o_canon, [o_canon]))
    else:
        obiecte_orig = obiecte_canon

    where_clauses = []
    params = []

    if materii_orig:
        where_clauses.append("NULLIF(TRIM(COALESCE(b.data->>'materie',b.data->>'materia',b.data->>'materie_principala')),'') = ANY(%s)")
        params.append(materii_orig)
    if obiecte_orig:
        where_clauses.append("NULLIF(TRIM(b.data->>'obiect'),'') = ANY(%s)")
        params.append(obiecte_orig)
    if tipuri_orig:
        where_clauses.append("NULLIF(TRIM(COALESCE(b.data->>'tip_speta',b.data->>'tip',b.data->>'categorie_speta')),'') = ANY(%s)")
        params.append(tipuri_orig)
    if parti_selectate:
        like_conditions = " OR ".join(["NULLIF(TRIM(COALESCE(b.data->>'parte',b.data->>'nume_parte')),'') ILIKE %s" for _ in parti_selectate])
        where_clauses.append(f"({like_conditions})")
        params.extend([f"%{p}%" for p in parti_selectate])

    where_sql = ""
    if where_clauses:
        where_sql = "WHERE " + " AND ".join(where_clauses)

    sql = f"""
    SELECT
        v.speta_id,
        b.data,
        (v.embedding <=> %s::vector) AS semantic_distance
    FROM vectori v
    JOIN blocuri b ON b.id = v.speta_id
    {where_sql}
    ORDER BY semantic_distance ASC
    LIMIT %s;
    """

    params.insert(0, emb)
    params.append(settings.TOP_K)

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()

    results_processed = []
    for row in rows:
        semantic_sim = 1.0 - (float(row['semantic_distance']) if row['semantic_distance'] is not None else 1.0)
        data = row['data']
        tip_speta = data.get('tip_speta') or data.get('tip') or data.get('categorie_speta') or "—"
        materie = data.get('materie') or data.get('materia') or data.get('materie_principala') or "—"
        situatia_de_fapt_text = (data.get('text_situatia_de_fapt') or data.get('situatia_de_fapt') or
                                 data.get('situatie') or data.get('solutia') or "")
        denumire_orig = data.get('denumire')

        den_finala = (situatia_de_fapt_text.strip().replace("\n", " ").replace("\r", " ")
                      if situatia_de_fapt_text else
                      data.get("titlu") or denumire_orig or f"{tip_speta} - {materie} (ID {row['speta_id']})")

        results_processed.append({
            "id": row['speta_id'],
            "denumire": den_finala,
            "situatia_de_fapt_full": situatia_de_fapt_text,
            "tip_speta": tip_speta,
            "materie": materie,
            "score": semantic_sim,
            "match_count": 0,
            "data": data,
            "tip_instanta": data.get('tip_instanta') or "—",
            "data_solutiei": data.get('data_solutiei') or "—",
            "numar_dosar": data.get('numar_dosar') or "—"
        })

    BETA = 0.15
    if user_text:
        for r in results_processed:
            text_boost = _overlap(user_text, r["situatia_de_fapt_full"])
            r["score"] = (1 - BETA) * r["score"] + BETA * text_boost

    results_processed.sort(key=lambda x: x["score"], reverse=True)
    return results_processed
