"""
Modul pentru analiza avansată în 3 etape (Map-Reduce) cu LLM worker.
"""
import logging
import json
import os
import time
import uuid
import re
from sqlmodel import Session, text
from typing import Dict, Any, List, Tuple, Optional
from ..settings_manager import settings_manager

logger = logging.getLogger(__name__)

class TwoRoundLLMAnalyzer:
    """
    Orchestrează analiza avansată (Map-Reduce) cu LLM worker.
    Deși numele este TwoRoundLLMAnalyzer (pentru compatibilitate), intern folosește o arhitectură în 3 etape:
    Phase 1: Discovery & Planning (Smart Projection)
    Phase 2: Batch Execution (Map)
    Phase 3: Final Synthesis (Reduce)
    """

    def __init__(self, session: Session):
        self.session = session
        self.plans_dir = "analyzer_plans"  # Directory for saving plans
        os.makedirs(self.plans_dir, exist_ok=True)

    async def analyze(self, user_query: str) -> Dict[str, Any]:
        """
        Procesul complet de analiză (Wrapper pentru compatibilitate).
        Execută secvențial cele 3 etape ale noii arhitecturi.
        """
        try:
            logger.info(f"--- START ANALYSIS (Three-Stage Engine): {user_query[:50]}... ---")

            # Phase 1: Discovery & Planning
            plan_res = await self.create_plan(user_query)
            if not plan_res['success']:
                return plan_res

            plan_id = plan_res['plan_id']
            total_chunks = plan_res['total_chunks']

            logger.info(f"[ORCHESTRATOR] Plan {plan_id} created. Processing {total_chunks} chunks...")

            # Phase 2: Batch Execution (Map)
            # Executăm secvențial chunk-urile (pentru acest wrapper simplu)
            for i in range(total_chunks):
                chunk_res = await self.execute_chunk(plan_id, i)
                if not chunk_res['success']:
                    logger.error(f"[ORCHESTRATOR] Chunk {i} failed: {chunk_res.get('error')}")
                    # Continuăm cu celelalte chunk-uri, Phase 3 va gestiona lipsurile

            # Phase 3: Final Synthesis (Reduce)
            final_result = await self.synthesize_results(plan_id)

            return final_result

        except Exception as e:
            logger.error(f"[ORCHESTRATOR] Eroare critică: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    async def create_plan(self, user_query: str) -> Dict[str, Any]:
        """
        PHASE 1: Discovery & Planning
        Analizează cererea și creează un plan de execuție optimizat.
        """
        try:
            logger.info(f"--- START PHASE 1: DISCOVERY & PLANNING for: {user_query[:50]}... ---")

            # 1. Generare strategie (SQL + Coloane)
            strategy = await self._generate_discovery_strategy(user_query)

            # 2. Execuție query-uri de descoperire (COUNT + ID_LIST)
            total_cases, all_ids = self._execute_discovery_queries(strategy)

            if total_cases == 0:
                return {
                    'success': False,
                    'error': 'Nu s-au găsit date relevante pentru această interogare.'
                }

            # 3. Calculare Chunks
            # Estimăm mărimea unui caz pe baza numărului de coloane selectate
            # Un caz full are ~2000 tokens. Dacă selectăm doar 3-4 coloane, avem ~200-300 tokens.
            # 30k tokens limită / 300 tokens = ~100 cazuri per chunk.
            # Fiind conservatori, folosim 50 cazuri per chunk.
            chunk_size = 50
            chunks = [all_ids[i:i + chunk_size] for i in range(0, len(all_ids), chunk_size)]

            # 4. Generare Plan Object
            plan_id = str(uuid.uuid4())
            plan = {
                "plan_id": plan_id,
                "user_query": user_query,
                "strategy": strategy, # Conține coloanele selectate
                "total_cases": total_cases,
                "total_chunks": len(chunks),
                "chunk_size": chunk_size,
                "chunks": chunks, # Lista de liste de ID-uri
                "created_at": time.time(),
                "status": "created"
            }

            # 5. Salvare Plan
            self._save_plan(plan)

            # 6. Preview (Opțional - primele 3 cazuri pentru UI)
            preview_ids = all_ids[:3]
            preview_data = self._fetch_chunk_data(preview_ids, strategy['selected_columns'])

            logger.info(f"[PHASE 1] Plan creat: {plan_id}. Total cazuri: {total_cases}. Chunks: {len(chunks)}.")

            return {
                'success': True,
                'plan_id': plan_id,
                'total_cases': total_cases,
                'total_chunks': len(chunks),
                'estimated_time_seconds': len(chunks) * 5, # Estimare grosieră
                'preview_data': preview_data,
                'strategy_summary': strategy.get('rationale', 'Strategie generată automat.')
            }

        except Exception as e:
            logger.error(f"[PHASE 1] Eroare critică: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    async def execute_chunk(self, plan_id: str, chunk_index: int) -> Dict[str, Any]:
        """
        PHASE 2: Batch Execution (Worker)
        Execută analiza pentru un singur chunk.
        """
        try:
            # 1. Încărcare Plan
            plan_path = os.path.join(self.plans_dir, f"{plan_id}.json")
            if not os.path.exists(plan_path):
                raise FileNotFoundError(f"Planul {plan_id} nu există.")

            with open(plan_path, 'r', encoding='utf-8') as f:
                plan = json.load(f)

            chunks = plan['chunks']
            if chunk_index < 0 or chunk_index >= len(chunks):
                raise IndexError(f"Chunk index {chunk_index} invalid. Total chunks: {len(chunks)}")

            chunk_ids = chunks[chunk_index]
            selected_columns = plan['strategy']['selected_columns']
            user_query = plan['user_query']

            logger.info(f"[PHASE 2] Executing Chunk {chunk_index + 1}/{len(chunks)} for Plan {plan_id}. IDs: {len(chunk_ids)}")

            # 2. Smart Fetch
            chunk_data = self._fetch_chunk_data(chunk_ids, selected_columns)

            # 2.1. Validare și Truncare (Safety Net)
            truncated_data, metadata = self._validate_and_truncate_data(chunk_data, user_query, max_chars=30000)

            if metadata['truncated']:
                logger.warning(f"[PHASE 2] Chunk {chunk_index} truncated: {metadata['cases_included_in_prompt']}/{len(chunk_data)} cases included.")

            # 3. Analiză LLM (Map)
            from ..lib.network_file_saver import NetworkFileSaver

            prompt = self._build_chunk_analysis_prompt(user_query, truncated_data, chunk_index, len(chunks))

            # Logică de rețea
            retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
            retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

            success, message, saved_path = NetworkFileSaver.save_to_network(
                content=prompt,
                host=retea_host,
                shared_folder=retea_folder,
                subfolder=''
            )

            if not success:
                raise RuntimeError(f"Eroare salvare prompt Chunk {chunk_index}: {message}")

            poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
                saved_path=saved_path,
                timeout_seconds=600,
                poll_interval=5
            )

            if not poll_success:
                raise RuntimeError(f"Timeout Chunk {chunk_index}: {poll_content}")

            # Parsare rezultat
            try:
                chunk_result = self._parse_json_response(poll_content)
                NetworkFileSaver.delete_response_file(response_path)
            except Exception as e:
                logger.error(f"Eroare parsare răspuns Chunk {chunk_index}: {e}")
                return {
                    'success': False,
                    'chunk_index': chunk_index,
                    'error': str(e),
                    'raw_response': poll_content[:1000]
                }

            # 4. Salvare Rezultat Chunk
            result_file = os.path.join(self.plans_dir, f"{plan_id}_chunk_{chunk_index}.json")
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(chunk_result, f, indent=2, ensure_ascii=False)

            return {
                'success': True,
                'chunk_index': chunk_index,
                'cases_analyzed': len(chunk_data),
                'result_summary': chunk_result.get('summary', 'N/A')
            }

        except Exception as e:
            logger.error(f"[PHASE 2] Eroare Chunk {chunk_index}: {e}", exc_info=True)
            return {
                'success': False,
                'chunk_index': chunk_index,
                'error': str(e)
            }

    async def synthesize_results(self, plan_id: str) -> Dict[str, Any]:
        """
        PHASE 3: Final Synthesis (Analyst)
        Agregă rezultatele și generează răspunsul final.
        """
        try:
            # 1. Încărcare Plan
            plan_path = os.path.join(self.plans_dir, f"{plan_id}.json")
            if not os.path.exists(plan_path):
                raise FileNotFoundError(f"Planul {plan_id} nu există.")

            with open(plan_path, 'r', encoding='utf-8') as f:
                plan = json.load(f)

            user_query = plan['user_query']
            total_chunks = plan['total_chunks']

            # 2. Încărcare Rezultate Chunks
            aggregated_data = []
            missing_chunks = []

            for i in range(total_chunks):
                chunk_file = os.path.join(self.plans_dir, f"{plan_id}_chunk_{i}.json")
                if os.path.exists(chunk_file):
                    with open(chunk_file, 'r', encoding='utf-8') as f:
                        try:
                            chunk_res = json.load(f)
                            aggregated_data.append(chunk_res)
                        except json.JSONDecodeError:
                            missing_chunks.append(i)
                else:
                    missing_chunks.append(i)

            # Notă: Dacă nu avem niciun rezultat (toate chunks au eșuat), tot încercăm sinteza pentru a raporta eroarea
            if not aggregated_data and len(missing_chunks) == total_chunks:
                 return {
                    'success': False,
                    'error': 'Toate etapele de procesare (chunks) au eșuat. Nu se poate realiza sinteza.'
                }

            logger.info(f"[PHASE 3] Synthesizing results from {len(aggregated_data)} chunks. Missing: {len(missing_chunks)}")

            # 3. Sinteză LLM (Reduce)
            from ..lib.network_file_saver import NetworkFileSaver

            prompt = self._build_synthesis_prompt(user_query, aggregated_data, missing_chunks)

            # Logică de rețea
            retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
            retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

            success, message, saved_path = NetworkFileSaver.save_to_network(
                content=prompt,
                host=retea_host,
                shared_folder=retea_folder,
                subfolder=''
            )

            if not success:
                raise RuntimeError(f"Eroare salvare prompt Synthesis: {message}")

            poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
                saved_path=saved_path,
                timeout_seconds=600,
                poll_interval=5
            )

            if not poll_success:
                raise RuntimeError(f"Timeout Synthesis: {poll_content}")

            # Parsare rezultat final
            try:
                final_result = self._parse_json_response(poll_content)
                NetworkFileSaver.delete_response_file(response_path)
            except Exception as e:
                logger.error(f"Eroare parsare răspuns Synthesis: {e}")
                # Fallback manual pentru UI dacă parsarea eșuează total chiar și cu fallback-ul din parser
                return {
                     "results": {"error": "Formatare incorectă de la LLM"},
                     "interpretation": f"Sistemul a primit un răspuns, dar nu l-a putut formata automat. Conținut brut: {poll_content[:500]}...",
                     "charts": [],
                     "process_metadata": {
                        'plan_id': plan_id,
                        'chunks_processed': len(aggregated_data)
                    }
                }

            # Adăugăm metadate despre proces
            final_result['process_metadata'] = {
                'plan_id': plan_id,
                'total_cases': plan.get('total_cases', 0),
                'chunks_processed': len(aggregated_data),
                'chunks_missing': len(missing_chunks)
            }

            return final_result

        except Exception as e:
            logger.error(f"[PHASE 3] Eroare Synthesis: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    # =================================================================================================
    # HELPER METHODS - PHASE 3 (REDUCE)
    # =================================================================================================

    def _build_synthesis_prompt(self, user_query: str, aggregated_data: List[Dict], missing_chunks: List[int]) -> str:
        clean_aggregation = []
        for chunk in aggregated_data:
            clean_aggregation.append({
                "chunk_index": chunk.get("chunk_index"),
                "extracted_data": chunk.get("extracted_data"),
                "partial_stats": chunk.get("partial_stats")
            })

        data_json = json.dumps(clean_aggregation, indent=2, ensure_ascii=False)

        missing_info = ""
        if missing_chunks:
            missing_info = f"\n⚠️ ATENȚIE: Lipsesc datele din chunks: {missing_chunks}. Rezultatul poate fi incomplet."

        return f"""===================================================================================
🔬 PHASE 3: FINAL SYNTHESIS (REDUCE)
===================================================================================
Tu ești Analistul Șef. Ai primit rapoarte parțiale de la mai mulți workeri (chunks).
Trebuie să agregezi aceste date și să formulezi RĂSPUNSUL FINAL pentru utilizator.

TASK UTILIZATOR: "{user_query}"
{missing_info}

=================================================================================== 📦 REZULTATE AGREGATE (CHUNKS)
{data_json}

=================================================================================== 🎯 MISIUNEA TA
1. Agregă datele numerice (calculează medii ponderate, sume totale etc.).
2. Identifică tendințele calitative din datele extrase.
3. Formulează un răspuns final clar, profesional și bazat STRICT pe date.

⚠️ DACĂ DATELE SUNT INSUFICIENTE:
Nu refuza să răspunzi! Formulează o concluzie calitativă despre de ce nu s-au putut extrage datele și pune-o în câmpul "interpretation".
Returnează TOTUȘI UN JSON VALID.

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "results": {{
      "total_analyzed": 150,
      "final_stats": {{ "mean": 5.5, "median": 5, "unit": "ani" }},
      "distribution": {{ "1-3 ani": 10, "3-5 ani": 20 }}
  }},
  "interpretation": "Analiza a 150 de cazuri arată că media pedepselor este de 5.5 ani...",
  "charts": [
      {{ "type": "bar", "title": "Distribuție", "data": ... }}
  ]
}}

RĂSPUNDE DOAR CU JSON:
"""

    def _build_chunk_analysis_prompt(self, user_query: str, chunk_data: List[Dict], chunk_index: int, total_chunks: int) -> str:
        data_json = json.dumps(chunk_data, indent=2, ensure_ascii=False)
        return f"""===================================================================================
🔬 PHASE 2: BATCH EXECUTION (CHUNK {chunk_index + 1}/{total_chunks})
===================================================================================
Tu ești un Data Scientist și Analist Juridic Senior (Worker). Analizezi un mic lot de date (Chunk) ca parte a unui proces mai mare.

TASK UTILIZATOR: "{user_query}"

=================================================================================== 📦 DATELE TALE (CHUNK)
{data_json}

=================================================================================== 🎯 MISIUNEA TA
Analizează ACEST set de date și extrage informațiile relevante pentru task.
NU încerca să răspunzi final la întrebare! Doar extrage datele brute sau statistici parțiale.

1. **Extragere valori numerice**:
   - Dacă câmpul principal (ex: 'solutia') e gol, caută în 'text_individualizare' sau 'considerente'.
   - Pattern-uri comune: "X ani", "X luni", "X zile", "X lei", "amenda de X lei".
   - Folosește regex pentru extragere: `r'(\\d+)\\s*(ani|luni|zile|lei)'`.

2. **Sinteză parțială**:
   - Numără cazurile relevante din acest chunk.
   - Calculează sume/medii parțiale dacă e posibil.

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "chunk_index": {chunk_index},
  "analyzed_count": {len(chunk_data)},
  "extracted_data": [
      {{ "id": 123, "valoare": 5, "unitate": "ani", "context": "pedeapsa principala" }},
      {{ "id": 124, "valoare": null, "motiv": "nu s-a gasit in text" }}
  ],
  "partial_stats": {{
      "sum": 5,
      "count": 1,
      "min": 5,
      "max": 5
  }},
  "qualitative_notes": "Un caz relevant identificat."
}}

⚠️ REGULI:
- Răspunde DOAR cu JSON.
- Nu inventa date.
- Dacă nu găsești nimic, returnează liste goale.

RĂSPUNDE DOAR CU JSON:
"""

    # =================================================================================================
    # HELPER METHODS - PHASE 1 (DISCOVERY)
    # =================================================================================================

    async def _generate_discovery_strategy(self, user_query: str) -> Dict[str, Any]:
        """
        Folosește LLM pentru a genera SQL-ul de discovery și lista de coloane necesare.
        """
        from ..lib.network_file_saver import NetworkFileSaver

        prompt = self._build_discovery_prompt(user_query)

        # Logică de rețea
        retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
        retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

        success, message, saved_path = NetworkFileSaver.save_to_network(
            content=prompt,
            host=retea_host,
            shared_folder=retea_folder,
            subfolder=''
        )

        if not success:
            raise RuntimeError(f"Eroare salvare prompt Discovery: {message}")

        poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
            saved_path=saved_path,
            timeout_seconds=600,
            poll_interval=5
        )

        if not poll_success:
            raise RuntimeError(f"Timeout Discovery: {poll_content}")

        # Parsare
        try:
            strategy = self._parse_json_response(poll_content)
            NetworkFileSaver.delete_response_file(response_path)
            return strategy
        except Exception as e:
            logger.error(f"Eroare parsare răspuns Discovery: {e}")
            raise ValueError(f"LLM a returnat un răspuns invalid în Phase 1: {e}")

    def _build_discovery_prompt(self, user_query: str) -> str:
        return f"""===================================================================================
🔬 PHASE 1: DISCOVERY & PLANNING (SMART PROJECTION)
===================================================================================
Tu ești un Senior Python & SQL Developer specializat în optimizarea query-urilor pe baze de date juridice PostgreSQL.
Scopul tău este să planifici execuția eficientă pentru o analiză Big Data pe cazuri juridice.

TASK UTILIZATOR: "{user_query}"

=================================================================================== 📊 SCHEMA BAZEI DE DATE
Tabel: blocuri (id INTEGER PRIMARY KEY, obj JSONB)
Câmpuri JSONB disponibile în 'obj':
1. număr_dosar (string) - Ex: "Sentinţa Civilă nr.93", "Decizie nr. 1405/2021"
2. tip_solutie (string) - Ex: "Stabileşte competenţa", "Respinge apelul", "Menține sentința"
3. tip_cale_atac (string) - Ex: "Definitivă", "Apel", "Recurs"
4. cereri_accesorii (string) - Ex: "cheltuieli de judecată", "daune materiale și morale"
5. tip_act_juridic (string) - Ex: "Cerere de chemare în judecată", "Contestație la executare"
6. probele_retinute (string) - Ex: "null", "înscrisuri", "Declarații martori, expertiză medico-legală"
7. keywords (array/string) - Ex: ["Conflict de competență", "Litigii de muncă"], ["executare silită", "perimare"]
8. titlu (string) - Titlul complet al deciziei
9. text_denumire_articol (string) - Titlul articolului pentru SEO
10. text_situatia_de_fapt (string) - Descriere detaliată a faptelor cauzei (FOARTE MARE!)
11. text_ce_invatam (string) - Principii de drept și lecții extrase
12. text_individualizare (string) - Elementele unice care particularizează speța (FOARTE IMPORTANT PENTRU PEDEPSE!)
13. text_doctrina (string) - Referințe doctrinare (poate fi "null")
14. sursa (string) - Ex: "preluat din www.rolii.ro"
15. obiect (string) - Ex: "conflict negativ de competenţă", "contestație la executare", "omor", "furt"
16. materie (string) - Ex: "Codul Muncii", "CoduldeProceduraCivila", "Codul Penal"
17. articol_incident (string) - Lista articolelor de lege invocate
18. Rezumat_generat_de_AI_Cod (string) - Rezumat AI al deciziei
19. analiza_judecator (string) - Analiza critică a judecătorului
20. Considerentele (string) - Considerentele instanței (FOARTE MARE!)
21. Dispozitivul (string) - Dispozitivul deciziei
22. argumente_instanta (string) - Argumentele utilizate de instanță
23. solutia (string) - Soluția pronunțată (poate include pedepse/amenzi)
24. considerente_speta (string) - Motivarea specifică
25. data_solutiei (string/date) - Data pronunțării (YYYY-MM-DD)

=================================================================================== 🚨 REGULI CRITICE DE SQL - CITEȘTE CU ATENȚIE!

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
**DE CE E CORECT**: Extrage DOAR câmpurile necesare pentru task (Smart Projection).

=================================================================================== 📝 GHID PAS-CU-PAS PENTRU GENERAREA QUERY-ULUI

**PASUL 1**: Analizează task-ul utilizatorului și identifică ce tip de date îi trebuie:
- **Durate pedepse** → număr_dosar, obiect, materie, text_individualizare, solutia, tip_solutie, Rezumat_generat_de_AI_Cod
- **Amenzi** → număr_dosar, obiect, materie, solutia, considerente_speta, tip_solutie
- **Tendințe temporale** → număr_dosar, obiect, materie, solutia, data_solutiei, tip_solutie
- **Motive/argumentare** → număr_dosar, obiect, materie, considerente_speta, argumente_instanta, analiza_judecator

**PASUL 2**: Construiește filtre WHERE inteligente:
- Folosește operatorul `->>` pentru a accesa câmpuri JSONB ca text.
- Pentru array-uri (ex: keywords), folosește `~` (regex) nu `ILIKE`.
- Folosește pattern matching pentru valori numerice: `obj->>'solutia' ~ '\\d+\\s*ani'`.

=================================================================================== 📚 EXEMPLE DE STRATEGIE

Exemplu 1: "Care este durata medie a pedepselor pentru omor?"
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE obj->>'materie' ILIKE '%penal%' AND obj->>'obiect' ILIKE '%omor%'",
  "id_list_query": "SELECT id FROM blocuri WHERE obj->>'materie' ILIKE '%penal%' AND obj->>'obiect' ILIKE '%omor%' AND (obj->>'solutia' ~ '\\\\d+\\\\s*(ani|luni)' OR obj->>'text_individualizare' ~ '\\\\d+\\\\s*(ani|luni)')",
  "selected_columns": ["solutia", "text_individualizare", "obiect", "materie"],
  "rationale": "Am selectat 'solutia' și 'text_individualizare' pentru a extrage durata pedepselor. Filtrul asigură că avem valori numerice."
}}

Exemplu 2: "Evoluția amenzilor pentru furt în ultimii 5 ani"
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE obj->>'obiect' ILIKE '%furt%' AND obj->>'solutia' ~ '\\\\d+(\\\\.\\\\d+)?\\\\s*lei' AND obj->>'data_solutiei' >= '2020-01-01'",
  "id_list_query": "SELECT id FROM blocuri WHERE obj->>'obiect' ILIKE '%furt%' AND obj->>'solutia' ~ '\\\\d+(\\\\.\\\\d+)?\\\\s*lei' AND obj->>'data_solutiei' >= '2020-01-01'",
  "selected_columns": ["solutia", "data_solutiei", "obiect"],
  "rationale": "Am nevoie de 'solutia' pentru sume și 'data_solutiei' pentru evoluția în timp."
}}

=================================================================================== 🎯 PATTERN-URI REGEX UTILE (PENTRU WHERE)
- Durate: `~ '\\d+\\s*(ani|luni|zile)'`
- Amenzi: `~ '\\d+(\\.\\d+)?\\s*(lei|RON)'`
- Date: `~ '\\d{{4}}-\\d{{2}}-\\d{{2}}'`
- Keywords array: `~ 'pattern'`

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE ...",
  "id_list_query": "SELECT id FROM blocuri WHERE ...",
  "selected_columns": ["col1", "col2"],
  "rationale": "Explicatie..."
}}

RĂSPUNDE DOAR CU JSON:
"""

    def _execute_discovery_queries(self, strategy: Dict[str, Any]) -> Tuple[int, List[int]]:
        """Execută query-urile generate pentru a obține count și lista de ID-uri."""

        # Validare basic
        if "count_query" not in strategy or "id_list_query" not in strategy:
            raise ValueError("Strategia nu conține query-urile necesare.")

        count_sql = strategy['count_query']
        ids_sql = strategy['id_list_query']

        # Execuție COUNT
        try:
            count_res = self.session.execute(text(count_sql)).scalar()
        except Exception as e:
            logger.error(f"Eroare execuție COUNT query: {e}")
            raise ValueError(f"Query COUNT invalid: {e}")

        # Execuție ID LIST
        try:
            ids_res = self.session.execute(text(ids_sql)).scalars().all()
        except Exception as e:
            logger.error(f"Eroare execuție ID_LIST query: {e}")
            raise ValueError(f"Query ID_LIST invalid: {e}")

        return count_res, list(ids_res)

    def _fetch_chunk_data(self, ids: List[int], columns: List[str]) -> List[Dict]:
        """
        Smart Fetch: Extrage doar coloanele specificate pentru o listă de ID-uri.
        Construiește dinamic query-ul SQL.
        """
        if not ids:
            return []

        # Construire SELECT dinamic
        # SELECT id, obj->>'col1' as col1, obj->>'col2' as col2 FROM blocuri WHERE id IN (...)

        select_parts = ["id"]
        for col in columns:
            # Sanitizare simplă pentru a preveni injecții grosolane, deși coloanele vin din LLM
            clean_col = col.replace("'", "")
            select_parts.append(f"obj->>'{clean_col}' as \"{clean_col}\"")

        select_clause = ", ".join(select_parts)
        ids_str = ",".join(map(str, ids))

        sql = f"SELECT {select_clause} FROM blocuri WHERE id IN ({ids_str})"

        results = self.session.execute(text(sql)).mappings().all()
        return [dict(r) for r in results]

    def _save_plan(self, plan: Dict[str, Any]):
        """Salvează planul pe disk."""
        file_path = os.path.join(self.plans_dir, f"{plan['plan_id']}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(plan, f, indent=2, ensure_ascii=False)

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

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parsează răspunsul JSON de la LLM, curățând eventualele markdown fences."""
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        # Eliminare caractere invizibile/spații
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
             # Fallback 1: încercăm să găsim primul { și ultimul }
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    json_str = cleaned[start:end+1]
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    pass

            # Fallback 2: Dacă tot eșuează, considerăm că e text (non-JSON) și îl împachetăm
            # pentru a evita crăparea UI-ului.
            logger.warning(f"Failed to parse JSON response. Wrapping content as interpretation. Content preview: {content[:100]}...")
            return {
                "results": {"status": "parsed_as_text", "note": "LLM response was not strict JSON"},
                "interpretation": content, # Întoarcem textul brut ca interpretare
                "charts": []
            }
