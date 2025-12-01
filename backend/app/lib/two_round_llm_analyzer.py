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

        # Construire PROMPT 2
        prompt_round_2 = self._build_analysis_prompt(user_query, filtered_data)

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
            'cases_analyzed': len(filtered_data)
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
Generează cod Python care să FILTREZE și să EXTRAGĂ DOAR datele relevante din baza de date PostgreSQL pentru task-ul de mai sus.

⚠️ IMPORTANT: NU trebuie să faci analiza statistică acum! Doar FILTREAZĂ datele!
Analiza se va face în ROUND 2, după ce datele sunt extrase.

=================================================================================== 📊 SCHEMA COMPLETĂ A BAZEI DE DATE (PostgreSQL)
Tabel principal: blocuri

Structură tabel:
CREATE TABLE blocuri (
    id INTEGER PRIMARY KEY,
    obj JSONB,                    -- Câmp JSONB cu toate datele cazului juridic
    vector FLOAT[],               -- Vector embedding pentru căutare semantică
    modele_speta JSONB,           -- Modele de documente relevante
    coduri_speta JSONB,           -- Articole de lege relevante
    updated_at TIMESTAMP          -- Data ultimei actualizări
);

=================================================================================== 📦 CÂMPURI DISPONIBILE ÎN obj (JSONB)
1. materie (string) - ex: "Penal", "Civil"
2. obiect (string) - ex: "Omor", "Furt calificat"
3. solutia (string) - ex: "Condamnare la 15 ani..."
4. considerente_speta (string) - Motivarea instanței
5. argumente_instanta (string) - Argumente
6. tip_speta (string) - ex: "Apel", "Recurs"
7. parte (string) - ex: "Reclamant", "Inculpat"
8. text_individualizare (string) - Circumstanțe
9. tip_act_juridic (string) - ex: "Decizie penală"
10. denumire (string) - Titlul cazului
11. text_situatia_de_fapt / situatia_de_fapt / situatie (string) - Faptele cauzei
12. text_doctrina (string)
13. text_ce_invatam (string)
14. Rezumat_generat_de_AI_Cod (string)
15. keywords (array[string])
16. data_solutiei (string/date) - ex: "2023-11-15"

=================================================================================== 🎯 INSTRUCȚIUNI PENTRU COD FILTRARE
1. OBIECTIV: Extrage DOAR cazurile relevante (LIMIT 100-500)
2. LOGICA: Folosește filtre SQL inteligente (WHERE clauses) pe câmpurile JSONB.
3. FORMAT: Returnează întotdeauna `SELECT id, obj FROM blocuri ...`

Exemplu logică filtrare (Pedepse omor):
WHERE b.obj->>'materie' ILIKE '%penal%'
  AND (b.obj->>'obiect' ILIKE '%omor%' OR b.obj->>'obiect' ILIKE '%omucidere%')
  AND (b.obj->>'solutia' ~ '\\d+\\s*ani' OR b.obj->>'considerente_speta' ~ '\\d+\\s*ani')
LIMIT 300

=================================================================================== 📤 FORMAT RĂSPUNS - JSON OBLIGATORIU
Răspunsul tău TREBUIE să fie un JSON STRICT cu această structură:

{{
  "python_code": "def filter_data(session):\\n    from sqlmodel import text\\n    query = text(\\\"\\\"\\\"\\n        SELECT id, obj\\n        FROM blocuri b\\n        WHERE b.obj->>'materie' ILIKE '%penal%'\\n        LIMIT 200\\n    \\\"\\\"\\\")\\n    return session.execute(query).mappings().all()",
  "description": "Descriere filtre...",
  "expected_result_count": 200,
  "filters_applied": ["materie ILIKE '%penal%'", "LIMIT 200"]
}}

⚠️ ATENȚIE:
- Nume funcție: `filter_data(session)`
- Import `text` în interiorul funcției
- Return: `session.execute(query).mappings().all()`
- LIMIT este OBLIGATORIU!
- JSON valid (escape la ghilimele și newlines)

RĂSPUNDE DOAR CU JSON:
"""
        return prompt

    def _build_analysis_prompt(self, user_query: str, filtered_data: List[Dict]) -> str:
        """Construiește promptul pentru ROUND 2 (analiza datelor filtrate)."""

        # Serializare date filtrate în JSON
        # Limităm la 500 cazuri pentru a nu depăși contextul, deși filtrarea ar trebui să se ocupe de asta
        data_to_send = filtered_data[:500]
        data_json = json.dumps(data_to_send, indent=2, ensure_ascii=False)

        prompt = f"""===================================================================================
🔬 ROUND 2: ANALIZA DATELOR FILTRATE
Tu ești un Data Scientist și Analist Juridic Senior.

TASK-UL ORIGINAL AL UTILIZATORULUI: {user_query}

CONTEXT: În ROUND 1, am extras {len(data_to_send)} cazuri relevante din baza de date. Acum trebuie să ANALIZEZI aceste date și să returnezi rezultate statistice.

=================================================================================== 📦 DATELE EXTRASE ({len(data_to_send)} cazuri)
{data_json}

=================================================================================== 🎯 MISIUNEA TA (ROUND 2)
Analizează datele de mai sus și generează:
1. Statistici descriptive (medie, mediană, etc.)
2. Tendințe (evoluție în timp)
3. Corelații (dacă e relevant)
4. Interpretare în limbaj natural (concluzii clare)

=================================================================================== 📤 FORMAT RĂSPUNS - JSON OBLIGATORIU
{{
  "results": {{
    "total_cases_analyzed": 87,
    "mean_sentence_years": 15.3,
    "trend_by_year": {{"2019": 14.5, "2020": 15.1}},
    "statistical_significance": "..."
  }},
  "interpretation": "Analiza relevă...",
  "charts": [
    {{
      "type": "line_chart",
      "title": "Evoluția pedepselor",
      "data": {{"labels": ["2019", "2020"], "values": [14.5, 15.1]}}
    }}
  ]
}}

RĂSPUNDE DOAR CU JSON:
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
            # row['obj'] este JSONB-ul

            # Dacă e RowMapping, accesăm ca dict
            if hasattr(row, '_mapping'):
                row_dict = dict(row._mapping)
            else:
                row_dict = dict(row)

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
