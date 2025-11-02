import logging
import re
import json
from collections import defaultdict
from sqlmodel import Session, select, text
from ..models import Blocuri, FiltreEchivalente, FiltreCacheMenu, FiltreCache
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

logger = logging.getLogger(__name__)

def load_and_build_menu_data(session: Session):
    logger.info("--- Menu Data Build Process Started ---")

    logger.info("Step A: Loading term equivalences from 'filtre_echivalente'...")
    eq_map_materii = {}
    eq_map_obiecte = {}
    equivalences = session.exec(select(FiltreEchivalente)).all()
    for eq in equivalences:
        if eq.type == 'materie':
            eq_map_materii[eq.term_canonic_original] = eq.term_preferat
        elif eq.type == 'obiect':
            eq_map_obiecte[eq.term_canonic_original] = eq.term_preferat
    logger.info(f"Loaded {len(eq_map_materii)} 'materie' and {len(eq_map_obiecte)} 'obiect' equivalences.")

    logger.info("Step B: Extracting unique materie-obiect pairs from 'blocuri' table...")
    query = text("""
        SELECT DISTINCT
            NULLIF(TRIM(obj->>'materie'), '') AS materie_orig,
            NULLIF(TRIM(obj->>'obiect'), '') AS obiect_orig
        FROM blocuri
        WHERE NULLIF(TRIM(obj->>'materie'), '') IS NOT NULL OR NULLIF(TRIM(obj->>'obiect'), '') IS NOT NULL;
    """)
    rows = session.exec(query).all()
    logger.info(f"Found {len(rows)} unique materie-obiect pairs.")

    if not rows:
        logger.warning("No materie-obiect pairs found. The menu will be empty.")
        return {}, {}, {}

    logger.info("Step C: Starting simplification and canonicalization process...")

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

    logger.info("Step C: Simplification and canonicalization complete.")
    logger.info("--- Menu Data Build Process Finished ---")
    return menu_final, materii_canon_to_orig, obiecte_canon_to_orig

def save_menu_data_to_db(session: Session, menu_data, materii_map, obiecte_map):
    logger.info("--- Saving Menu Data to Database ---")
    logger.info(f"Menu data contains {len(menu_data)} materii.")
    logger.info(f"Materii map contains {len(materii_map)} entries.")
    logger.info(f"Obiecte map contains {len(obiecte_map)} entries.")

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
    logger.info("--- Menu Data Saved Successfully ---")


def refresh_filtre_cache_simple(session: Session):
    """Calculează și inserează filtrele simple (tip_speta, parte, etc.)."""
    logger.info("--- Simple Filters Cache Refresh Started ---")
    try:
        logger.info("Step 1: Deleting old data from 'filtre_cache'.")
        session.execute(text("DELETE FROM filtre_cache"))

        filtre_de_extras = [
            ("tip_speta", "COALESCE(obj->>'tip_speta', obj->>'tip', obj->>'categorie_speta')"),
            ("parte", "COALESCE(obj->>'parte', obj->>'nume_parte')"),
        ]

        for nume_filtru, json_fields in filtre_de_extras:
            logger.info(f"Step 2: Extracting distinct values for '{nume_filtru}'...")
            query = text(f"""
                SELECT DISTINCT NULLIF(TRIM({json_fields}), '')
                FROM blocuri
                WHERE NULLIF(TRIM({json_fields}), '') IS NOT NULL;
            """)
            valori = session.execute(query).scalars().all()
            logger.info(f"Found {len(valori)} raw values for '{nume_filtru}'.")

            if nume_filtru == 'parte':
                parti_unice = set()
                for item in valori:
                    parti_split = re.split(r'\s*[,/]\s*', item)
                    for parte in parti_split:
                        if parte:
                            parti_unice.add(parte.strip())
                valori_procesate = sorted(list(parti_unice))
                logger.info(f"Processed into {len(valori_procesate)} unique, split values for 'parte'.")
            else:
                valori_procesate = sorted(valori)

            for valoare in valori_procesate:
                cache_entry = FiltreCache(tip=nume_filtru, valoare=valoare)
                session.add(cache_entry)

        logger.info("Step 3: Committing new simple filter data to the database.")
        session.commit()
        logger.info("--- Simple Filters Cache Refresh Finished Successfully ---")
    except Exception as e:
        logger.error(f"Error refreshing simple filters cache: {e}", exc_info=True)
        session.rollback()
        raise

def refresh_and_reload(session: Session):
    """
    Rulează procesul COMPLET de actualizare.
    """
    logger.info("--- Full Filter Refresh and Reload Process Started ---")

    logger.info("Executing Python function 'refresh_filtre_cache_simple' for all DB types.")
    refresh_filtre_cache_simple(session)

    logger.info("Simple filters cache has been refreshed.")

    logger.info("Proceeding to build and save the main menu data...")
    menu_data, materii_map, obiecte_map = load_and_build_menu_data(session)
    save_menu_data_to_db(session, menu_data, materii_map, obiecte_map)

    logger.info("--- Full Filter Refresh and Reload Process Finished ---")
