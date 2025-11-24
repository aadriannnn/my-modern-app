import logging
import re
import json
from collections import defaultdict
from sqlmodel import Session, select, text
from ..models import Blocuri, FiltreEchivalente, FiltreCacheMenu, FiltreCache
from .normalization import normalize_text, find_canonical_key, extract_base_obiect
from .object_clustering import (
    group_objects_by_similarity,
    select_canonical_term,
    refine_groups_with_legal_knowledge
)

# --- Chei Canonice pentru MATERII (pentru DETECȚIE) ---
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

# --- Mapare pentru AFIȘARE (Nume Profesionale) ---
DISPLAY_NAMES_MATERII = {
    # Coduri
    "Codul Civil": "Codul Civil",
    "Codul de Procedura Civila": "Codul de Procedură Civilă",
    "Codul Penal": "Codul Penal",
    "Codul de Procedura Penala": "Codul de Procedură Penală",
    "Codul Muncii": "Codul Muncii",
    "Codul de Procedura Fiscala": "Codul de Procedură Fiscală",
    "Codul Fiscal": "Codul Fiscal",
    "Codul Administrativ": "Codul Administrativ",
    "Codul Silvic": "Codul Silvic",
    "Codul Familiei": "Codul Familiei",
    "Codul Comercial": "Codul Comercial",

    # Legi - Lista Completă
    "Legea 3/1977": "Legea nr. 3/1977 privind pensiile de asigurări sociale de stat și asistență socială",
    "Legea 7/1996": "Legea cadastrului și a publicității imobiliare nr. 7/1996",
    "Legea 8/1996": "Legea nr. 8/1996 privind dreptul de autor și drepturile conexe",
    "Legea 10/2001": "Legea nr. 10/2001 privind regimul juridic al unor imobile preluate în mod abuziv în perioada 6 martie 1945 - 22 decembrie 1989",
    "Legea 11/1991": "Legea nr. 11/1991 privind combaterea concurenței neloiale",
    "Legea 14/2003": "Legea partidelor politice nr. 14/2003",
    "Legea 17/2014": "Legea nr. 17/2014 privind unele măsuri de reglementare a vânzării terenurilor agricole situate în extravilan",
    "Legea 18/1991": "Legea fondului funciar nr. 18/1991",
    "Legea 19/2000": "Legea nr. 19/2000 privind sistemul public de pensii și alte drepturi de asigurări sociale",
    "Legea 21/1991": "Legea cetățeniei române nr. 21/1991",
    "Legea 21/1996": "Legea concurenței nr. 21/1996",
    "Legea 26/2000": "Ordonanța Guvernului nr. 26/2000 cu privire la asociații și fundații",
    "Legea 31/1990": "Legea societăților nr. 31/1990",
    "Legea 33/1994": "Legea nr. 33/1994 privind exproprierea pentru cauză de utilitate publică",
    "Legea 36/1991": "Legea nr. 36/1991 privind societățile agricole și alte forme de asociere în agricultură",
    "Legea 36/1995": "Legea notarilor publici și a activității notariale nr. 36/1995",
    "Legea 39/2003": "Legea nr. 39/2003 privind prevenirea și combaterea criminalității organizate",
    "Legea 46/2003": "Legea drepturilor pacientului nr. 46/2003",
    "Legea 46/2008": "Legea nr. 46/2008 - Codul silvic",
    "Legea 47/1992": "Legea nr. 47/1992 privind organizarea și funcționarea Curții Constituționale",
    "Legea 50/1991": "Legea nr. 50/1991 privind autorizarea executării lucrărilor de construcții",
    "Legea 51/1995": "Legea nr. 51/1995 pentru organizarea și exercitarea profesiei de avocat",
    "Legea 58/1934": "Legea nr. 58/1934 asupra cambiei și biletului la ordin",
    "Legea 59/1934": "Legea nr. 59/1934 asupra cecului",
    "Legea 62/2011": "Legea dialogului social nr. 62/2011",
    "Legea 64/1991": "Legea nr. 64/1991 privind brevetele de invenție",
    "Legea 71/2011": "Legea nr. 71/2011 pentru punerea în aplicare a Legii nr. 287/2009 privind Codul civil",
    "Legea 76/2002": "Legea nr. 76/2002 privind sistemul asigurărilor pentru șomaj și stimularea ocupării forței de muncă",
    "Legea 77/2016": "Legea nr. 77/2016 privind darea în plată a unor bunuri imobile în vederea stingerii obligațiilor asumate prin credite",
    "Legea 78/2000": "Legea nr. 78/2000 pentru prevenirea, descoperirea și sancționarea faptelor de corupție",
    "Legea 84/1998": "Legea nr. 84/1998 privind mărcile și indicațiile geografice",
    "Legea 85/2006": "Legea nr. 85/2006 privind procedura insolvenței",
    "Legea 85/2014": "Legea nr. 85/2014 privind procedurile de prevenire a insolvenței și de insolvență",
    "Legea 86/2006": "Legea nr. 86/2006 privind Codul vamal al României",
    "Legea 95/2006": "Legea nr. 95/2006 privind reforma în domeniul sănătății",
    "Legea 112/1995": "Legea nr. 112/1995 pentru reglementarea situației juridice a unor imobile cu destinația de locuințe, trecute în proprietatea statului",
    "Legea 115/2015": "Legea nr. 115/2015 pentru alegerea autorităților administrației publice locale",
    "Legea 118/2019": "Legea nr. 118/2019 privind Registrul național automatizat cu privire la persoanele care au comis infracțiuni sexuale",
    "Legea 119/1996": "Legea nr. 119/1996 cu privire la actele de stare civilă",
    "Legea 129/1992": "Legea nr. 129/1992 privind protecția desenelor și modelelor industriale",
    "Legea 129/2019": "Legea nr. 129/2019 pentru prevenirea și combaterea spălării banilor și finanțării terorismului",
    "Legea 132/2017": "Legea nr. 132/2017 privind asigurarea obligatorie de răspundere civilă auto",
    "Legea 136/1995": "Legea nr. 136/1995 privind asigurările și reasigurările în România",
    "Legea 143/2000": "Legea nr. 143/2000 privind prevenirea și combaterea traficului și consumului ilicit de droguri",
    "Legea 161/2003": "Legea nr. 161/2003 privind unele măsuri pentru asigurarea transparenței în exercitarea demnităților publice",
    "Legea 165/2013": "Legea nr. 165/2013 privind măsurile pentru finalizarea procesului de restituire, în natură sau prin echivalent, a imobilelor preluate în mod abuziv",
    "Legea 169/1997": "Legea nr. 169/1997 pentru modificarea și completarea Legii fondului funciar nr. 18/1991",
    "Legea 176/2010": "Legea nr. 176/2010 privind integritatea în exercitarea funcțiilor și demnităților publice",
    "Legea 187/2012": "Legea nr. 187/2012 pentru punerea în aplicare a Legii nr. 286/2009 privind Codul penal",
    "Legea 192/2006": "Legea nr. 192/2006 privind medierea și organizarea profesiei de mediator",
    "Legea 193/2000": "Legea nr. 193/2000 privind clauzele abuzive din contractele încheiate între profesioniști și consumatori",
    "Legea 194/2002": "Legea nr. 194/2002 privind regimul străinilor în România",
    "Legea 196/2018": "Legea nr. 196/2018 privind înființarea, organizarea și funcționarea asociațiilor de proprietari și administrarea condominiilor",
    "Legea 207/2015": "Legea nr. 207/2015 privind Codul de procedură fiscală",
    "Legea 208/2015": "Legea nr. 208/2015 privind alegerea Senatului și a Camerei Deputaților",
    "Legea 211/2004": "Legea nr. 211/2004 privind unele măsuri pentru asigurarea protecției victimelor infracțiunilor",
    "Legea 213/2015": "Legea nr. 213/2015 privind Fondul de Garantare a Asiguraților",
    "Legea 217/2003": "Legea nr. 217/2003 pentru prevenirea și combaterea violenței în familie",
    "Legea 221/2009": "Legea nr. 221/2009 privind condamnările cu caracter politic și măsurile administrative asimilate acestora",
    "Legea 223/2015": "Legea nr. 223/2015 privind pensiile militare de stat",
    "Legea 230/2007": "Legea nr. 230/2007 privind înființarea, organizarea și funcționarea asociațiilor de proprietari",
    "Legea 241/2005": "Legea nr. 241/2005 pentru prevenirea și combaterea evaziunii fiscale",
    "Legea 248/2005": "Legea nr. 248/2005 privind regimul liberei circulații a cetățenilor români în străinătate",
    "Legea 253/2013": "Legea nr. 253/2013 privind executarea pedepselor, a măsurilor educative și a altor măsuri neprivative de libertate",
    "Legea 254/2013": "Legea nr. 254/2013 privind executarea pedepselor și a măsurilor privative de libertate",
    "Legea 255/2010": "Legea nr. 255/2010 privind exproprierea pentru cauză de utilitate publică",
    "Legea 263/2010": "Legea nr. 263/2010 privind sistemul unitar de pensii publice",
    "Legea 272/2004": "Legea nr. 272/2004 privind protecția și promovarea drepturilor copilului",
    "Legea 273/2004": "Legea nr. 273/2004 privind procedura adopției",
    "Legea 292/2011": "Legea asistenței sociale nr. 292/2011",
    "Legea 297/2004": "Legea nr. 297/2004 privind piața de capital",
    "Legea 302/2004": "Legea nr. 302/2004 privind cooperarea judiciară internațională în materie penală",
    "Legea 303/2004": "Legea nr. 303/2004 privind statutul judecătorilor și procurorilor",
    "Legea 331/2024": "Legea nr. 331/2024 privind responsabilitatea parentală",
    "Legea 341/2004": "Legea recunoștinței pentru victoria Revoluției Române din Decembrie 1989 nr. 341/2004",
    "Legea 350/2007": "Legea nr. 350/2001 privind amenajarea teritoriului și urbanismul",
    "Legea 360/2023": "Legea nr. 360/2023 privind sistemul public de pensii",
    "Legea 365/2002": "Legea nr. 365/2002 privind comerțul electronic",
    "Legea 367/2022": "Legea dialogului social nr. 367/2022",
    "Legea 422/2001": "Legea nr. 422/2001 privind protejarea monumentelor istorice",
    "Legea 448/2006": "Legea nr. 448/2006 privind protecția și promovarea drepturilor persoanelor cu handicap",
    "Legea 487/2002": "Legea sănătății mintale și a protecției persoanelor cu tulburări psihice nr. 487/2002",
    "Legea 554/2004": "Legea contenciosului administrativ nr. 554/2004",
    "Legea 678/2001": "Legea nr. 678/2001 privind prevenirea și combaterea traficului de persoane",

    "Ordonanta 2/2001": "Ordonanța Guvernului nr. 2/2001 privind regimul juridic al contravențiilor",
    "Ordonanta 5/2001": "Ordonanța Guvernului nr. 5/2001 privind procedura somației de plată",
    "Ordonanta de urgenta 195/2002": "O.U.G. nr. 195/2002 privind circulația pe drumurile publice",
    "Regulamentul 679/2016": "Regulamentul (UE) 2016/679 (GDPR)",

    # Categorii generale
    "Contencios administrativ si fiscal": "Contencios administrativ și fiscal",
    "Contencios administrativ": "Contencios administrativ",
    "Asigurari sociale": "Asigurări sociale",
    "Litigii de munca": "Litigii de muncă",
    "Minori si familie": "Minori și familie",
    "Proprietate Intelectuala": "Proprietate Intelectuală",
    "Litigii cu profesionistii": "Litigii cu profesioniștii",
    "Penal": "Penal",
    "Civil": "Civil"
}

# --- Ordine de Prioritate la Afișare ---
MATERII_PRIORITY_ORDER = [
    "Codul Civil",
    "Codul de Procedură Civilă",
    "Codul Penal",
    "Codul de Procedură Penală",
    "Codul Muncii",
    "Codul Administrativ",
    "Codul Comercial",
    "Codul de Procedură Fiscală",
    "Codul Familiei",
    "Codul Fiscal",
    "Codul Silvic"
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

    logger.info("Step B: Extracting unique materie-obiect pairs and their counts from 'blocuri' table...")
    query = text("""
        SELECT
            NULLIF(TRIM(obj->>'materie'), '') AS materie_orig,
            NULLIF(TRIM(obj->>'obiect'), '') AS obiect_orig,
            COUNT(*) AS count
        FROM blocuri
        WHERE NULLIF(TRIM(obj->>'materie'), '') IS NOT NULL OR NULLIF(TRIM(obj->>'obiect'), '') IS NOT NULL
        GROUP BY materie_orig, obiect_orig;
    """)
    rows = session.exec(query).all()
    logger.info(f"Found {len(rows)} unique materie-obiect pairs with counts.")

    if not rows:
        logger.warning("No materie-obiect pairs found. The menu will be empty.")
        return {}, {}, {}

    logger.info("Step C: Starting simplification and canonicalization process...")

    mapare_materii_originale = {}
    mapare_obiecte_originale = {}
    counts = {}

    # Pas 3: Generează mapările canonice și agregă numărul de spețe
    for materie_orig, obiect_orig, count in rows:
        # Mapare materie
        if materie_orig not in mapare_materii_originale:
            mapare_materii_originale[materie_orig] = find_canonical_key(materie_orig, CANONICAL_MAP_MATERII)

        # Mapare obiect (initial cu regex-based extraction)
        if obiect_orig not in mapare_obiecte_originale:
            canon_key = find_canonical_key(obiect_orig, CANONICAL_MAP_OBIECTE)
            mapare_obiecte_originale[obiect_orig] = canon_key if canon_key else extract_base_obiect(obiect_orig)

        # Stochează numărul de spețe pentru perechea originală
        counts[(materie_orig, obiect_orig)] = count

    # --- NOU: Pas 4: Aplică echivalențele peste mapările generate ---
    for orig, cod_canon in mapare_materii_originale.items():
        if cod_canon in eq_map_materii:
            mapare_materii_originale[orig] = eq_map_materii[cod_canon]

    for orig, cod_canon in mapare_obiecte_originale.items():
        if cod_canon in eq_map_obiecte:
            mapare_obiecte_originale[orig] = eq_map_obiecte[cod_canon]

    # Pas 5: Construiește meniul intermediar agregând numărul de spețe
    menu_data_intermediate = defaultdict(lambda: defaultdict(int))
    for (materie_orig, obiect_orig), count in counts.items():
        materie_canon = mapare_materii_originale.get(materie_orig)
        obiect_canon = mapare_obiecte_originale.get(obiect_orig)

        # Logica de deducere a materiei
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

        # Fallback-uri
        materie_canon = materie_canon or eq_map_materii.get("Necunoscut", "Necunoscut")
        obiect_canon = obiect_canon or eq_map_obiecte.get("(fără obiect)", "(fără obiect)")

        # --- APLICARE NUME PROFESIONALE (DISPLAY NAMES) ---
        # Aici transformăm cheia canonică scurtă în numele lung, profesional
        if materie_canon in DISPLAY_NAMES_MATERII:
            materie_canon = DISPLAY_NAMES_MATERII[materie_canon]
        elif materie_canon.startswith("Legea ") and "/" in materie_canon and "nr." not in materie_canon:
             # Auto-fix simplu pentru legi care nu sunt în mapare: "Legea 1/2000" -> "Legea nr. 1/2000"
             materie_canon = materie_canon.replace("Legea ", "Legea nr. ")

        menu_data_intermediate[materie_canon][obiect_canon] += count

    # ===== ADVANCED CLUSTERING: Group similar objects per materie =====
    logger.info("Step D: Applying intelligent object clustering per materie...")

    # Data structures for final grouping
    menu_data_final = defaultdict(lambda: defaultdict(int))
    obiecte_canon_to_orig_clustered = defaultdict(set)

    for materie, obiecte_counts in menu_data_intermediate.items():
        # Get all unique objects for this materie
        unique_obiecte = list(obiecte_counts.keys())

        if len(unique_obiecte) <= 1:
            # No clustering needed for single object
            for obj, count in obiecte_counts.items():
                menu_data_final[materie][obj] = count
                # Map original objects to this canonical
                for orig_obj, canon_obj in mapare_obiecte_originale.items():
                    if canon_obj == obj:
                        obiecte_canon_to_orig_clustered[obj].add(orig_obj)
            continue

        logger.info(f"Clustering {len(unique_obiecte)} objects for materie '{materie}'...")

        # Apply clustering algorithm
        clustered_groups = group_objects_by_similarity(
            unique_obiecte,
            threshold=0.85,  # Can be adjusted based on testing
            max_group_size=50
        )

        # Apply legal domain knowledge refinement
        clustered_groups = refine_groups_with_legal_knowledge(clustered_groups, materie)

        # For each cluster, select canonical term and aggregate counts
        for variants in clustered_groups.values():
            # Select the best representative term
            canonical_term = select_canonical_term(variants)

            # Override with manual equivalence if exists
            if canonical_term in eq_map_obiecte:
                canonical_term = eq_map_obiecte[canonical_term]

            # Aggregate counts for all variants in this cluster
            total_count = sum(obiecte_counts.get(variant, 0) for variant in variants)
            menu_data_final[materie][canonical_term] = total_count

            # Map all original objects that led to ANY variant in this cluster
            for variant in variants:
                for orig_obj, canon_obj in mapare_obiecte_originale.items():
                    if canon_obj == variant:
                        obiecte_canon_to_orig_clustered[canonical_term].add(orig_obj)

        logger.info(f"Clustered {len(unique_obiecte)} objects -> {len(clustered_groups)} groups for '{materie}'")

    # Pas 6: Formatează datele conform noii structuri specificate

    # 6.1: Generează `details` și calculează totalurile pentru `materii`
    details = {}
    materii_counts = defaultdict(int)
    for materie, obiecte_counts in menu_data_final.items():
        obiecte_list_for_materie = [
            {"name": obiect, "count": count}
            for obiect, count in sorted(obiecte_counts.items(), key=lambda item: item[1], reverse=True)
        ]
        details[materie] = obiecte_list_for_materie
        materii_counts[materie] = sum(item['count'] for item in obiecte_list_for_materie)

    # Funcție de sortare personalizată pentru materii
    def get_materie_sort_key(item):
        name, count = item
        if name in MATERII_PRIORITY_ORDER:
            # Returnează indexul din lista de prioritate (0, 1, 2...)
            # Folosim un tuplu (0, index) pentru a le pune primele
            return (0, MATERII_PRIORITY_ORDER.index(name))
        # Pentru restul, sortăm după număr (descrescător)
        # Folosim (1, -count) pentru a le pune după cele prioritare
        return (1, -count)

    materii_list = [
        {"name": name, "count": count}
        for name, count in sorted(materii_counts.items(), key=get_materie_sort_key)
    ]

    # 6.2: Generează lista globală de `obiecte`
    obiecte_global_counts = defaultdict(int)
    for obiecte_counts in menu_data_final.values():
        for obiect, count in obiecte_counts.items():
            obiecte_global_counts[obiect] += count

    obiecte_list = [
        {"name": name, "count": count}
        for name, count in sorted(obiecte_global_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    # 6.3: Construiește obiectul final
    menu_final = {
        "materii": materii_list,
        "obiecte": obiecte_list,
        "details": details
    }

    # Build materii mapping (unchanged)
    materii_canon_to_orig = defaultdict(set)
    for orig, canon in mapare_materii_originale.items():
        if canon:
            materii_canon_to_orig[canon].add(orig)

    materii_canon_to_orig = {k: list(v) for k, v in materii_canon_to_orig.items()}
    obiecte_canon_to_orig_final = {k: list(v) for k, v in obiecte_canon_to_orig_clustered.items()}

    logger.info("Step C: Simplification and canonicalization complete.")
    logger.info(f"Final object groups: {len(obiecte_canon_to_orig_final)}")
    logger.info("--- Menu Data Build Process Finished ---")
    return menu_final, materii_canon_to_orig, obiecte_canon_to_orig_final

def save_menu_data_to_db(session: Session, menu_data, materii_map, obiecte_map):
    logger.info("--- Saving Menu Data to Database ---")

    dialect = session.bind.dialect.name
    timestamp_func = "NOW()" if dialect == 'postgresql' else "datetime('now')"

    # Use a simple SELECT to check for existence, then INSERT or UPDATE.
    # This avoids ON CONFLICT which is not universally supported in the same way.
    existing_entry = session.get(FiltreCacheMenu, 1)

    if existing_entry:
        logger.info("Updating existing menu cache entry (ID=1).")
        existing_entry.menu_data = menu_data
        existing_entry.materii_map = materii_map
        existing_entry.obiecte_map = obiecte_map
        # The last_updated field will be handled by the database if it has a default.
        # If not, we would need to set it manually. For now, we assume a schema default
        # or that manual update isn't strictly necessary on every save for SQLite.
    else:
        logger.info("Creating new menu cache entry (ID=1).")
        # last_updated is not included here to let the DB handle it.
        # For SQLite, this means it will likely be NULL if no default is set.
        new_entry = FiltreCacheMenu(
            id=1,
            menu_data=menu_data,
            materii_map=materii_map,
            obiecte_map=obiecte_map
        )
        session.add(new_entry)

    # We must also update the timestamp using a raw query, as the model doesn't auto-update it
    update_time_sql = text(f"UPDATE filtre_cache_menu SET last_updated = {timestamp_func} WHERE id = 1")

    session.commit() # Commit the data changes
    session.execute(update_time_sql) # Execute the raw SQL for the timestamp
    session.commit() # Commit the timestamp change

    logger.info("--- Menu Data Saved Successfully ---")

def refresh_filtre_cache_simple(session: Session):
    """Calculează și inserează filtrele simple (tip_speta, parte, etc.)."""
    logger.info("--- Simple Filters Cache Refresh Started ---")
    try:
        logger.info("Step 1: Deleting old data from 'filtre_cache'.")
        session.execute(text("DELETE FROM filtre_cache"))

        filtre_de_extras = [
            ("tip_speta", "COALESCE(obj->>'tip_speta', obj->>'tip', obj->>'categorie_speta', obj->>'tip_cauza', obj->>'categorie')"),
            ("parte", "COALESCE(obj->>'parte', obj->>'nume_parte', obj->>'parti', obj->>'reclamant')"),
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
