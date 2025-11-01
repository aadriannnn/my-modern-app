import logging
import re
import json
from collections import defaultdict
from sqlmodel import Session, select, text
from ..models import Blocuri, FiltreEchivalente, FiltreCacheMenu
from .normalization import normalize_text, find_canonical_key, extract_base_obiect

# --- Chei Canonice pentru MATERII ---
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

# --- Liste de DEDUCERE ---
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

# --- Chei Canonice pentru OBIECTE ---
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

# Regex și Mapări
CANONICAL_MAP_MATERII = {
    key: (normalize_text(key), normalize_text(key, remove_spaces=True))
    for key in CANONICAL_KEYS_MATERII
}
CANONICAL_MAP_OBIECTE = {
    key: (normalize_text(key), normalize_text(key, remove_spaces=True))
    for key in CANONICAL_KEYS_OBIECTE
}

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

logger = logging.getLogger(__name__)

def load_and_build_menu_data(session: Session):
    logger.info("Starting to load and build menu data...")

    eq_map_materii = {} # {"cod_canon": "user_pref"}
    eq_map_obiecte = {} # {"cod_canon": "user_pref"}

    equivalences = session.exec(select(FiltreEchivalente)).all()
    for eq in equivalences:
        if eq.type == 'materie':
            eq_map_materii[eq.term_canonic_original] = eq.term_preferat
        elif eq.type == 'obiect':
            eq_map_obiecte[eq.term_canonic_original] = eq.term_preferat
    logger.info(f"Loaded {len(eq_map_materii)} materii and {len(eq_map_obiecte)} obiecte equivalences.")


    # --- Pas 2: Extrage toate perechile unice ---
    query = text("""
    SELECT DISTINCT
        NULLIF(TRIM(COALESCE(obj->>'materie', obj->>'materia', obj->>'materie_principala')), '') as materie_orig,
        NULLIF(TRIM(obj->>'obiect'), '') as obiect_orig
    FROM blocuri
    WHERE
        NULLIF(TRIM(COALESCE(obj->>'materie', obj->>'materia', obj->>'materie_principala')), '') IS NOT NULL
        OR NULLIF(TRIM(obj->>'obiect'), '') IS NOT NULL;
    """)
    rows = session.exec(query).all()

    logger.info(f"Found {len(rows)} unique materie-obiect pairs. Starting simplification...")

    mapare_materii_originale = {} # {"text raw": "cod_canon"}
    mapare_obiecte_originale = {} # {"text raw": "cod_canon"}

    # --- Pas 3: Generează mapările canonice generate de cod ---
    for materie_orig, obiect_orig in rows:
        if materie_orig not in mapare_materii_originale:
            mapare_materii_originale[materie_orig] = find_canonical_key(materie_orig, CANONICAL_MAP_MATERII)

        if obiect_orig not in mapare_obiecte_originale:
            canon_key = find_canonical_key(obiect_orig, CANONICAL_MAP_OBIECTE)
            if canon_key:
                mapare_obiecte_originale[obiect_orig] = canon_key
            else:
                mapare_obiecte_originale[obiect_orig] = extract_base_obiect(obiect_orig)

    # --- NOU: Pas 4: Aplică echivalențele peste mapările generate ---
    for orig, cod_canon in mapare_materii_originale.items():
        if cod_canon in eq_map_materii:
            mapare_materii_originale[orig] = eq_map_materii[cod_canon]

    for orig, cod_canon in mapare_obiecte_originale.items():
        if cod_canon in eq_map_obiecte:
            mapare_obiecte_originale[orig] = eq_map_obiecte[cod_canon]

    # --- Pas 5: Construiește meniul (folosind mapările actualizate) ---
    menu_data = defaultdict(set)
    for materie_orig, obiect_orig in rows:

        materie_canon = mapare_materii_originale.get(materie_orig)
        obiect_canon = mapare_obiecte_originale.get(obiect_orig)

        if not materie_canon and obiect_canon:
            if obiect_canon in OBIECT_DEDUCTION_PROCEDURAL:
                materie_canon = "Procedural"
            elif obiect_canon in OBIECT_DEDUCTION_FAMILIE:
                 materie_canon = "Minori si familie"
            elif obiect_canon in OBIECT_DEDUCTION_PENAL:
                 materie_canon = "Penal"
            else:
                 materie_canon = "Civil"

            materie_canon = eq_map_materii.get(materie_canon, materie_canon)

        if materie_canon and not obiect_canon:
            obiect_canon = "(fără obiect specific)"
            obiect_canon = eq_map_obiecte.get(obiect_canon, obiect_canon)

        if not materie_canon:
            materie_canon = "Necunoscut"
            materie_canon = eq_map_materii.get(materie_canon, materie_canon)

        if not obiect_canon:
            obiect_canon = "(fără obiect)"
            obiect_canon = eq_map_obiecte.get(obiect_canon, obiect_canon)

        menu_data[materie_canon].add(obiect_canon)

    # --- Pas 6: Generează mapările inverse ---
    menu_final = {
        materie: sorted(list(obiecte))
        for materie, obiecte in sorted(menu_data.items())
    }

    materii_canon_to_orig = defaultdict(set)
    for orig, canon in mapare_materii_originale.items():
        if canon:
            materii_canon_to_orig[canon].add(orig)

    obiecte_canon_to_orig = defaultdict(set)
    for orig, canon in mapare_obiecte_originale.items():
        if canon:
            obiecte_canon_to_orig[canon].add(orig)

    materii_canon_to_orig = {k: list(v) for k, v in materii_canon_to_orig.items()}
    obiecte_canon_to_orig = {k: list(v) for k, v in obiecte_canon_to_orig.items()}

    logger.info("Simplification complete.")
    return menu_final, materii_canon_to_orig, obiecte_canon_to_orig

def save_menu_data_to_db(session: Session, menu_data, materii_map, obiecte_map):
    logger.info("Saving simplified menu to the database...")

    sql = text("""
    INSERT INTO filtre_cache_menu (id, menu_data, materii_map, obiecte_map, last_updated)
    VALUES (1, :menu_data, :materii_map, :obiecte_map, NOW())
    ON CONFLICT (id) DO UPDATE SET
        menu_data = EXCLUDED.menu_data,
        materii_map = EXCLUDED.materii_map,
        obiecte_map = EXCLUDED.obiecte_map,
        last_updated = NOW();
    """)

    params = {
        "menu_data": json.dumps(menu_data),
        "materii_map": json.dumps(materii_map),
        "obiecte_map": json.dumps(obiecte_map)
    }

    session.execute(sql, params)
    session.commit()
    logger.info("Menu data saved successfully.")


def refresh_filtre_cache_simple(session: Session):
    """Rulează funcția SQL pentru a reîmprospăta 'tip_speta' și 'parte'."""
    logger.info("Refreshing simple filters cache...")
    try:
        # Folosim o funcție SQL, așa cum era în scriptul original
        # Asigură-te că funcția `refresh_filtre_cache_simple` există în DB
        session.execute(text("SELECT refresh_filtre_cache_simple();"))
        session.commit()
        logger.info("Successfully refreshed simple filters cache.")
    except Exception as e:
        logger.error(f"Error refreshing simple filters cache: {e}")
        session.rollback()
        raise

def refresh_and_reload(session: Session):
    """
    Rulează procesul COMPLET de actualizare.
    """
    logger.info("Starting the full refresh and reload process...")
    refresh_filtre_cache_simple(session)
    logger.info("Simple filters refreshed.")
    menu_data, materii_map, obiecte_map = load_and_build_menu_data(session)
    logger.info("Menu data built.")
    save_menu_data_to_db(session, menu_data, materii_map, obiecte_map)
    logger.info("Full refresh and reload process complete.")
