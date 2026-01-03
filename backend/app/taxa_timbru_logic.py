# backend/app/taxa_timbru_logic.py
# -*- coding: utf-8 -*-
"""
Implementează logica de calcul detaliată pentru taxa judiciară de timbru
conform OUG 80/2013, pe baza specificațiilor din prompt și a datelor din taxa_timbru_data.py.
"""
import logging
import math
import re
from typing import List, Dict, Any, Optional, Tuple, Union
from pydantic import BaseModel, Field, ValidationError
from app.lib.analyzer.llm_client import LLMClient
from .schemas import SugestieIncadrareLLMResponse

# Importăm constantele și datele din fișierul separat
try:
    from .taxa_timbru_data import (
        TIPURI_CERERI, DATA_ULTIMA_ACTUALIZARE_VALORI,
        TAXA_MINIMA_ART3_1, TAXA_20_LEI, TAXA_50_LEI, TAXA_100_LEI, TAXA_200_LEI, TAXA_300_LEI, TAXA_1000_LEI,
        TAXA_COPIE_SIMPLA_PAG, TAXA_LEGALIZARE_PAG_EX, TAXA_CERTIFICAT_PAG, TAXA_COPIE_HOT_DEF_EX,
        TAXA_SUPRALEGALIZARE_MJ_INSCRIS, TAXA_STABILIRE_CALITATE_PERS,
        BAREM_ART31_PRAG1, BAREM_ART31_PROC1, BAREM_ART31_TAXA1_MIN,
        BAREM_ART31_PRAG2, BAREM_ART31_TAXA_FIXA2, BAREM_ART31_PROC2,
        BAREM_ART31_PRAG3, BAREM_ART31_TAXA_FIXA3, BAREM_ART31_PROC3,
        BAREM_ART31_PRAG4, BAREM_ART31_TAXA_FIXA4, BAREM_ART31_PROC4,
        BAREM_ART31_PRAG5, BAREM_ART31_TAXA_FIXA5, BAREM_ART31_PROC5,
        BAREM_ART31_TAXA_FIXA6, BAREM_ART31_PROC6,
        CONT_ADM_PATRIM_PROC, CONT_ADM_PATRIM_PLAFON,
        TAXA_VALOARE_REDUSA_PRAG, TAXA_VALOARE_REDUSA_S1, TAXA_VALOARE_REDUSA_S2,
        TAXA_REPUNERE_SITUATIE_PRAG, TAXA_REPUNERE_SITUATIE_S1, TAXA_REPUNERE_SITUATIE_S2,
        TAXA_ORD_PRESED_EVAL_PRAG, TAXA_ORD_PRESED_EVAL_S1, TAXA_ORD_PRESED_EVAL_S2, TAXA_ORD_PRESED_NEVAL
    )
    # Importați TipCerereTaxaOption dacă este definit în models.py
    from .schemas import TipCerereTaxaOption # Asigurați-vă că acest model există în schemas.py
except ImportError as e:
    logging.critical(f"CRITICAL ERROR: Nu se poate importa taxa_timbru_data.py sau modelele necesare: {e}!") #
    TIPURI_CERERI = {} #
    DATA_ULTIMA_ACTUALIZARE_VALORI = "NECUNOSCUTĂ" #
    TAXA_MINIMA_ART3_1 = 20.0; TAXA_20_LEI = 20.0; TAXA_50_LEI = 50.0; TAXA_100_LEI = 100.0; TAXA_200_LEI = 200.0; TAXA_300_LEI = 300.0; TAXA_1000_LEI = 1000.0; #
    TAXA_COPIE_SIMPLA_PAG = 0.20; TAXA_LEGALIZARE_PAG_EX = 1.0; TAXA_CERTIFICAT_PAG = 1.0; TAXA_COPIE_HOT_DEF_EX = 5.0; TAXA_SUPRALEGALIZARE_MJ_INSCRIS = 10.0; TAXA_STABILIRE_CALITATE_PERS = 50.0; #
    BAREM_ART31_PRAG1 = 500.0; BAREM_ART31_PROC1 = 0.08; BAREM_ART31_TAXA1_MIN = 20.0; BAREM_ART31_PRAG2 = 5000.0; BAREM_ART31_TAXA_FIXA2 = 40.0; BAREM_ART31_PROC2 = 0.07; #
    BAREM_ART31_PRAG3 = 25000.0; BAREM_ART31_TAXA_FIXA3 = 355.0; BAREM_ART31_PROC3 = 0.05; BAREM_ART31_PRAG4 = 50000.0; BAREM_ART31_TAXA_FIXA4 = 1355.0; BAREM_ART31_PROC4 = 0.03; #
    BAREM_ART31_PRAG5 = 250000.0; BAREM_ART31_TAXA_FIXA5 = 2105.0; BAREM_ART31_PROC5 = 0.02; BAREM_ART31_TAXA_FIXA6 = 6105.0; BAREM_ART31_PROC6 = 0.01; CONT_ADM_PATRIM_PROC = 0.10; #
    CONT_ADM_PATRIM_PLAFON = 300.0; TAXA_VALOARE_REDUSA_PRAG = 2000.0; TAXA_VALOARE_REDUSA_S1 = 50.0; TAXA_VALOARE_REDUSA_S2 = 200.0; TAXA_REPUNERE_SITUATIE_PRAG = 5000.0; TAXA_REPUNERE_SITUATIE_S1 = 50.0; #
    TAXA_REPUNERE_SITUATIE_S2 = 300.0; TAXA_ORD_PRESED_EVAL_PRAG = 2000.0; TAXA_ORD_PRESED_EVAL_S1 = 50.0; TAXA_ORD_PRESED_EVAL_S2 = 200.0; #
    TAXA_ORD_PRESED_NEVAL = 20.0 #
    # Definiție fallback pentru TipCerereTaxaOption dacă importul eșuează
    class TipCerereTaxaOption(BaseModel): #
        id_intern: str #
        nume_standard: str #
        categorie: str #
        articol_referinta: Optional[str] = None #
        evaluabil: Optional[bool] = None #
        necesita_valoare_obiect: Optional[bool] = None #


logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s') #
logger = logging.getLogger(__name__) #

try:
    from .schemas import CapatCerereInput, DateGeneraleInput #
    # TipCerereTaxaOption este deja importat mai sus sau definit în fallback
except ImportError:
    logger.warning("Nu s-au putut importa modelele Pydantic CapatCerereInput/DateGeneraleInput din .models. Se definesc local.") #
    class CapatCerereInput(BaseModel): #
        id_intern: str #
        Valoare_Obiect: Optional[float] = None #
        Valoare_Bun_Imobil: Optional[float] = None #
        Numar_Coproprietari_Mostenitori: Optional[int] = None #
        Tip_Divort: Optional[str] = None #
        Este_Contestatie_Executare_Pe_Fond: Optional[bool] = None #
        Valoare_Bunuri_Contestate_Executare: Optional[float] = None #
        Valoare_Debit_Urmarit_Executare: Optional[float] = None #
        Numar_Pagini: Optional[int] = None #
        Numar_Exemplare: Optional[int] = None #
        Numar_Inscrise_Supralegalizare: Optional[int] = None #
        Numar_Participanti_Recuzati: Optional[int] = None #
        Contine_Transfer_Imobiliar: Optional[bool] = None #
        Contine_Partaj: Optional[bool] = None #
        Numar_Motive_Revizuire: Optional[int] = None #
        Numar_Motive_Anulare_Arbitraj: Optional[int] = None #
        Este_Nava_Aeronava: Optional[bool] = None #
        Este_Ordonanta_UE_Indisponibilizare: Optional[bool] = None #
        Valoare_Creanta_Creditor: Optional[float] = None #
        Valoare_Afectata_Prin_Act_Fraudulos: Optional[float] = None #
        Valoare_Obiect_Subiacent: Optional[float] = None #
        Este_Evaluabil: Optional[bool] = None #
        Este_Cale_Atac_Doar_Considerente: Optional[bool] = None #
        Motive_Recurs_Invocate: Optional[List[str]] = [] #
        Valoare_Contestata_Recurs: Optional[float] = None #
        class Config: #
            extra = 'ignore' #

    class DateGeneraleInput(BaseModel): #
        Filtru_Proces_Vechi: bool = False #
        Aplica_Scutire: bool = False #
        Temei_Scutire_Selectat: Optional[str] = None #
        Taxa_Achitata_Prima_Instanta: Optional[float] = None #
        Stadiu_Procesual: Optional[str] = None #
        class Config: #
            extra = 'ignore' #

def aplica_barem_art_3_1(valoare: Optional[Union[float, int]]) -> float: #
    """Calculează taxa conform baremului din Art. 3(1) OUG 80/2013.""" #
    if not isinstance(valoare, (int, float)) or valoare < 0: #
        logger.warning(f"Valoare invalidă ({valoare}) pentru barem Art. 3(1). Se aplică taxa minimă {TAXA_MINIMA_ART3_1} lei.") #
        return TAXA_MINIMA_ART3_1 #
    val = float(valoare) #
    if val <= BAREM_ART31_PRAG1: #
        taxa_calculata = val * BAREM_ART31_PROC1 #
        return max(taxa_calculata, BAREM_ART31_TAXA1_MIN) #
    elif val <= BAREM_ART31_PRAG2: #
        return BAREM_ART31_TAXA_FIXA2 + (val - BAREM_ART31_PRAG1) * BAREM_ART31_PROC2 #
    elif val <= BAREM_ART31_PRAG3: #
        return BAREM_ART31_TAXA_FIXA3 + (val - BAREM_ART31_PRAG2) * BAREM_ART31_PROC3 #
    elif val <= BAREM_ART31_PRAG4: #
        return BAREM_ART31_TAXA_FIXA4 + (val - BAREM_ART31_PRAG3) * BAREM_ART31_PROC4 #
    elif val <= BAREM_ART31_PRAG5: #
        return BAREM_ART31_TAXA_FIXA5 + (val - BAREM_ART31_PRAG4) * BAREM_ART31_PROC5 #
    else:
        return BAREM_ART31_TAXA_FIXA6 + (val - BAREM_ART31_PRAG5) * BAREM_ART31_PROC6 #

def obtine_info_regula(id_intern: str) -> Optional[Dict[str, Any]]: #
    if not TIPURI_CERERI: #
         logger.error("Baza de date TIPURI_CERERI este goală sau nu a fost încărcată.") #
         return None #
    info = TIPURI_CERERI.get(id_intern) #
    if not info: #
        logger.error(f"ID intern '{id_intern}' nu a fost găsit în TIPURI_CERERI.") #
    return info #

def obtine_valoare_baza_din_calcul(detaliere_string: str, tip: str = 'general') -> Optional[float]: #
    if not detaliere_string: #
        return None #
    try:
        if tip == 'partaj': #
            match = re.search(r"\[Valoare\s+Bază\s*=\s*([\d\.,]+)\s*lei\]", detaliere_string, re.IGNORECASE) #
            if match: #
                val_str = match.group(1).replace('.', '').replace(',', '.') #
                return float(val_str) #
        else:
             match = re.search(r"(?:la\s+valoarea|Baz[aă]\s+calcul)\s*[:=]?\s*([\d\.,]+)\s*lei", detaliere_string, re.IGNORECASE) #
             if match: #
                val_str = match.group(1).replace('.', '').replace(',', '.') #
                return float(val_str) #
    except (ValueError, IndexError, AttributeError) as e: #
        logger.warning(f"Nu s-a putut extrage valoarea de bază din detaliere (tip '{tip}'): '{detaliere_string}'. Eroare: {e}") #
    except Exception as e_gen: #
         logger.error(f"Eroare generală la extragerea valorii de bază: {e_gen}", exc_info=True) #
    logger.debug(f"Nu s-a găsit Valoare Bază în detalierea (tip '{tip}'): '{detaliere_string}'") #
    return None #

# ===================================================================================
# FUNCȚIE ADĂUGATĂ PENTRU A OBȚINE LISTA TIPURILOR DE CERERI PENTRU ENDPOINT
# ===================================================================================
def get_tipuri_cereri_taxa() -> List[TipCerereTaxaOption]: #
    """
    Returnează o listă formatată a tipurilor de cereri pentru taxa de timbru,
    structurată conform modelului TipCerereTaxaOption.
    """
    if not TIPURI_CERERI: #
        logger.warning("TIPURI_CERERI este gol sau nu a fost încărcat. Se returnează listă goală.") #
        return [] #

    # MODIFICARE: Verificare explicită a tipului pentru TIPURI_CERERI
    if not isinstance(TIPURI_CERERI, dict):
        logger.error(
            f"EROARE CRITICĂ: TIPURI_CERERI este de tipul {type(TIPURI_CERERI)} în loc de dicționar în funcția get_tipuri_cereri_taxa. " #
            f"Acest lucru indică o problemă de stare a aplicației sau o modificare neașteptată a variabilei. " #
            f"Se returnează listă goală pentru a preveni un crash." #
        )
        return [] #

    options_list: List[TipCerereTaxaOption] = [] #
    try:
        for id_intern, details in TIPURI_CERERI.items(): # .items() este acum mai sigur #
            try:
                # Construim un dicționar cu datele pentru TipCerereTaxaOption
                # Cheile trebuie să corespundă cu câmpurile din modelul Pydantic TipCerereTaxaOption
                option_data = { #
                    "id_intern": id_intern, #
                    "nume_standard": details.get("nume_standard", "N/A"), # Obligatoriu în model #
                    "categorie": details.get("categorie", "Necategorisit"), # Obligatoriu în model #
                    "articol_referinta": details.get("articol_referinta"), # Opțional în model #
                    "evaluabil": details.get("evaluabil", None), # Opțional în model #
                    # Presupunem că "necesita_valoare_obiect" este un boolean în modelul TipCerereTaxaOption
                    "necesita_valoare_obiect": "Valoare_Obiect" in details.get("campuri_necesare", []), #
                    "campuri_necesare": details.get("campuri_necesare", [])
                }
                # Validăm și creăm instanța modelului Pydantic
                options_list.append(TipCerereTaxaOption.model_validate(option_data)) #
            except ValidationError as e_val_opt: #
                logger.error(f"Eroare la validarea TipCerereTaxaOption pentru id_intern '{id_intern}': {e_val_opt}. Detalii: {details}") #
            except Exception as e_gen_opt: # Capturăm orice altă eroare la procesarea unui item #
                logger.error(f"Eroare generală la procesarea id_intern '{id_intern}' pentru get_tipuri_cereri_taxa: {e_gen_opt}. Detalii: {details}") #
    except AttributeError as e_attr_loop:
        # Acest bloc este o măsură suplimentară de siguranță, deși verificarea isinstance ar trebui să prevină acest lucru.
        logger.error(f"AttributeError în timpul iterației TIPURI_CERERI în get_tipuri_cereri_taxa: {e_attr_loop}. Tipul TIPURI_CERERI: {type(TIPURI_CERERI)}.") #
        return [] # Returnează listă goală în caz de eroare neașteptată la iterație

    # Sortare opțională pentru o afișare mai ordonată în frontend
    try:
        # Asigură-te că atributele de sortare nu sunt None pentru a evita erori
        options_list.sort(key=lambda x: (x.categorie if x.categorie is not None else "", #
                                         x.nume_standard if x.nume_standard is not None else "")) #
    except Exception as e_sort: #
        logger.warning(f"Nu s-a putut sorta lista de opțiuni tipuri cereri: {e_sort}") #

    logger.info(f"Generat {len(options_list)} opțiuni pentru tipuri de cereri taxă.") #
    return options_list #
# ==========================================
# FUNCȚIA COMPLETĂ PENTRU REGULI SPECIFICE
# ==========================================
def ruleaza_calcul_specific( #
    regula_id: str, #
    date_capat: CapatCerereInput, #
    date_generale: DateGeneraleInput #
) -> Tuple[float, str]: #
    """
    Execută logica de calcul specifică pentru un anumit capăt de cerere.
    Returnează (taxa_calculata, detaliere_calcul).
    Returnează taxa < 0 în caz de eroare.
    """
    taxa = 0.0 #
    detaliere = f"Regula aplicată: {regula_id}. " #
    valoare: Optional[float] = None #
    val_bun_imobil: Optional[float] = None #

    valoare = date_capat.Valoare_Obiect #
    val_bun_imobil = date_capat.Valoare_Bun_Imobil #

    if regula_id == "CALC_ART3_1": #
        if date_capat.Este_Evaluabil is False: #
            msg = f"EROARE Art. 3(1): Cererea '{date_capat.id_intern}' este marcată ca neevaluabilă dar folosește regula de calcul Art. 3(1)." #
            logger.error(msg) #
            return -1.0, msg #
        if valoare is None or valoare < 0: #
            msg = f"EROARE Art. 3(1): Cerere evaluabilă '{date_capat.id_intern}' necesită o valoare validă (>= 0) în câmpul 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(valoare) #
        detaliere += f"Aplicare barem Art. 3(1) OUG 80/2013 la valoarea: {valoare:,.2f} lei." #
    elif regula_id == "CALC_ART4_1": #
        if val_bun_imobil is None or val_bun_imobil <= 0: #
            msg = f"EROARE Art. 4(1) '{date_capat.id_intern}': Necesită valoarea bunului imobil (> 0) în câmpul 'Valoare_Bun_Imobil'." #
            logger.error(msg) #
            return -1.0, msg #
        valoare_calcul = val_bun_imobil * 0.20 #
        taxa = aplica_barem_art_3_1(valoare_calcul) #
        detaliere += f"Aplicare Art. 4(1) (Posesorie): Barem Art. 3(1) la 20% din valoarea bunului ({val_bun_imobil:,.2f} lei). Bază calcul = {valoare_calcul:,.2f} lei." #
    elif regula_id == "CALC_ART4_2": #
        val_relevant = val_bun_imobil #
        if val_relevant is None or val_relevant <= 0: #
            msg = f"EROARE Art. 4(2) '{date_capat.id_intern}': Necesită valoarea bunului imobil relevant (> 0) în câmpul 'Valoare_Bun_Imobil'." #
            logger.error(msg) #
            return -1.0, msg #
        valoare_calcul = val_relevant * 0.20 #
        taxa = aplica_barem_art_3_1(valoare_calcul) #
        detaliere += f"Aplicare Art. 4(2) (Dezmembr./Servitute): Barem Art. 3(1) la 20% din valoarea bunului relevant ({val_relevant:,.2f} lei). Bază calcul = {valoare_calcul:,.2f} lei." #
    elif regula_id == "CALC_ART5_1_COMP": #
        if valoare is None or valoare < 0: #
            msg = f"EROARE Art. 5(1) '{date_capat.id_intern}': Componentă partaj necesită valoare validă (>= 0) în câmpul 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa_baza = aplica_barem_art_3_1(valoare) #
        taxa = taxa_baza * 0.50 #
        detaliere += f"Componentă partaj cf. Art. 5(1) [Valoare Bază={valoare:,.2f} lei]: Taxa Art.3(1) ar fi {taxa_baza:,.2f} lei. Taxa componentă (50%) = {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART5_3": #
        nr_pers = date_capat.Numar_Coproprietari_Mostenitori #
        if nr_pers is None or nr_pers <= 0: #
            msg = f"EROARE Art. 5(3) '{date_capat.id_intern}': Necesită număr valid de persoane (> 0) în câmpul 'Numar_Coproprietari_Mostenitori'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_STABILIRE_CALITATE_PERS * nr_pers #
        detaliere += f"Aplicare Art. 5(3): Taxă fixă {TAXA_STABILIRE_CALITATE_PERS:,.2f} lei x {nr_pers} persoane." #
    # ... (restul regulilor din funcția ruleaza_calcul_specific rămân la fel ca în fișierul original)
    # Asigurați-vă că copiați restul blocurilor elif pentru toate regulile
    # de la CALC_ART6_1 până la CALC_PREDARE_REALA_MOBIL și clauza else finală
    # ...
    # --- Art. 6 ---
    elif regula_id == "CALC_ART6_1": # Valoare Redusă #
        if valoare is None or valoare < 0: #
            msg = f"EROARE Art. 6(1) '{date_capat.id_intern}': Necesită valoare validă (>= 0) în câmpul 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_VALOARE_REDUSA_S1 if valoare <= TAXA_VALOARE_REDUSA_PRAG else TAXA_VALOARE_REDUSA_S2 #
        detaliere += f"Aplicare Art. 6(1) (Valoare Redusă): Taxă fixă {taxa:,.2f} lei pentru valoarea {valoare:,.2f} lei." #
    elif regula_id == "CALC_ART6_2": # Ordonanță plată / Somație UE #
        taxa = TAXA_VALOARE_REDUSA_S2 # Aceeași valoare ca pt valoare redusă > prag #
        detaliere += f"Aplicare Art. 6(2) (Ord. Plată/Somație UE): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART6_2_1": # Opoziție Somație / Reexaminare Val Redusă #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 6(2^1) (Opoziție Somație UE/Reex. Val. Redusă): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART6_3": # Evacuare specială #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 6(3) (Evacuare Titlul XI CPC): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART6_4": # Ordonanță președințială #
        if date_capat.Este_Evaluabil is None: #
            msg = f"EROARE Art. 6(4) '{date_capat.id_intern}': Nu s-a specificat dacă ordonanța președințială este evaluabilă ('Este_Evaluabil')." #
            logger.error(msg) #
            return -1.0, msg #
        if date_capat.Este_Evaluabil: #
            if valoare is None or valoare < 0: #
                msg = f"EROARE Art. 6(4) '{date_capat.id_intern}': Ord. Președ. evaluabilă necesită valoare validă (>= 0) în câmpul 'Valoare_Obiect'." #
                logger.error(msg) #
                return -1.0, msg #
            taxa = TAXA_ORD_PRESED_EVAL_S1 if valoare <= TAXA_ORD_PRESED_EVAL_PRAG else TAXA_ORD_PRESED_EVAL_S2 #
            detaliere += f"Aplicare Art. 6(4) (Ord. Președ. Evaluabilă): Taxă {taxa:,.2f} lei pentru valoarea {valoare:,.2f} lei." #
        else:
            taxa = TAXA_ORD_PRESED_NEVAL #
            detaliere += f"Aplicare Art. 6(4) (Ord. Președ. Neevaluabilă): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 7 ---
    elif regula_id == "CALC_ART7_1": # Daune Morale #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 7(1) (Daune Morale): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART7_2": # Vătămări Integritate #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 7(2) (Vătămări Integritate): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 8 ---
    elif regula_id in ["CALC_ART8_1_ABC", "CALC_ART8_1_A_CONST_NEPATRIM", "CALC_ART8_1_B_FOLOSINTA_BUN", "CALC_ART8_1_C_INTERES_VIITOR"]: #
        taxa = TAXA_100_LEI #
        info_reg = obtine_info_regula(date_capat.id_intern) #
        context = info_reg['nume_standard'] if info_reg else regula_id #
        detaliere += f"Aplicare Art. 8(1) lit. a)/b)/c) ({context}): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART8_1_D": # Grănițuire #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 8(1) lit. d) (Grănițuire): Taxă fixă {taxa:,.2f} lei. NOTĂ: Revendicarea se taxează separat (iar Grănițuirea devine scutită)." #
    elif regula_id == "CALC_ART8_2": # Repunere situație anterioară (NEACCESORIE) #
        if valoare is None or valoare < 0: #
            msg = f"EROARE Art. 8(2) '{date_capat.id_intern}': Necesită valoare validă (>= 0) a lucrărilor/prejudiciului în 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_REPUNERE_SITUATIE_S1 if valoare <= TAXA_REPUNERE_SITUATIE_PRAG else TAXA_REPUNERE_SITUATIE_S2 #
        detaliere += f"Aplicare Art. 8(2) (Repunere neaccesorie): Taxă {taxa:,.2f} lei pentru valoarea {valoare:,.2f} lei." #
    # --- Art. 9 (Cereri Incidentale) ---
    elif regula_id == "CALC_ART9_A": # Recuzare #
        nr_pers = date_capat.Numar_Participanti_Recuzati #
        if nr_pers is None or nr_pers <= 0: #
            msg = f"EROARE Art. 9a '{date_capat.id_intern}': Necesită număr valid de participanți recuzați (> 0) în 'Numar_Participanti_Recuzati'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_100_LEI * nr_pers #
        detaliere += f"Aplicare Art. 9 lit. a) (Recuzare): Taxă {TAXA_100_LEI:,.2f} lei x {nr_pers} participanți." #
    elif regula_id == "CALC_ART9_B": # Strămutare #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 9 lit. b) (Strămutare): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id in ["CALC_ART9_CDEF", "CALC_ART9_C_REPUNERE_TERMEN", "CALC_ART9_D_CONST_PERIMARE", "CALC_ART9_E_REEX_TAXA", "CALC_ART9_F_REEX_AMENDA_ANULARE"]: #
        taxa = TAXA_20_LEI #
        info_reg = obtine_info_regula(date_capat.id_intern) #
        context = info_reg['articol_referinta'] if info_reg else "Art. 9 c-f" #
        detaliere += f"Aplicare {context}: Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART9_G": # Repunere pe rol (culpa părți) #
        taxa_initiala = date_generale.Taxa_Achitata_Prima_Instanta #
        if taxa_initiala is None or taxa_initiala < 0: #
            msg = f"EROARE Art. 9g '{date_capat.id_intern}': Necesită valoarea taxei achitate inițial (>= 0) în datele generale ('Taxa_Achitata_Prima_Instanta')." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = taxa_initiala * 0.50 #
        detaliere += f"Aplicare Art. 9 lit. g) (Repunere pe rol): 50% din taxa inițială ({taxa_initiala:,.2f} lei) = {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART9_H": # Refacere înscrisuri/hotărâri #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 9 lit. h) (Refacere înscrisuri): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART9_I": # Copii simple #
        nr_pag = date_capat.Numar_Pagini #
        if nr_pag is None or nr_pag <= 0: #
            msg = f"EROARE Art. 9i '{date_capat.id_intern}': Necesită număr valid de pagini (> 0) în 'Numar_Pagini'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_COPIE_SIMPLA_PAG * nr_pag #
        detaliere += f"Aplicare Art. 9 lit. i) (Copii simple): {TAXA_COPIE_SIMPLA_PAG:.2f} lei x {nr_pag} pagini." #
    elif regula_id == "CALC_ART9_J": # Legalizare copii #
        nr_pag = date_capat.Numar_Pagini #
        nr_ex = date_capat.Numar_Exemplare #
        if nr_pag is None or nr_pag <= 0 or nr_ex is None or nr_ex <= 0: #
            msg = f"EROARE Art. 9j '{date_capat.id_intern}': Necesită număr valid de pagini (> 0) și exemplare (> 0)." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_LEGALIZARE_PAG_EX * nr_pag * nr_ex #
        detaliere += f"Aplicare Art. 9 lit. j) (Legalizare copii): {TAXA_LEGALIZARE_PAG_EX:.2f} leu x {nr_pag} pagini x {nr_ex} exemplare." #
    elif regula_id == "CALC_ART9_K": # Certificate #
        nr_pag = date_capat.Numar_Pagini #
        if nr_pag is None or nr_pag <= 0: #
            msg = f"EROARE Art. 9k '{date_capat.id_intern}': Necesită număr valid de pagini (> 0) în 'Numar_Pagini'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_CERTIFICAT_PAG * nr_pag #
        detaliere += f"Aplicare Art. 9 lit. k) (Certificate): {TAXA_CERTIFICAT_PAG:.2f} leu x {nr_pag} pagini." #
    elif regula_id == "CALC_ART9_L": # Copii hotărâri definitive #
        nr_ex = date_capat.Numar_Exemplare #
        if nr_ex is None or nr_ex <= 0: #
            msg = f"EROARE Art. 9l '{date_capat.id_intern}': Necesită număr valid de exemplare (> 0) în 'Numar_Exemplare'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_COPIE_HOT_DEF_EX * nr_ex #
        detaliere += f"Aplicare Art. 9 lit. l) (Copii hot. definitive): {TAXA_COPIE_HOT_DEF_EX:.2f} lei x {nr_ex} exemplare." #
    # --- Art. 10 (Executare Silită) ---
    elif regula_id == "CALC_ART10_1A": # Încuviințare executare #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 10(1) lit. a) (Încuviințare executare): Taxă fixă {taxa:,.2f} lei per cerere." #
    elif regula_id == "CALC_ART10_1B": # Suspendare executare #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 10(1) lit. b) (Suspendare executare): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART10_2_3": # Contestație la executare #
        if date_capat.Este_Contestatie_Executare_Pe_Fond: #
            if valoare is None or valoare < 0: #
                msg = f"EROARE Art. 10(3) '{date_capat.id_intern}': Contestație pe fond necesită valoarea obiectului (>= 0) în 'Valoare_Obiect'." #
                logger.error(msg) #
                return -1.0, msg #
            taxa = aplica_barem_art_3_1(valoare) #
            detaliere += f"Aplicare Art. 10(3) rap. la Art. 3(1) (Contestație la executare pe fond): Calculată la valoarea fondului = {valoare:,.2f} lei." #
        else:
            if date_capat.Este_Evaluabil is None: #
                msg = f"EROARE Art. 10(2) '{date_capat.id_intern}': Nu s-a specificat dacă contestația la executare este evaluabilă ('Este_Evaluabil')." #
                logger.error(msg) #
                return -1.0, msg #
            if date_capat.Este_Evaluabil: #
                val_bunuri = date_capat.Valoare_Bunuri_Contestate_Executare #
                val_debit = date_capat.Valoare_Debit_Urmarit_Executare #
                if val_bunuri is None or val_bunuri < 0 or val_debit is None or val_debit < 0: #
                    msg = f"EROARE Art. 10(2) '{date_capat.id_intern}': Contestație evaluabilă necesită valoarea bunurilor (>= 0) și a debitului (>= 0)." #
                    logger.error(msg) #
                    return -1.0, msg #
                valoare_baza_calcul = val_debit if val_debit < val_bunuri else val_bunuri #
                taxa_bruta = aplica_barem_art_3_1(valoare_baza_calcul) #
                taxa = min(taxa_bruta, TAXA_1000_LEI) #
                plafonare_msg = f"(plafonată la {TAXA_1000_LEI:,.2f} lei de la {taxa_bruta:,.2f} lei)" if taxa_bruta > TAXA_1000_LEI else "" #
                detaliere += f"Aplicare Art. 10(2) teza I/II (Contestație la exec. evaluabilă): Calcul la baza={valoare_baza_calcul:,.2f} lei (min între bunuri={val_bunuri:,.2f} și debit={val_debit:,.2f} dacă debit<bunuri, altfel bunuri) {plafonare_msg}." #
            else:
                taxa = TAXA_100_LEI #
                detaliere += f"Aplicare Art. 10(2) teza III (Contestație la exec. neevaluabilă): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART10_4": # Întoarcere executare #
        if valoare is None or valoare < 0: #
            msg = f"EROARE Art. 10(4) '{date_capat.id_intern}': Necesită valoare validă (>= 0) a restituirii în 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_REPUNERE_SITUATIE_S1 if valoare <= TAXA_REPUNERE_SITUATIE_PRAG else TAXA_REPUNERE_SITUATIE_S2 #
        detaliere += f"Aplicare Art. 10(4) (Întoarcere executare): Taxă {taxa:,.2f} lei pentru valoarea {valoare:,.2f} lei." #
    # --- Art. 11 (Alte Cereri) ---
    elif regula_id == "CALC_ART11_A": # Consfințire / Acord mediere #
        taxa_baza = TAXA_20_LEI #
        detaliere_base = f"Aplicare Art. 11 lit. a): Taxă bază {taxa_baza:,.2f} lei." #
        taxa_suplim_imobil = 0.0 #
        taxa_suplim_partaj = 0.0 #
        if date_capat.Contine_Transfer_Imobiliar: #
            if val_bun_imobil is None or val_bun_imobil <= 0: #
                msg = f"EROARE Art. 11a '{date_capat.id_intern}': Transfer imobiliar necesită valoarea celui mai mare imobil (> 0) în 'Valoare_Bun_Imobil'." #
                logger.error(msg) #
                return -1.0, msg #
            taxa_revendicare_imobil = aplica_barem_art_3_1(val_bun_imobil) #
            taxa_suplim_imobil = taxa_revendicare_imobil * 0.50 #
            detaliere_base += f"\n  + Supliment transfer imobiliar (50% din taxa Art.3(1) pt val={val_bun_imobil:,.2f} lei): {taxa_suplim_imobil:,.2f} lei." #
        if date_capat.Contine_Partaj: #
            if valoare is None or valoare < 0: #
                msg = f"EROARE Art. 11a '{date_capat.id_intern}': Partaj în acord necesită valoarea masei partajabile (>= 0) în 'Valoare_Obiect'." #
                logger.error(msg) #
                return -1.0, msg #
            taxa_partaj_art3_baza = aplica_barem_art_3_1(valoare) #
            taxa_partaj_art5 = taxa_partaj_art3_baza * 0.50 #
            taxa_suplim_partaj = taxa_partaj_art5 * 0.50 #
            detaliere_base += f"\n  + Supliment partaj (50% din taxa de partaj calculată cf. Art. 5 pt val={valoare:,.2f} lei): {taxa_suplim_partaj:,.2f} lei." #
        taxa = taxa_baza + taxa_suplim_imobil + taxa_suplim_partaj #
        detaliere = detaliere_base #
    elif regula_id == "CALC_ART11_B": # Măsuri asigurătorii #
        if date_capat.Este_Nava_Aeronava: #
            taxa = TAXA_1000_LEI #
            detaliere += f"Aplicare Art. 11 lit. b) teza II: Taxă fixă {taxa:,.2f} lei (nave/aeronave)." #
        elif date_capat.Este_Ordonanta_UE_Indisponibilizare: #
            taxa = TAXA_100_LEI #
            detaliere += f"Aplicare Art. 11 lit. b) teza III: Taxă fixă {taxa:,.2f} lei (Ord. UE indisponibilizare conturi)." #
        else:
            taxa = TAXA_100_LEI #
            detaliere += f"Aplicare Art. 11 lit. b) teza I: Taxă fixă {taxa:,.2f} lei (măsuri asigurătorii generale)." #
    elif regula_id == "CALC_ART11_C": # Contestație tergiversare / Plângere #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 11 lit. c) (Contestație tergiversare/Plângere): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 12 (Persoane Juridice - Înregistrări) ---
    elif regula_id == "CALC_ART12_A": # Partid Politic #
        taxa = TAXA_300_LEI #
        detaliere += f"Aplicare Art. 12 lit. a) (Înreg./Modif. Partid Politic/Alianță): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART12_B": # Sindicate/Patronate #
        taxa = TAXA_200_LEI #
        detaliere += f"Aplicare Art. 12 lit. b) (Dobândire PJ/Modif. Sindicate/Patronate/Uniuni): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART12_C": # Asociații/Fundații #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 12 lit. c) (Dobândire PJ/Modif. Asoc./Fundații): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 13 (Proprietate Intelectuală) ---
    elif regula_id in ["CALC_ART13_A", "CALC_ART13_B"]: # Drept Autor/Conexe / Brevet #
        taxa = TAXA_100_LEI #
        context = "Drept Autor/Conexe" if regula_id == "CALC_ART13_A" else "Brevet Inventator" #
        detaliere += f"Aplicare Art. 13 lit. a)/b) ({context}): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART13_C": # Marcă/Desen/Model Industrial (neevaluabil) #
        taxa = TAXA_300_LEI #
        detaliere += f"Aplicare Art. 13 lit. c) (Marcă/Desen/Model Industrial neeval.): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 14 (Insolvență / Registrul Comerțului) ---
    elif regula_id == "CALC_ART14_1": # Insolvență #
        taxa = TAXA_200_LEI #
        detaliere += f"Aplicare Art. 14(1) (Cereri Insolvență): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART14_2": # Registrul Comerțului (competența instanței) #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 14(2) (Înreg. RC - Instanță): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 15 (Raporturi de Familie) ---
    elif regula_id == "CALC_ART15_A": # Divorț Acord/Culpă/Separare > 2 ani #
        taxa = TAXA_200_LEI #
        detaliere += f"Aplicare Art. 15 lit. a) (Divorț acord/culpă/separare): Taxă fixă divorț {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART15_B": # Divorț Cerere Unuia Acceptată #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 15 lit. b) (Divorț cerere acceptată): Taxă fixă divorț {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART15_C": # Despăgubiri / Prestație compensatorie (în divorț) #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 15 lit. c) (Despăgubiri/Prestație compensatorie în divorț): Taxă fixă {taxa:,.2f} lei (se taxează separat de divorț)." #
    elif regula_id == "CALC_ART15_E": # Altă cerere neevaluabilă familie (inclusiv cele de la lit. d formulate separat) #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 15 lit. e) (Altă cerere neevaluabilă familie): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 16 (Contencios Administrativ) ---
    elif regula_id == "CALC_ART16_A": # Anulare act / Recunoaștere drept / Obligare eliberare #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 16 lit. a) (Contencios - Anulare/Recunoaștere/Obligare): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART16_B": # Contencios cu caracter patrimonial #
        if valoare is None or valoare <= 0: #
            msg = f"EROARE Art. 16b '{date_capat.id_intern}': Necesită valoare validă a despăgubirilor (> 0) în 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa_bruta = valoare * CONT_ADM_PATRIM_PROC #
        taxa = min(taxa_bruta, CONT_ADM_PATRIM_PLAFON) #
        plafonare_msg = f"(plafonată la {CONT_ADM_PATRIM_PLAFON:,.2f} lei de la {taxa_bruta:,.2f} lei)" if taxa_bruta > CONT_ADM_PATRIM_PLAFON else "" #
        detaliere += f"Aplicare Art. 16 lit. b) (Contencios Patrimonial): {CONT_ADM_PATRIM_PROC*100:.0f}% din valoarea {valoare:,.2f} lei {plafonare_msg}." #
    # --- Art. 17 (Notari Publici) ---
    elif regula_id == "CALC_ART17_A": # Contestație decizie UNNPR #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 17 lit. a) (Contestație decizie UNNPR): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART17_B": # Plângere respingere act notarial #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 17 lit. b) (Plângere respingere act notar): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 18 (Executori Judecătorești) ---
    elif regula_id == "CALC_ART18": # Conflict competență / Plângere refuz / Supralegalizare #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 18 (Cereri Executori Jud.): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 19 (Contravenții) ---
    elif regula_id == "CALC_ART19": # Plângere / Cale atac contravențională #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 19 (Plângere/Cale atac contravențională): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 20 (Carte Funciară) ---
    elif regula_id == "CALC_ART20": # Cerere CF (fără fond) #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 20 (Cereri CF - fără fond): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 21 (Asociații Proprietari) ---
    elif regula_id == "CALC_ART21": # Înregistrare / Apel încheiere delegat #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 21 (Asoc. Proprietari): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 22 (Cereri către Ministerul Justiției) ---
    elif regula_id == "CALC_ART22_A": # Supralegalizare #
        nr_inscrise = date_capat.Numar_Inscrise_Supralegalizare #
        if nr_inscrise is None or nr_inscrise <= 0: #
            msg = f"EROARE Art. 22a '{date_capat.id_intern}': Necesită număr valid de înscrisuri (> 0)." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_SUPRALEGALIZARE_MJ_INSCRIS * nr_inscrise #
        detaliere += f"Aplicare Art. 22 lit. a) (Supralegalizare MJ): {TAXA_SUPRALEGALIZARE_MJ_INSCRIS:.2f} lei x {nr_inscrise} înscris(uri)." #
    elif regula_id == "CALC_ART22_B": # Autorizare traducători #
        taxa = TAXA_300_LEI #
        detaliere += f"Aplicare Art. 22 lit. b) (Autorizare Traducători): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id in ["CALC_ART22_C", "CALC_ART22_D"]: # Atestare / Recunoaștere calificare UE/SEE #
        taxa = TAXA_100_LEI #
        context = "Atestare" if regula_id == "CALC_ART22_C" else "Recunoaștere" #
        detaliere += f"Aplicare Art. 22 lit. c)/d) ({context} Calificare): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 23, 24, 25 (Căi de Atac) ---
    elif regula_id == "CALC_APEL_GENERAL": # Apel General #
        taxa_fond = date_generale.Taxa_Achitata_Prima_Instanta #
        if taxa_fond is None or taxa_fond < 0: #
            msg = f"EROARE Art. 23 '{date_capat.id_intern}': Calcul taxă apel necesită taxa achitată în primă instanță (>= 0)." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = max(taxa_fond * 0.50, TAXA_MINIMA_ART3_1) #
        detaliere += f"Aplicare Art. 23 (Apel General): 50% din taxa de fond ({taxa_fond:,.2f} lei), cu minim {TAXA_MINIMA_ART3_1:,.2f} lei. Taxa calculată = {taxa:,.2f} lei." #
    elif regula_id == "CALC_RECURS_GENERAL": # Recurs General #
        motive_invocate = date_capat.Motive_Recurs_Invocate or [] #
        motive_proc = "Procedurale" in motive_invocate #
        motive_subst = "Substantiale" in motive_invocate #
        if not motive_proc and not motive_subst: #
            msg = f"EROARE Art. 24 '{date_capat.id_intern}': Trebuie specificat cel puțin un tip de motiv de recurs (procedural/substanțial) în 'Motive_Recurs_Invocate'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa_calc_subst = 0.0 #
        detaliere_rec = "Aplicare Art. 24 (Recurs General): " #
        if motive_subst: #
            if date_capat.Este_Evaluabil is None: #
                msg = f"EROARE Art. 24 '{date_capat.id_intern}': Nu s-a specificat dacă recursul substanțial este evaluabil ('Este_Evaluabil')." #
                logger.error(msg) #
                return -1.0, msg #
            if date_capat.Este_Evaluabil: #
                val_contestata = date_capat.Valoare_Contestata_Recurs #
                if val_contestata is None or val_contestata < 0: #
                    msg = f"EROARE Art. 24(2) '{date_capat.id_intern}': Recurs substanțial evaluabil necesită valoarea contestată (>= 0) în 'Valoare_Contestata_Recurs'." #
                    logger.error(msg) #
                    return -1.0, msg #
                taxa_fond_contestat = aplica_barem_art_3_1(val_contestata) #
                taxa_calc_subst = max(taxa_fond_contestat * 0.50, TAXA_100_LEI) #
                detaliere_rec += f"Motive substanțiale (evaluabil): 50% din taxa pt {val_contestata:,.2f} lei (adică {taxa_fond_contestat:,.2f} lei), cu min {TAXA_100_LEI:,.2f} lei = {taxa_calc_subst:,.2f} lei." #
            else:
                taxa_calc_subst = TAXA_100_LEI #
                detaliere_rec += f"Motive substanțiale (neevaluabil): Taxă fixă {taxa_calc_subst:,.2f} lei." #
        taxa_calc_proc = TAXA_100_LEI if motive_proc else 0.0 #
        if motive_subst: #
            taxa = taxa_calc_subst #
            if motive_proc: detaliere_rec += f" (Taxa pt motive procedurale de {TAXA_100_LEI:,.2f} lei este inclusă)." #
        elif motive_proc: #
            taxa = taxa_calc_proc #
            detaliere_rec += f"Motive procedurale (Art. 488(1) pct.1-7): Taxă fixă {taxa:,.2f} lei." #
        else:
            taxa = 0.0 #
            detaliere_rec = "Niciun motiv valid specificat." #
        detaliere = detaliere_rec #
    elif regula_id == "CALC_ART25_1": # Apel/Recurs Specific - Taxă 20 lei #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 25(1) (Apel/Recurs specific): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART25_2": # Apel/Recurs Specific - Taxă 50 lei #
        taxa = TAXA_50_LEI #
        detaliere += f"Aplicare Art. 25(2) (Apel/Recurs specific): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART25_3": # Apel/Recurs DOAR pe considerente #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 25(3) (Cale atac doar pe considerente): Taxă fixă {taxa:,.2f} lei." #
    # --- Art. 26 (Căi Extraordinare) ---
    elif regula_id == "CALC_ART26_1": # Contestație în Anulare #
        taxa = TAXA_100_LEI #
        detaliere += f"Aplicare Art. 26(1) (Contestație în Anulare): Taxă fixă {taxa:,.2f} lei." #
    elif regula_id == "CALC_ART26_2": # Revizuire #
        nr_motive = date_capat.Numar_Motive_Revizuire #
        if nr_motive is None or nr_motive <= 0: #
            msg = f"EROARE Art. 26(2) '{date_capat.id_intern}': Necesită număr valid de motive (> 0) în 'Numar_Motive_Revizuire'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_100_LEI * nr_motive #
        detaliere += f"Aplicare Art. 26(2) (Revizuire): {TAXA_100_LEI:,.2f} lei x {nr_motive} motive." #
    elif regula_id == "CALC_ART26_3": # Anulare hotărâre arbitrală #
        nr_motive = date_capat.Numar_Motive_Anulare_Arbitraj #
        if nr_motive is None or nr_motive <= 0: #
            msg = f"EROARE Art. 26(3) '{date_capat.id_intern}': Necesită număr valid de motive (> 0) în 'Numar_Motive_Anulare_Arbitraj'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = TAXA_100_LEI * nr_motive #
        detaliere += f"Aplicare Art. 26(3) teza I (Anulare Hot. Arbitrală): {TAXA_100_LEI:,.2f} lei x {nr_motive} motive. Recursul se taxează separat (Art. 24)." #
    # --- Art. 27 (Neevaluabil General) ---
    elif regula_id == "CALC_ART27": # Alte cereri neevaluabile #
        taxa = TAXA_20_LEI #
        detaliere += f"Aplicare Art. 27 (Alte cereri neevaluabile): Taxă fixă {taxa:,.2f} lei." #
    # --- Caz Scutit Explicit ---
    elif regula_id == "CALC_SCUTIT": #
        taxa = 0.0 #
        detaliere = "Acest capăt de cerere este scutit de taxa de timbru conform prevederilor legale aplicabile (ex: accesoriu, scutire specifică)." #
    # --- Cazuri Specifice care folosesc Art. 3(1) cu context ---
    elif regula_id == "CALC_REVOCATORIE": # Acțiune Revocatorie (Art. 3(2)d) #
        val_creanta = date_capat.Valoare_Creanta_Creditor #
        val_afectata = date_capat.Valoare_Afectata_Prin_Act_Fraudulos #
        if val_creanta is None or val_creanta < 0 or val_afectata is None or val_afectata < 0: #
            msg = f"EROARE Revocatorie '{date_capat.id_intern}': Necesită valoarea creanței (>=0) și valoarea afectată (>=0)." #
            logger.error(msg) #
            return -1.0, msg #
        valoare_baza_calcul = min(val_creanta, val_afectata) #
        taxa = aplica_barem_art_3_1(valoare_baza_calcul) #
        detaliere += f"Aplicare Art. 3(2) lit. d) (Revocatorie): Calcul la min(creanță={val_creanta:,.2f}, val. afectată={val_afectata:,.2f}) = {valoare_baza_calcul:,.2f} lei." #
    elif regula_id == "CALC_OBLICA": # Acțiune Oblică (Art. 3(2)d) #
        val_creanta = date_capat.Valoare_Creanta_Creditor #
        val_subiacent = date_capat.Valoare_Obiect_Subiacent #
        if val_creanta is None or val_creanta < 0 or val_subiacent is None or val_subiacent < 0: #
            msg = f"EROARE Oblica '{date_capat.id_intern}': Necesită valoarea creanței (>=0) și valoarea dreptului exercitat (>=0)." #
            logger.error(msg) #
            return -1.0, msg #
        valoare_baza_calcul = min(val_creanta, val_subiacent) #
        taxa = aplica_barem_art_3_1(valoare_baza_calcul) #
        detaliere += f"Aplicare Art. 3(2) lit. d) (Oblica): Calcul la min(creanță={val_creanta:,.2f}, val. drept={val_subiacent:,.2f}) = {valoare_baza_calcul:,.2f} lei." #
    elif regula_id == "CALC_REVEND_IMOBIL": # Revendicare Imobil (Art. 31(3)) #
        if val_bun_imobil is None or val_bun_imobil <= 0: #
            msg = f"EROARE Revendicare Imobil '{date_capat.id_intern}': Necesită valoarea impozabilă/grilă (> 0) în 'Valoare_Bun_Imobil'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(val_bun_imobil) #
        detaliere += f"Aplicare Art. 3(1) rap. la Art. 31(3) (Revendicare Imobil): Calculată la valoarea impozabilă/grilă = {val_bun_imobil:,.2f} lei." #
    elif regula_id == "CALC_REVEND_MOBIL": # Revendicare Mobil (Art. 31(2)) #
        if valoare is None or valoare <= 0: #
            msg = f"EROARE Revendicare Mobil '{date_capat.id_intern}': Necesită valoarea declarată (> 0) în 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(valoare) #
        detaliere += f"Aplicare Art. 3(1) rap. la Art. 31(2) (Revendicare Mobil): Calculată la valoarea declarată = {valoare:,.2f} lei." #
    elif regula_id == "CALC_DESF_CONST_PROPR": # Desființare Construcție Proprietar (Art. 31(2)) #
        if val_bun_imobil is None or val_bun_imobil <= 0: #
            msg = f"EROARE Desființare Prop. '{date_capat.id_intern}': Necesită valoarea terenului afectat (> 0) în 'Valoare_Bun_Imobil'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(val_bun_imobil) #
        detaliere += f"Aplicare Art. 3(1) rap. la Art. 31(2) (Desființare Const. Prop.): Calculată la valoarea terenului afectat = {val_bun_imobil:,.2f} lei." #
    elif regula_id == "CALC_PREDARE_PERS": # Predare Bun - Acțiune Personală (Art. 31(2)) #
        if valoare is None or valoare <= 0: #
            msg = f"EROARE Predare Pers. '{date_capat.id_intern}': Necesită valoarea declarată a bunului (> 0) în 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(valoare) #
        detaliere += f"Aplicare Art. 3(1) rap. la Art. 31(2) (Predare Bun - Acț. Personală): Calculată la valoarea declarată a bunului = {valoare:,.2f} lei." #
    elif regula_id == "CALC_PREDARE_REALA_IMOBIL": # Predare Bun - Acțiune Reală IMOBIL (Art. 31(3)) #
        if val_bun_imobil is None or val_bun_imobil <= 0: #
            msg = f"EROARE Predare Reală Imobil '{date_capat.id_intern}': Necesită valoarea impozabilă/grilă (> 0) a imobilului în 'Valoare_Bun_Imobil'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(val_bun_imobil) #
        detaliere += f"Aplicare Art. 3(1) rap. la Art. 31(3) (Predare Bun - Acț. Reală Imobil): Calculată la valoarea impozabilă/grilă = {val_bun_imobil:,.2f} lei." #
    elif regula_id == "CALC_PREDARE_REALA_MOBIL": # Predare Bun - Acțiune Reală MOBIL (Art. 31(2)) #
        if valoare is None or valoare <= 0: #
            msg = f"EROARE Predare Reală Mobil '{date_capat.id_intern}': Necesită valoarea declarată (> 0) a bunului în 'Valoare_Obiect'." #
            logger.error(msg) #
            return -1.0, msg #
        taxa = aplica_barem_art_3_1(valoare) #
        detaliere += f"Aplicare Art. 3(1) rap. la Art. 31(2) (Predare Bun - Acț. Reală Mobil): Calculată la valoarea declarată = {valoare:,.2f} lei." #
    else:
        msg = f"EROARE Internă: Regula de calcul '{regula_id}' pentru '{date_capat.id_intern}' nu este recunoscută sau implementată." #
        logger.error(msg) #
        return -1.0, msg #

    taxa_rotunjita = round(taxa, 2) #
    if taxa > 0 and taxa_rotunjita == 0: #
        taxa_finala = 0.01 #
        detaliere += f" Taxa calculată ({taxa:.4f}) rotunjită la {taxa_finala:.2f} lei (minim)." #
    else:
        taxa_finala = taxa_rotunjita #
        detaliere += f" Taxa calculată = {taxa_finala:,.2f} lei." #

    return taxa_finala, detaliere #


def main_calcul_taxa( #
    capete_cerere_input: List[CapatCerereInput], #
    date_generale_input: DateGeneraleInput #
) -> Tuple[float, str]: #
    date_generale = date_generale_input #
    capete_cerere_valid = capete_cerere_input #

    detaliere_calcul_total = f"Detaliere Calcul Taxă Timbru (OUG 80/2013) - Valori actualizate la: {DATA_ULTIMA_ACTUALIZARE_VALORI}\n" #
    detaliere_calcul_total += "==================================================\n" #

    if date_generale.Filtru_Proces_Vechi: #
        logger.info("Proces anterior OUG 80/2013 detectat.") #
        detaliere_calcul_total += "Proces anterior datei de 29 iunie 2013. Se aplică Legea 146/1997 (nu OUG 80/2013)." #
        return 0.0, detaliere_calcul_total #

    if date_generale.Aplica_Scutire: #
        temei = date_generale.Temei_Scutire_Selectat or "Art. 29/30 OUG 80/2013 sau lege specială" #
        logger.info(f"Scutire generală aplicată. Temei: {temei}") #
        detaliere_calcul_total += f"Cererea este scutită integral de taxa de timbru conform: {temei}." #
        return 0.0, detaliere_calcul_total #

    taxa_totala: float = 0.0 #
    componente_partaj: List[Tuple[float, str, str, int]] = [] #
    componente_desf_revend: Dict[str, Any] = { #
        "desf": False, "revend": False, #
        "taxa_desf": 0.0, "idx_desf": -1, #
        "taxa_revend": 0.0, "idx_revend": -1, #
        "detaliere_desf": "", "detaliere_revend": "" #
    }
    capete_procesate_pt_exceptii: set = set() #
    id_uri_capete_prezente: set = {c.id_intern for c in capete_cerere_valid} #
    id_granituire = "OUG80_ART8_1D_GRANITUIRE" #
    id_revend_cu_granituire = "OUG80_REVEND_IMOBIL_PT_DESF" #
    id_desf = "OUG80_DESF_CONST_PROPR" #

    logger.debug(f"Procesare {len(capete_cerere_valid)} capete de cerere valide.") #
    for index, capat_cerere in enumerate(capete_cerere_valid): #
        id_intern_curent = capat_cerere.id_intern #
        logger.debug(f"Procesare Capăt #{index + 1}: ID='{id_intern_curent}'") #

        if index in capete_procesate_pt_exceptii: #
            logger.debug(f"  -> Capăt #{index + 1} ignorat (deja procesat ca parte a unei excepții).") #
            continue #

        info_regula = obtine_info_regula(id_intern_curent) #
        if not info_regula: #
            detaliere_calcul_total += f"\n--- Eroare Capăt Cerere {index + 1}: Tipul de cerere cu ID '{id_intern_curent}' nu a fost găsit în baza de date internă. ---" #
            logger.error(f"ID Regula '{id_intern_curent}' negasit pt capat #{index+1}") #
            continue #

        regula_calcul_specifica = info_regula.get("regula_calcul_id") #
        nume_standard = info_regula.get("nume_standard", id_intern_curent) #
        detaliere_calcul_total += f"\n--- Capăt Cerere {index + 1} ({nume_standard}) ---" #

        este_scutit_explicit = False #
        id_principale_necesare_pt_scutire = info_regula.get("este_accesoriu_scutit_la") #
        if id_principale_necesare_pt_scutire: #
            id_uri_alte_capete = {c.id_intern for i, c in enumerate(capete_cerere_valid) if i != index} #
            if not set(id_principale_necesare_pt_scutire).isdisjoint(id_uri_alte_capete): #
                 este_scutit_explicit = True #
                 logger.info(f"  -> Capăt #{index + 1} ('{nume_standard}') scutit ca accesoriu.") #
                 detaliere_calcul_total += f"\n   Taxă = 0.00 lei (Scutit cf. {info_regula.get('articol_referinta', '?')}, accesoriu la cerere principală)." #
                 capete_procesate_pt_exceptii.add(index) #
                 continue #

        if id_intern_curent == id_granituire and id_revend_cu_granituire in id_uri_capete_prezente: #
            logger.info(f"  -> Capăt #{index + 1} ('{nume_standard}') scutit (se cere și revendicare teren).") #
            detaliere_calcul_total += f"\n   Taxă = 0.00 lei (Scutit cf. Art. 8(1) lit. d) teza finală - se taxează doar revendicarea)." #
            capete_procesate_pt_exceptii.add(index) #
            continue #

        if info_regula.get("grup_exceptie_insumare") == "PARTAJ_ART5": #
            logger.debug(f"  -> Capăt #{index + 1} este componentă de partaj.") #
            taxa_ipotetica, detaliere_ipotetica = ruleaza_calcul_specific(regula_calcul_specifica, capat_cerere, date_generale) #
            if taxa_ipotetica >= 0: #
                valoare_baza_partaj = obtine_valoare_baza_din_calcul(detaliere_ipotetica, tip='partaj') #
                if valoare_baza_partaj is not None: #
                    logger.debug(f"  -> Colectat pt partaj: ValBaza={valoare_baza_partaj}, Det={detaliere_ipotetica}") #
                    componente_partaj.append((valoare_baza_partaj, detaliere_ipotetica, nume_standard, index + 1)) #
                    capete_procesate_pt_exceptii.add(index) #
                else:
                    detaliere_calcul_total += f"\n   !!! Avertisment: Nu s-a putut extrage valoarea de bază pentru componenta partaj {index + 1}. Detaliu: {detaliere_ipotetica} !!!" #
                    logger.warning(f"Extragere valoare baza partaj esuata pt capat #{index+1}") #
            else:
                detaliere_calcul_total += f"\n   !!! Eroare la calcul componentă partaj {index + 1}: {detaliere_ipotetica} !!!" #
                logger.error(f"Eroare calcul componenta partaj #{index+1}: {detaliere_ipotetica}") #
            continue #

        logger.debug(f"  -> Rulare calcul specific: {regula_calcul_specifica}") #
        taxa_capat, detaliere_capat = ruleaza_calcul_specific(regula_calcul_specifica, capat_cerere, date_generale) #
        if taxa_capat < 0: #
            detaliere_calcul_total += f"\n   !!! Eroare la calcul: {detaliere_capat} !!!" #
            logger.error(f"Eroare calcul capat #{index+1}: {detaliere_capat}") #
        else:
            detaliere_calcul_total += f"\n   {detaliere_capat}" #
            detaliere_calcul_total += f"\n   Taxă calculată pentru acest capăt: {taxa_capat:,.2f} lei." #
            logger.debug(f"  -> Rezultat calcul capăt #{index + 1}: Taxa={taxa_capat}") #

            grup_exceptie = info_regula.get("grup_exceptie_insumare") #
            if grup_exceptie == "DESF_REVEND_IDENTIC": #
                if id_intern_curent == id_desf: #
                    logger.debug(f"  -> Colectat ca 'Desființare' pt excepție. Taxa={taxa_capat}") #
                    componente_desf_revend["desf"] = True #
                    componente_desf_revend["taxa_desf"] = taxa_capat #
                    componente_desf_revend["idx_desf"] = index + 1 #
                    componente_desf_revend["detaliere_desf"] = detaliere_capat #
                elif id_intern_curent == id_revend_cu_granituire: #
                     logger.debug(f"  -> Colectat ca 'Revendicare pt Desf.' pt excepție. Taxa={taxa_capat}") #
                     componente_desf_revend["revend"] = True #
                     componente_desf_revend["taxa_revend"] = taxa_capat #
                     componente_desf_revend["idx_revend"] = index + 1 #
                     componente_desf_revend["detaliere_revend"] = detaliere_capat #

            if info_regula.get("grup_exceptie_insumare") != "PARTAJ_ART5": #
                 logger.debug(f"  -> Adăugare la total: {taxa_capat}") #
                 taxa_totala += taxa_capat #

    detaliere_calcul_total += "\n\n--- Procesare Finală și Excepții ---" #

    if componente_partaj: #
        logger.info(f"Aplicare excepție Partaj (Art. 5(2)) pentru {len(componente_partaj)} componente.") #
        detaliere_calcul_total += "\nProcesare Excepție Partaj (Art. 5(2)):" #
        for val, det, nume, idx in componente_partaj: #
            detaliere_calcul_total += f"\n  - Componenta {idx} ({nume}): Valoare Bază = {val:,.2f} lei." #
            match_taxa_comp = re.search(r"Taxa\s+componentă\s+\(50%\)\s*=\s*([\d\.,]+)\s*lei", det, re.IGNORECASE) #
            if match_taxa_comp: detaliere_calcul_total += f" (Taxă ipotetică 50% = {match_taxa_comp.group(1)} lei)" #
            else: detaliere_calcul_total += f" ({det})" #

        valori_valide = [val for val, _, _, _ in componente_partaj if val is not None and val >= 0] #
        if valori_valide: #
            valoare_maxima_partaj = max(valori_valide) #
            logger.debug(f"  -> Valoare maximă partaj: {valoare_maxima_partaj}") #
            taxa_baza_art3_pt_partaj = aplica_barem_art_3_1(valoare_maxima_partaj) #
            taxa_finala_partaj = taxa_baza_art3_pt_partaj * 0.50 #
            taxa_totala += taxa_finala_partaj #
            detaliere_calcul_total += f"\n  => Taxa unică cf. Art. 5(2) se calculează la valoarea maximă: {valoare_maxima_partaj:,.2f} lei." #
            detaliere_calcul_total += f"\n     Taxa cf. Art. 3(1) pt. această valoare = {taxa_baza_art3_pt_partaj:,.2f} lei." #
            detaliere_calcul_total += f"\n     Taxa finală adăugată pentru TOATE componentele de partaj (50% cf. Art. 5(1)) = {taxa_finala_partaj:,.2f} lei." #
            logger.info(f"  -> Taxa finală partaj adăugată: {taxa_finala_partaj}") #
        else:
            detaliere_calcul_total += "\n  (Nu s-au găsit valori valide pentru calculul final al partajului)." #
            logger.warning("Excepție partaj: Nicio valoare validă găsită.") #
    else:
         logger.debug("Nicio componentă de partaj de procesat.") #
         detaliere_calcul_total += "\nFără componente de partaj care să necesite aplicarea excepției Art. 5(2)." #

    if componente_desf_revend.get("desf") and componente_desf_revend.get("revend"): #
        taxa_de_anulat = componente_desf_revend.get("taxa_desf", 0.0) #
        idx_desf = componente_desf_revend.get("idx_desf", -1) #
        idx_revend = componente_desf_revend.get("idx_revend", -1) #
        logger.info(f"Aplicare excepție Desființare + Revendicare (Capete {idx_desf} & {idx_revend}). Taxa de anulat pt Desf: {taxa_de_anulat}") #
        if taxa_de_anulat > 0: #
            taxa_totala -= taxa_de_anulat #
            detaliere_calcul_total += f"\nProcesare Excepție Finalitate Identică (Desființare + Revendicare teren aferent - Capete {idx_desf} & {idx_revend}):" #
            detaliere_calcul_total += f"\n  - S-a ANULAT taxa calculată separat pentru 'Desființare Construcție (Proprietar)' ({taxa_de_anulat:,.2f} lei)." #
            detaliere_calcul_total += f"\n  - Rămâne aplicabilă DOAR taxa pentru 'Revendicare Imobil (Teren Afectat)' (calculată la {componente_desf_revend.get('taxa_revend', 0.0):,.2f} lei)." #
            logger.debug(f"  -> Taxa totală ajustată (scăzut {taxa_de_anulat}): {taxa_totala}") #
        else:
             logger.warning(f"Excepție Desf+Revend: Taxa de anulat pentru Desființare este 0 sau negativă ({taxa_de_anulat}). Ajustare omisă.") #
             detaliere_calcul_total += f"\nExcepție Finalitate Identică (Desființare + Revendicare teren aferent - Capete {idx_desf} & {idx_revend}):" #
             detaliere_calcul_total += f"\n  (Avertisment: Taxa calculată pentru Desființare a fost {taxa_de_anulat:,.2f} lei, nu s-a efectuat ajustarea)." #
    else:
        logger.debug("Excepția Desființare+Revendicare nu se aplică (lipsesc ambele capete).") #

    taxa_totala_rotunjita = round(taxa_totala, 2) #
    if taxa_totala > 0 and taxa_totala_rotunjita == 0: #
        taxa_totala_finala = 0.01 #
        logger.warning(f"Taxa totală {taxa_totala:.4f} rotunjită la zero, ajustată la {taxa_totala_finala:.2f}") #
    else:
        taxa_totala_finala = taxa_totala_rotunjita #

    detaliere_calcul_total += f"\n\n==================================================" #
    detaliere_calcul_total += f"\n=== TAXA JUDICIARĂ DE TIMBRU TOTALĂ DATORATĂ: {taxa_totala_finala:,.2f} lei ===" #
    detaliere_calcul_total += f"\n==================================================" #
    detaliere_calcul_total += "\n\nNotă: Verificați eventuale scutiri generale (Art. 29, 30) care nu au fost indicate sau aplicabilitatea altor legi speciale. Taxa poate suferi actualizări anuale cu rata inflației (Art. 50). Dacă valoarea obiectului se modifică în cursul procesului, instanța poate dispune plata diferenței (Art. 36)." #

    logger.info(f"Calcul finalizat. Taxa totală: {taxa_totala_finala:.2f} lei.") #
    return taxa_totala_finala, detaliere_calcul_total #


# ==========================================
# LOGICA SUGERARE CLASIFICARE LLM
# ==========================================
async def suggest_tax_classification(case_description: str) -> SugestieIncadrareLLMResponse:
    """
    Folosește LLM-ul local pentru a sugera cel mai potrivit ID de taxare pentru o descriere dată (obiect dosar).
    """
    if not case_description or len(case_description.strip()) < 3:
        return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            error_message="Descrierea obiectului dosarului este prea scurtă."
        )

    # 1. Get options
    options = get_tipuri_cereri_taxa()
    if not options:
         return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            error_message="Nu există opțiuni de categorizare încărcate."
        )

    # 2. Prepare Prompt
    options_text_parts = []
    for opt in options:
        # Use simple description for token efficiency
        desc = f"{opt.nume_standard} ({opt.categorie})"
        options_text_parts.append(f"- ID: {opt.id_intern}, Descriere: \"{desc}\"")

    options_text = "\n".join(options_text_parts)

    system_prompt = f"""Ești un asistent juridic expert în legislația română privind taxele judiciare de timbru (OUG 80/2013).
Sarcina ta este să analizezi obiectul dosarului și să alegi cel mai potrivit ID din lista de mai jos.
Returnează DOAR ID-ul categoriei alese (ex: OUG80_ART3_1_GEN). Dacă nu ești sigur, returnează NEDETERMINAT.

Opțiuni disponibile:
{options_text}"""

    user_prompt = f"""Obiectul dosarului este:
"{case_description}"

Care este ID-ul corect din lista de mai sus? Returnează doar ID-ul."""

    full_prompt = f"{system_prompt}\n\n{user_prompt}"

    # 3. Call Local LLM via LLMClient
    try:
        success, content, _ = await LLMClient.call_llm_local(full_prompt, timeout=60, label="TaxaTimbru Suggestion")

        if not success:
             return SugestieIncadrareLLMResponse(
                original_input_obiect=case_description,
                error_message=f"Eroare la apelul LLM: {content}"
            )

        # 4. Parse Response (Expect raw ID string from local LLM if prompted correctly, or JSON if conditioned)
        # Local LLM response might be chatty, try to extract ID.
        raw_suggestion = content.strip()
        suggested_id = "NEDETERMINAT"

        # Simple extraction logic: check if any valid ID is present in the response
        valid_ids = {opt.id_intern for opt in options}

        # Direct match check
        if raw_suggestion in valid_ids:
            suggested_id = raw_suggestion
        else:
            # Search for ID in text
            for vid in valid_ids:
                if vid in raw_suggestion:
                    suggested_id = vid
                    break

        # Find standard name
        suggested_nume_standard = None
        if suggested_id != "NEDETERMINAT":
            for opt in options:
                if opt.id_intern == suggested_id:
                    suggested_nume_standard = opt.nume_standard
                    break

        return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            sugested_id_intern=suggested_id,
            sugested_nume_standard=suggested_nume_standard,
            llm_raw_suggestion=raw_suggestion
        )

    except Exception as e:
        logger.exception("Eroare neasteptata la sugestia LLM taxa timbru")
        return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            error_message=f"Eroare internă server: {str(e)}"
        )

if __name__ == "__main__": #
    logger.info("--- Rulare Test Local Calculator Taxa Timbru ---") #
    # Test 1: Partaj complex + Stabilire calitate
    test_capete1_dict = [ #
        {"id_intern": "OUG80_ART5_1_PARTAJ_JUDICIAR", "Valoare_Obiect": 50000.0}, #
        {"id_intern": "OUG80_ART5_1_PARTAJ_JUDICIAR", "Valoare_Obiect": 150000.0}, #
        {"id_intern": "OUG80_ART5_3_STAB_CALIT", "Numar_Coproprietari_Mostenitori": 2}, #
        {"id_intern": "OUG80_ART3_2A_ACCESORIU_SCUTIT"} #
    ]
    test_generale1_dict = {"Filtru_Proces_Vechi": False, "Aplica_Scutire": False} #
    try:
        test_capete1 = [CapatCerereInput(**d) for d in test_capete1_dict] #
        test_generale1 = DateGeneraleInput(**test_generale1_dict) #
        taxa1, detaliere1 = main_calcul_taxa(test_capete1, test_generale1) #
        print("\n--- Test 1: Partaj Complex ---") #
        print(f"Taxa Finală: {taxa1:,.2f} lei") #
        print(detaliere1) #
    except ValidationError as e: #
        print(f"\n--- EROARE VALIDARE Test 1 --- \n{e}") #

    # Test 2: Contestație la executare evaluabilă + suspendare
    test_capete2_dict = [ #
        {"id_intern": "OUG80_ART10_2_3_CONTEST_EXEC", "Este_Evaluabil": True, "Este_Contestatie_Executare_Pe_Fond": False, "Valoare_Bunuri_Contestate_Executare": 60000.0, "Valoare_Debit_Urmarit_Executare": 40000.0}, #
        {"id_intern": "OUG80_ART10_1B_SUSP_EXEC"} #
    ]
    test_generale2_dict = {"Filtru_Proces_Vechi": False, "Aplica_Scutire": False} #
    try:
        test_capete2 = [CapatCerereInput(**d) for d in test_capete2_dict] #
        test_generale2 = DateGeneraleInput(**test_generale2_dict) #
        taxa2, detaliere2 = main_calcul_taxa(test_capete2, test_generale2) #
        print("\n--- Test 2: Contestație Executare Evaluabilă + Suspendare ---") #
        print(f"Taxa Finală: {taxa2:,.2f} lei") #
        print(detaliere2) #
    except ValidationError as e: #
        print(f"\n--- EROARE VALIDARE Test 2 --- \n{e}") #

    # Test pentru noua funcție
    print("\n--- Test get_tipuri_cereri_taxa ---") #
    tipuri_cereri_options = get_tipuri_cereri_taxa() #
    if tipuri_cereri_options: #
        print(f"Primele 5 tipuri de cereri (din {len(tipuri_cereri_options)}):") #
        for opt in tipuri_cereri_options[:5]: #
            print(opt.model_dump_json(indent=2) if isinstance(opt, BaseModel) else opt) #
    else:
        print("Nu s-au putut genera opțiunile pentru tipurile de cereri.") #
