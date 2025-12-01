"""
Modul pentru analiza avansată în 2 runde cu LLM worker.
"""
import logging
import json
import re
from sqlmodel import Session, text
from typing import Dict, Any, List, Tuple
from ..settings_manager import settings_manager

logger = logging.getLogger(__name__)

class TwoRoundLLMAnalyzer:
    """
    Orchestrează analiza în 2 runde:
    Round 1: LLM generează cod filtrare
    Round 2: LLM analizează datele filtrate
    """

    def __init__(self, session: Session):
        self.session = session

    async def analyze(self, user_query: str) -> Dict[str, Any]:
        """
        Procesul complet de analiză în 4 pași.

        Args:
            user_query: Întrebarea utilizatorului

        Returns:
            Dict cu rezultate finale
        """
        try:
            logger.info(f"--- START TWO-ROUND ANALYSIS: {user_query[:50]}... ---")

            # PAS 1 + 2: Generare și execuție cod filtrare
            filtered_data = await self._round_1_filter_data(user_query)

            if not filtered_data:
                return {
                    'success': False,
                    'error': 'Nu s-au găsit date relevante după filtrare (0 rezultate).'
                }

            logger.info(f"[ROUND 1] Extras {len(filtered_data)} cazuri relevante")

            # PAS 3 + 4: Analiza datelor filtrate
            final_result = await self._round_2_analyze_data(user_query, filtered_data)

            return final_result

        except Exception as e:
            logger.error(f"[TWO-ROUND] Eroare critică: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    async def _round_1_filter_data(self, user_query: str) -> List[Dict]:
        """
        ROUND 1: LLM generează cod Python pentru filtrare, apoi îl rulăm.

        Returns:
            Lista de cazuri filtrate
        """
        from ..lib.network_file_saver import NetworkFileSaver

        # Construire PROMPT 1
        prompt_round_1 = self._build_filter_prompt(user_query)

        logger.info("[ROUND 1] Trimitem prompt pentru generare cod filtrare...")

        # Obținem setările de rețea
        retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
        retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

        # Salvare prompt în rețea
        success, message, saved_path = NetworkFileSaver.save_to_network(
            content=prompt_round_1,
            host=retea_host,
            shared_folder=retea_folder,
            subfolder=''
        )

        if not success:
            raise RuntimeError(f"Eroare salvare prompt Round 1: {message}")

        # Polling pentru răspuns
        poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
            saved_path=saved_path,
            timeout_seconds=600, # 10 minute timeout
            poll_interval=10
        )

        if not poll_success:
            raise RuntimeError(f"Timeout Round 1: {poll_content}")

        # Parsare JSON cu cod Python
        logger.info("[ROUND 1] Primim răspuns... parsăm codul...")

        try:
            code_response = self._parse_json_response(poll_content)
            filter_code = code_response.get('python_code', '')

            if not filter_code:
                raise ValueError("Răspunsul JSON nu conține cheia 'python_code'")

        except Exception as e:
            logger.error(f"Eroare parsare răspuns Round 1: {e}")
            logger.error(f"Conținut primit: {poll_content}")
            raise ValueError(f"LLM a returnat un răspuns invalid în Round 1: {e}")

        # Cleanup fișier răspuns
        NetworkFileSaver.delete_response_file(response_path)

        # Execuție cod filtrare
        logger.info("[ROUND 1] Executăm codul de filtrare...")

        filtered_data = self._execute_filter_code(filter_code)

        return filtered_data

    async def _round_2_analyze_data(
        self,
        user_query: str,
        filtered_data: List[Dict]
    ) -> Dict[str, Any]:
        """
        ROUND 2: Trimitem datele filtrate către LLM pentru analiză finală.

        Returns:
            Rezultatul final în format JSON
        """
        from ..lib.network_file_saver import NetworkFileSaver

        # 1. Extragere câmpuri relevante
        relevant_data = self._extract_relevant_fields(user_query, filtered_data)

        # 2. Validare și truncare pentru a respecta limita de 30k caractere
        truncated_data, metadata = self._validate_and_truncate_data(relevant_data, user_query, max_chars=30000)

        logger.info(f"[ROUND 2] Trimitem {len(truncated_data)}/{len(filtered_data)} cazuri (după optimizare)")
        logger.info(f"[ROUND 2] Prompt estimat: {metadata['estimated_prompt_size']} caractere")

        # 3. Construire PROMPT 2 optimizat
        prompt_round_2 = self._build_analysis_prompt(user_query, truncated_data, metadata)

        logger.info(f"[ROUND 2] Trimitem {len(filtered_data)} cazuri pentru analiză...")

        # Obținem setările de rețea
        retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
        retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

        # Salvare prompt în rețea
        success, message, saved_path = NetworkFileSaver.save_to_network(
            content=prompt_round_2,
            host=retea_host,
            shared_folder=retea_folder,
            subfolder=''
        )

        if not success:
            raise RuntimeError(f"Eroare salvare prompt Round 2: {message}")

        # Polling pentru răspuns
        poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
            saved_path=saved_path,
            timeout_seconds=600,
            poll_interval=10
        )

        if not poll_success:
            raise RuntimeError(f"Timeout Round 2: {poll_content}")

        # Parsare JSON cu rezultate
        logger.info("[ROUND 2] Primim analiza finală...")

        try:
            analysis_result = self._parse_json_response(poll_content)
        except Exception as e:
            logger.error(f"Eroare parsare răspuns Round 2: {e}")
            logger.error(f"Conținut primit: {poll_content}")
            raise ValueError(f"LLM a returnat un răspuns invalid în Round 2: {e}")

        # Cleanup
        NetworkFileSaver.delete_response_file(response_path)

        return {
            'success': True,
            'results': analysis_result.get('results', {}),
            'interpretation': analysis_result.get('interpretation', ''),
            'charts': analysis_result.get('charts', []),
            'cases_analyzed': len(filtered_data),
            'cases_sent_to_llm': len(truncated_data),
            'prompt_metadata': metadata
        }

    def _build_filter_prompt(self, user_query: str) -> str:
        """Construiește promptul pentru ROUND 1 (generare cod filtrare)."""

        prompt = f"""===================================================================================
🔬 ROUND 1: GENERARE COD PYTHON PENTRU FILTRARE DATE
===================================================================================
Tu ești un Senior Python & SQL Developer specializat în optimizarea query-urilor pe baze de date juridice PostgreSQL.

=================================================================================== 📋 TASK-UL UTILIZATORULUI
{user_query}

=================================================================================== 🎯 MISIUNEA TA (ROUND 1)
Generează cod Python care să FILTREZE și să EXTRAGĂ **DOAR CÂMPURILE STRICT NECESARE** din baza de date PostgreSQL pentru task-ul de mai sus.

⚠️ IMPORTANT: NU trebuie să faci analiza statistică acum! Doar FILTREAZĂ datele!
Analiza se va face în ROUND 2, după ce datele sunt extrase.

=================================================================================== 📊 SCHEMA BAZEI DE DATE (PostgreSQL)

Tabel: blocuri
CREATE TABLE blocuri (
    id INTEGER PRIMARY KEY,
    obj JSONB  -- Conține 16+ câmpuri juridice
);

Câmpuri disponibile în obj (JSONB):
1. materie (string) - "Penal", "Civil"
2. obiect (string) - "Omor", "Furt calificat"
3. solutia (string) - Soluția instanței cu pedepse/amenzi
4. considerente_speta (string) - Motivarea instanței
5. argumente_instanta (string) - Argumentele instanței
6. text_individualizare (string) - Circumstanțe individualizare pedeapsă
7. data_solutiei (string/date) - Data pronunțării
8. tip_speta (string) - "Apel", "Recurs"
9. parte (string) - "Reclamant", "Inculpat"
10. text_situatia_de_fapt (string) - Faptele cauzei
... și alte 6+ câmpuri

=================================================================================== 🚨 REGULI CRITICE - CITEȘTE CU ATENȚIE!

❌ NU FACE NICIODATĂ ASA:
```sql
SELECT id, obj FROM blocuri WHERE ...
```
**DE CE E GREȘIT**: Returnează TOATE cele 16+ câmpuri din obj, când ai nevoie doar de 3-5!
Acest lucru creează un prompt URIAȘ care depășește limita de context!

✅ FACE ÎNTOTDEAUNA ASA:
```sql
SELECT
  id,
  obj->>'obiect' as obiect,
  obj->>'materie' as materie,
  obj->>'solutia' as solutie
FROM blocuri WHERE ...
```
**DE CE E CORECT**: Extrage DOAR câmpurile necesare pentru task. Prompt mic, eficient!

=================================================================================== 📝 GHID PAS-CU-PAS PENTRU GENERAREA QUERY-ULUI

**PASUL 1**: Analizează task-ul utilizatorului și identifică ce tip de date îi trebuie:
- Durate pedepse → obiect, materie, text_individualizare, solutia
- Amenzi → obiect, materie, solutia, considerente_speta
- Tendințe temporale → obiect, materie, solutia, data_solutiei
- Motive/argumentare → obiect, materie, considerente_speta, argumente_instanta

**PASUL 2**: Construiește SELECT cu DOAR câmpurile identificate:
```sql
SELECT
  id,                                    -- Întotdeauna include ID
  obj->>'camp1' as camp1,                -- Câmp relevant 1
  obj->>'camp2' as camp2,                -- Câmp relevant 2
  obj->>'camp3' as camp3                 -- Câmp relevant 3
FROM blocuri b
```

**PASUL 3**: Adaugă filtre WHERE inteligente pentru a găsi DOAR cazurile relevante:
- Folosește pattern matching pentru valori numerice: `obj->>'solutia' ~ '\\d+\\s*ani'`
- Filtrează după materie: `obj->>'materie' ILIKE '%penal%'`
- Filtrează după obiect: `obj->>'obiect' ILIKE '%omor%'`

**PASUL 4**: Adaugă LIMIT responsabil (100-250 cazuri max)

=================================================================================== 📚 EXEMPLE CONCRETE

**Exemplu 1: "Care este durata medie a pedepselor pentru omor?"**

❌ GREȘIT:
```sql
SELECT id, obj FROM blocuri
WHERE obj->>'materie' ILIKE '%penal%'
LIMIT 200
```
Returnează TOT: 16+ câmpuri × 200 cazuri = PREA MULT!

✅ CORECT:
```sql
SELECT
  id,
  obj->>'obiect' as obiect,
  obj->>'materie' as materie,
  obj->>'text_individualizare' as individualizare,
  obj->>'solutia' as solutie
FROM blocuri b
WHERE obj->>'materie' ILIKE '%penal%'
  AND obj->>'obiect' ILIKE '%omor%'
  AND (obj->>'solutia' ~ '\\d+\\s*(ani|luni)'
       OR obj->>'text_individualizare' ~ '\\d+\\s*(ani|luni)')
LIMIT 150
```
Returnează DOAR 5 câmpuri × 150 cazuri = OPTIM!

**IMPORTANT**: Include ÎNTOTDEAUNA 'text_individualizare' când cauți pedepse,
deoarece uneori câmpul 'solutia' poate fi null, dar pedeapsa se află în
secțiunea de individualizare!

**Exemplu 2: "Analizează amenzile pentru furt calificat"**

❌ GREȘIT:
```sql
SELECT id, obj FROM blocuri
WHERE obj->>'obiect' ILIKE '%furt%'
LIMIT 300
```

✅ CORECT:
```sql
SELECT
  id,
  obj->>'obiect' as obiect,
  obj->>'materie' as materie,
  obj->>'solutia' as solutie,
  obj->>'considerente_speta' as considerente
FROM blocuri b
WHERE obj->>'obiect' ILIKE '%furt%calificat%'
  AND obj->>'solutia' ~ '\\d+(\\.\\d+)?\\s*lei'
LIMIT 200
```

**Exemplu 3: "Evoluția pedepselor în ultimii 5 ani"**

✅ CORECT:
```sql
SELECT
  id,
  obj->>'obiect' as obiect,
  obj->>'materie' as materie,
  obj->>'solutia' as solutie,
  obj->>'data_solutiei' as data_solutiei
FROM blocuri b
WHERE obj->>'data_solutiei' IS NOT NULL
  AND obj->>'data_solutiei' >= '2019-01-01'
  AND obj->>'solutia' ~ '\\d+\\s*(ani|luni)'
ORDER BY obj->>'data_solutiei' DESC
LIMIT 250
```

=================================================================================== 🎯 PATTERN-URI REGEX UTILE

Pentru filtrare precisă în WHERE:
- Durate: `~ '\\d+\\s*(ani|luni|zile)'`
- Amenzi: `~ '\\d+(\\.\\d+)?\\s*(lei|RON)'`
- Numere generale: `~ '\\d+'`
- Date: `~ '\\d{{4}}-\\d{{2}}-\\d{{2}}'`

=================================================================================== ✅ CHECKLIST ÎNAINTE DE RĂSPUNS

Verifică că query-ul tău:
- [ ] NU folosește `SELECT id, obj FROM blocuri`
- [ ] Folosește `SELECT id, obj->>'camp1' as camp1, obj->>'camp2' as camp2, ...`
- [ ] Include DOAR 3-7 câmpuri relevante pentru task
- [ ] Are filtre WHERE inteligente cu pattern matching
- [ ] Are LIMIT între 100-250
- [ ] Caută în secțiuni specifice (solutia, individualizare, considerente)

=================================================================================== 📤 FORMAT RĂSPUNS - JSON OBLIGATORIU

{{
  "python_code": "def filter_data(session):\\n    from sqlmodel import text\\n    query = text(\\\"\\\"\\\"\\n        SELECT \\n          id,\\n          obj->>'obiect' as obiect,\\n          obj->>'materie' as materie,\\n          obj->>'solutia' as solutie\\n        FROM blocuri b\\n        WHERE obj->>'materie' ILIKE '%penal%'\\n          AND obj->>'solutia' ~ '\\\\d+\\\\s*ani'\\n        LIMIT 150\\n    \\\"\\\"\\\")\\n    return session.execute(query).mappings().all()",
  "description": "Extrage cazuri penale cu pedepse în ani, folosind doar 4 câmpuri relevante",
  "expected_result_count": 150,
  "filters_applied": ["materie ILIKE '%penal%'", "pattern matching pe solutia", "LIMIT 150"],
  "fields_selected": ["id", "obiect", "materie", "solutia"],
  "rationale": "Pentru analiza duratelor, am selectat doar câmpurile esențiale: obiect, materie și solutia (care conține pedeapsa). Nu am inclus cele 16+ câmpuri pentru a optimiza dimensiunea răspunsului."
}}

⚠️ CERINȚE OBLIGATORII:
- Nume funcție: `filter_data(session)`
- Import `text` în interiorul funcției
- Return: `session.execute(query).mappings().all()`
- LIMIT este OBLIGATORIU (100-250)!
- SELECT cu câmpuri specifice (NU `SELECT id, obj`)
- Include `fields_selected` și `rationale` în JSON

🔥 RĂSPUNDE DOAR CU JSON (FĂRĂ TEXT ÎNAINTE SAU DUPĂ):
"""
        return prompt

    def _build_analysis_prompt(self, user_query: str, filtered_data: List[Dict], metadata: Dict[str, Any] = None) -> str:
        """Construiește promptul pentru ROUND 2 (analiza datelor filtrate)."""

        # Datele sunt deja validate și truncate
        data_json = json.dumps(filtered_data, indent=2, ensure_ascii=False)

        # Info despre truncare dacă există
        truncation_info = ""
        if metadata and metadata.get('truncated', False):
            truncation_info = f"\n⚠️ NOTĂ: Din {metadata['total_cases_filtered']} cazuri filtrate, am inclus {metadata['cases_included_in_prompt']} pentru a respecta limita de context.\n"

        prompt = f"""===================================================================================
🔬 ROUND 2: ANALIZA DATELOR FILTRATE
Tu ești un Data Scientist și Analist Juridic Senior.

TASK-UL ORIGINAL AL UTILIZATORULUI: {user_query}
{truncation_info}
CONTEXT: În ROUND 1, am extras {len(filtered_data)} cazuri relevante din baza de date. Acum trebuie să ANALIZEZI aceste date și să returnezi rezultate statistice.

=================================================================================== 📦 DATELE EXTRASE ({len(filtered_data)} cazuri)
{data_json}

=================================================================================== 🎯 MISIUNEA TA (ROUND 2)
Analizează datele și generează statistici:

1. **Extragere valori numerice**:
   - Dacă câmpul 'solutia'/'solutie' conține valori → extrage-le
   - Dacă 'solutia' este null/gol → caută în 'individualizare'/'text_individualizare'
   - Pattern-uri comune: "X ani", "X luni", "X zile", "X lei", "amenda de X lei"
   - Folosește regex pentru extragere: r'(\d+)\s*(ani|luni|zile|lei)'

2. **Calculează statistici**:
   - Total cazuri analizate
   - Medie, mediană, min, max
   - Distribuție (dacă relevanță)
   - Tendințe temporale (dacă există date)

3. **Interpretare**: Rezumă descoperirile în limbaj natural

=================================================================================== 🚨 REGULI CRITICE - RĂSPUNS JSON OBLIGATORIU!

❌ NU RĂSPUNDE NICIODATĂ CU TEXT NORMAL:
```
Analiza datelor relevă că nu există valori numerice...
```
**DE CE E GREȘIT**: Aplicația așteaptă JSON valid și va da eroare!

✅ RĂSPUNDE ÎNTOTDEAUNA CU JSON, CHIAR DACĂ NU AI DATE:
```json
{{
  "results": {{
    "total_cases_analyzed": 13,
    "error": "Nu s-au găsit valori numerice în câmpurile solutia sau individualizare",
    "data_quality_issues": ["Toate câmpurile 'solutia' sunt null", "Nu s-au găsit pattern-uri numerice în 'individualizare'"]
  }},
  "interpretation": "Datele extrase nu conțin informații numerice despre pedepse. Se recomandă verificarea bazei de date sau ajustarea filtrelor de extragere.",
  "charts": []
}}
```

=================================================================================== 📤 FORMAT RĂSPUNS - EXEMPLE CONCRETE

**Exemplu 1: Date valide cu pedepse**
```json
{{
  "results": {{
    "total_cases_analyzed": 87,
    "mean_sentence_years": 15.3,
    "median_sentence_years": 14.0,
    "min_sentence_years": 5,
    "max_sentence_years": 25,
    "sentence_distribution": {{"5-10 ani": 12, "10-15 ani": 45, "15-20 ani": 25, "20+ ani": 5}}
  }},
  "interpretation": "Analiza a 87 de cazuri de omor relevă o pedeapsă medie de 15.3 ani, cu majoritatea pedepselor (51.7%) în intervalul 10-15 ani. Se observă aplicarea consistentă a pedepselor în limitele legale.",
  "charts": [
    {{
      "type": "bar_chart",
      "title": "Distribuția pedepselor",
      "data": {{"labels": ["5-10 ani", "10-15 ani", "15-20 ani", "20+ ani"], "values": [12, 45, 25, 5]}}
    }}
  ]
}}
```

**Exemplu 2: Date incomplete (câmpuri null)**
```json
{{
  "results": {{
    "total_cases_analyzed": 13,
    "data_source": "individualizare",
    "extracted_values_count": 8,
    "mean_sentence_years": 3.2,
    "note": "Câmpul 'solutia' era null, valorile au fost extrase din 'individualizare' folosind pattern matching"
  }},
  "interpretation": "Din cele 13 cazuri de furt, s-au putut extrage 8 valori numerice din secțiunea de individualizare. Pedeapsa medie este de 3.2 ani. Pentru 5 cazuri nu s-au găsit valori numerice explicite.",
  "charts": []
}}
```

**Exemplu 3: Lipsă date numerice (IMPORTANT!)**
```json
{{
  "results": {{
    "total_cases_analyzed": 10,
    "error": "Extragere eșuată: nu s-au găsit valori numerice",
    "fields_checked": ["solutia", "solutie", "individualizare", "text_individualizare"],
    "suggestion": "Verificați dacă datele conțin informații despre pedepse în alte câmpuri sau dacă este necesară o filtrare mai specifică"
  }},
  "interpretation": "Analiza nu a putut identifica valori numerice în datele furnizate. Câmpurile verificate (solutia, individualizare) nu conțin pattern-uri de tipul 'X ani' sau 'X lei'. Se recomandă verificarea surselor de date.",
  "charts": []
}}
```

=================================================================================== ⚠️ CERINȚE ABSOLUTE

1. Răspunsul TREBUIE să fie JSON valid
2. Cheia 'results' este OBLIGATORIE
3. Cheia 'interpretation' este OBLIGATORIE
4. Cheia 'charts' este OBLIGATORIE (poate fi array gol [])
5. NICIODATĂ nu răspunde cu text explicativ în afara JSON-ului
6. Dacă nu găsești date → returnează JSON cu câmpul 'error'
7. Folosește DOAR escape-uri valide în JSON (\n, \t, \", \\)

🔥 RĂSPUNDE EXCLUSIV CU JSON (ZERO TEXT ÎNAINTE SAU DUPĂ):
"""
        return prompt

    def _execute_filter_code(self, python_code: str) -> List[Dict]:
        """
        Execută codul Python de filtrare generat de LLM.
        """
        from ..lib.python_executor import SecurePythonExecutor

        executor = SecurePythonExecutor()

        # 1. Validare cod
        try:
            executor.validate_code(python_code)
        except ValueError as e:
            raise ValueError(f"Codul generat de LLM nu este sigur: {e}")

        # 2. Wrapper pentru a injecta session-ul DB
        # Definim o funcție wrapper care primește session-ul curent din self.session
        # Dar SecurePythonExecutor rulează exec(), deci trebuie să-i pasăm session-ul cumva.
        # Soluția: Injectăm session-ul în global_scope al executorului sau folosim un closure.
        # Aici vom folosi o abordare unde codul generat folosește 'session' care va fi disponibil în scope.

        # Codul generat este de forma:
        # def filter_data(session):
        #    ...
        #    return ...

        # Noi trebuie să-l apelăm.

        wrapper_code = f"""
{python_code}

# Execuție
# Variabila 'current_session' va fi injectată în globals
filtered_results = filter_data(current_session)
"""

        # Injectăm session-ul curent
        # Modificăm SecurePythonExecutor să accepte variabile extra în scope

        # HACK: Pentru a nu modifica prea mult SecurePythonExecutor acum,
        # vom face un mic bypass controlat sau îl actualizăm.
        # Mai bine actualizăm apelul către executor să suporte context custom.

        # Dar stai, SecurePythonExecutor.execute_code_with_db_access folosește un `exec` simplu.
        # Trebuie să-i dăm session-ul.

        # Rescriem un pic logica de execuție locală aici pentru simplitate,
        # sau instanțiem executorul și îi dăm ce trebuie.

        # Să folosim executorul definit anterior, dar trebuie să-i dăm session-ul.
        # Executorul definit în pasul anterior nu primea session ca parametru la execute.
        # Voi face o mică modificare la logică:

        try:
            # Pregătim scope-ul
            local_scope = {}
            global_scope = {
                'text': text,
                'Session': Session,
                'List': List,
                'Dict': Dict,
                'Any': Any,
                'current_session': self.session # Injectăm sesiunea curentă!
            }

            # Executăm
            exec(wrapper_code, global_scope, local_scope)

            if 'filtered_results' in local_scope:
                raw_data = local_scope['filtered_results']
            else:
                raise RuntimeError("Codul nu a returnat 'filtered_results'")

        except Exception as e:
            raise RuntimeError(f"Eroare execuție cod filtrare: {e}")

        # Procesare rezultate (Flatten)
        processed = []
        for row in raw_data:
            # row este un RowMapping sau dict
            # Poate conține fie 'obj' (JSONB complet) fie câmpuri individuale

            # Dacă e RowMapping, accesăm ca dict
            if hasattr(row, '_mapping'):
                row_dict = dict(row._mapping)
            else:
                row_dict = dict(row)

            # Verificăm dacă avem câmpul 'obj' (query vechi: SELECT id, obj)
            if 'obj' in row_dict:
                obj_data = row_dict.get('obj', {})

                if isinstance(obj_data, str):
                    try:
                        obj_data = json.loads(obj_data)
                    except:
                        obj_data = {}

                if not isinstance(obj_data, dict):
                    obj_data = {}

                # Combinăm ID cu datele din obj
                flat_item = {
                    'id': row_dict.get('id'),
                    **obj_data
                }
            else:
                # Query nou: SELECT id, obj->>'field1' as field1, obj->>'field2' as field2
                # Deja avem câmpurile ca și coloane separate
                flat_item = row_dict

            processed.append(flat_item)

        return processed

    def _parse_json_response(self, content: str) -> Dict:
        """Parse răspuns JSON de la LLM, gestionând potențiale markdown blocks."""
        content = content.strip()

        # Eliminăm markdown code blocks ```json ... ```
        if content.startswith("```"):
            # Căutăm primul {
            start = content.find("{")
            # Căutăm ultimul }
            end = content.rfind("}")
            if start != -1 and end != -1:
                content = content[start:end+1]

        # Încercăm să găsim JSON-ul dacă e îngropat în text
        start = content.find('{')
        end = content.rfind('}')

        if start != -1 and end != -1:
            json_str = content[start:end+1]
            return json.loads(json_str)

        raise ValueError("Nu s-a găsit JSON valid în răspuns")

    def _identify_query_type(self, query: str) -> str:
        """Identifică tipul query-ului bazat pe cuvinte cheie."""
        query_lower = query.lower()

        # Detectare durate/pedepse
        if any(word in query_lower for word in ['durata', 'pedeapsa', 'pedepse', 'ani', 'luni', 'condamnare', 'inchisoare', 'detentie']):
            return 'durate'

        # Detectare amenzi
        elif any(word in query_lower for word in ['amenda', 'amendă', 'lei', 'suma', 'bani']):
            return 'amenzi'

        # Detectare tendințe temporale
        elif any(word in query_lower for word in ['evolutie', 'evoluție', 'tendinta', 'tendință', 'timp', 'crestere', 'scadere', 'perioada']):
            return 'tendinte'

        # Detectare motive/considerente
        elif any(word in query_lower for word in ['motiv', 'considerent', 'argumentare', 'justificare', 'rationament']):
            return 'motive'

        # Default: general
        else:
            return 'general'

    def _extract_relevant_fields(self, user_query: str, filtered_data: List[Dict]) -> List[Dict]:
        """Extrage doar câmpurile relevante pentru query, reducând dimensiunea datelor."""

        # Identifică tipul query-ului
        query_type = self._identify_query_type(user_query)

        logger.info(f"[EXTRAGERE] Query type identificat: {query_type}")

        # Mapping câmpuri relevante pentru fiecare tip de query
        field_mappings = {
            'durate': ['id', 'obiect', 'materie', 'text_individualizare', 'individualizare', 'solutia', 'solutie', 'data_solutiei'],
            'amenzi': ['id', 'obiect', 'materie', 'solutia', 'solutie', 'considerente_speta', 'considerente'],
            'tendinte': ['id', 'obiect', 'materie', 'solutia', 'solutie', 'data_solutiei'],
            'motive': ['id', 'obiect', 'materie', 'considerente_speta', 'considerente', 'argumente_instanta', 'solutia', 'solutie'],
            'general': ['id', 'obiect', 'materie', 'solutia', 'solutie', 'text_individualizare', 'individualizare', 'considerente_speta']
        }

        relevant_fields = field_mappings.get(query_type, field_mappings['general'])

        # Extragere câmpuri relevante
        result = []
        for case in filtered_data:
            filtered_case = {}
            for field in relevant_fields:
                if field in case:
                    value = case[field]
                    # Truncăm textele foarte lungi (> 2000 chars) pentru a economisi spațiu
                    if isinstance(value, str) and len(value) > 2000:
                        filtered_case[field] = value[:2000] + "...[truncat]"
                    else:
                        filtered_case[field] = value

            # Include întotdeauna ID-ul
            if 'id' not in filtered_case and 'id' in case:
                filtered_case['id'] = case['id']

            result.append(filtered_case)

        logger.info(f"[EXTRAGERE] Redus de la {len(filtered_data)} cazuri cu toate câmpurile la {len(result)} cazuri cu câmpuri relevante")

        return result

    def _validate_and_truncate_data(
        self,
        filtered_data: List[Dict],
        user_query: str,
        max_chars: int = 30000
    ) -> Tuple[List[Dict], Dict[str, Any]]:
        """
        Validează și truncă datele pentru a nu depăși max_chars.

        Returns:
            Tuple[truncated_data, metadata]
        """

        # Construim un prompt gol pentru a estima dimensiunea de bază
        base_prompt = f"""===================================================================================
🔬 ROUND 2: ANALIZA DATELOR FILTRATE
Tu ești un Data Scientist și Analist Juridic Senior.

TASK-UL ORIGINAL AL UTILIZATORULUI: {user_query}

CONTEXT: În ROUND 1, am extras cazuri relevante din baza de date.

===================================================================================
📦 DATELE EXTRASE

===================================================================================
🎯 MISIUNEA TA (ROUND 2)
Analizează datele de mai sus și generează:
1. Statistici descriptive (medie, mediană, etc.)
2. Tendințe (evoluție în timp)
3. Corelații (dacă e relevant)
4. Interpretare în limbaj natural (concluzii clare)

===================================================================================
📤 FORMAT RĂSPUNS - JSON OBLIGATORIU
{{
  "results": {{
    "total_cases_analyzed": 87,
    "mean_sentence_years": 15.3
  }},
  "interpretation": "Analiza relevă...",
  "charts": []
}}

RĂSPUNDE DOAR CU JSON:
"""

        base_size = len(base_prompt)

        # Spațiu disponibil pentru date (cu buffer de siguranță de 2000 chars)
        available_space = max_chars - base_size - 2000

        if available_space <= 0:
            logger.warning(f"[VALIDARE] Base prompt prea mare: {base_size} chars. Forțăm spațiu minim.")
            available_space = 5000  # Minimum absolut pentru date

        logger.info(f"[VALIDARE] Spațiu disponibil pentru date: {available_space} caractere")

        # Procesare date cu truncare progresivă
        truncated_data = []
        current_size = 0
        cases_included = 0

        for case in filtered_data:
            # Serializare caz individual
            case_json = json.dumps(case, ensure_ascii=False, separators=(',', ':'))  # Compact JSON
            case_size = len(case_json)

            # Verificăm dacă mai avem spațiu
            if current_size + case_size + 10 <= available_space:  # +10 pentru separatori
                truncated_data.append(case)
                current_size += case_size + 10
                cases_included += 1
            else:
                # Nu mai avem spațiu, oprim
                logger.info(f"[VALIDARE] Truncare la {cases_included} cazuri pentru a respecta limita")
                break

        # Calculăm dimensiunea finală estimată
        final_data_json = json.dumps(truncated_data, indent=2, ensure_ascii=False)
        final_data_size = len(final_data_json)
        estimated_total = base_size + final_data_size

        metadata = {
            'total_cases_filtered': len(filtered_data),
            'cases_included_in_prompt': cases_included,
            'base_prompt_size': base_size,
            'data_size': final_data_size,
            'estimated_prompt_size': estimated_total,
            'truncated': cases_included < len(filtered_data),
            'available_space': available_space,
            'max_chars_limit': max_chars
        }

        # Log important pentru debugging
        logger.info(f"[VALIDARE] ✓ Prompt Round 2 validat:")
        logger.info(f"  - Cazuri incluse: {cases_included}/{len(filtered_data)}")
        logger.info(f"  - Dimensiune estimată: {estimated_total:,} / {max_chars:,} caractere")
        logger.info(f"  - Spațiu rămas: {max_chars - estimated_total:,} caractere")

        if estimated_total > max_chars:
            logger.warning(f"[VALIDARE] ⚠️ ATENȚIE: Prompt estimat ({estimated_total}) depășește limita ({max_chars})!")

        return truncated_data, metadata
