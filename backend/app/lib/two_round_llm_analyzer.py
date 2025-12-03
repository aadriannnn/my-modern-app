"""
Module for Three-Stage Advanced Analysis (Map-Reduce) with LLM.
Refactored from TwoRoundLLMAnalyzer.
"""
import logging
import json
import os
import time
import uuid
import re
from sqlmodel import Session, text
from typing import Dict, Any, List, Tuple, Optional, Callable, Awaitable
from ..settings_manager import settings_manager
from ..lib.network_file_saver import NetworkFileSaver

logger = logging.getLogger(__name__)

class ThreeStageAnalyzer:
    """
    Orchestrates the 3-stage advanced analysis (Map-Reduce) with Human-in-the-Loop.

    Phase 1: Discovery & Planning (Smart Projection) -> Returns Plan
    [User Approval]
    Phase 2: Batch Execution (Map) -> Processes Chunks
    Phase 3: Final Synthesis (Reduce) -> Aggregates & Answers
    """

    def __init__(self, session: Session):
        self.session = session
        self.plans_dir = "analyzer_plans"  # Directory for saving plans
        os.makedirs(self.plans_dir, exist_ok=True)

    async def create_plan(self, user_query: str) -> Dict[str, Any]:
        """
        PHASE 1: Discovery & Planning
        Analyzes the request, generates SQL strategy, and creates an execution plan.
        Stops and returns the plan for user approval.
        """
        try:
            logger.info(f"--- START PHASE 1: DISCOVERY & PLANNING for: {user_query[:50]}... ---")

            # 1. Strategy Generation Loop (Self-Correction)
            max_retries = 2
            attempt = 0
            feedback = ""
            strategy = None
            preview_data = []
            total_cases = 0
            all_ids = []

            while attempt <= max_retries:
                attempt += 1
                logger.info(f"[PHASE 1] Strategy Generation Attempt {attempt}/{max_retries + 1}")

                # 1.1 Generate Strategy
                strategy = await self._generate_discovery_strategy(user_query, feedback, attempt)

                # 1.2 Execute Discovery Queries
                try:
                    total_cases, all_ids = self._execute_discovery_queries(strategy)
                except Exception as e:
                    logger.warning(f"[PHASE 1] Query execution failed: {e}. Retrying...")
                    feedback = f"Query-ul generat a eșuat: {e}. Te rog corectează SQL-ul."
                    continue

                if total_cases == 0:
                    if attempt <= max_retries:
                        logger.warning(f"[PHASE 1] No cases found. Retrying with feedback...")
                        # Progressive relaxation strategy
                        if attempt == 1:
                            feedback = """Prima încercare a returnat 0 rezultate. Încearcă următoarea strategie:
1. NU căuta expresii exacte (ex: 'închisoare de') - folosește doar CUVINTE CHEIE (ex: 'omor', 'condamn')
2. Relaxează filtrele WHERE - folosește ILIKE '%penal%' în loc de egalitate strictă
3. Caută în MAI MULTE câmpuri simultan: keywords, obiect, text_situatia_de_fapt (cu OR)
4. Pentru pedepse, verifică doar că solutia SAU text_individualizare nu este NULL - NU căuta text specific!
5. În loc de "solutia ILIKE '%închisoare de%'", folosește doar "solutia IS NOT NULL AND length(solutia) > 10"""
                        else:  # attempt == 2
                            feedback = """A doua încercare a eșuat. Ultima strategie - MAXIMUM de relaxare:
1. Caută DOAR cuvinte cheie din query (ex: 'omor') cu ILIKE
2. NU folosi condiții de tip "solutia ILIKE '%text specific%'" - acestea sunt PREA STRICTE!
3. Pentru filtrare generală: verifică doar că câmpurile esențiale nu sunt NULL
4. Folosește MULTE câmpuri cu OR: (obiect ILIKE '%cuvant%' OR keywords ILIKE '%cuvant%' OR text_situatia_de_fapt ILIKE '%cuvant%')
5. Evită filtre pe formatul textual al pedepsei - lasă extragerea pentru faza 2!
Exemplu CORECT: WHERE materie ILIKE '%penal%' AND (obiect ILIKE '%omor%' OR keywords ILIKE '%omor%') AND solutia IS NOT NULL"""
                        logger.info(f"[PHASE 1] Retry Feedback for attempt {attempt + 1}:\n{feedback}")
                        continue
                    else:
                        return {
                            'success': False,
                            'error': 'Nu s-au găsit date relevante pentru această interogare după mai multe încercări.'
                        }

                # 1.3 Preview Data for Verification
                preview_ids = all_ids[:3]
                preview_data = self._fetch_chunk_data(preview_ids, strategy['selected_columns'])

                # 1.4 Self-Verification
                verification = await self._verify_strategy(user_query, strategy, preview_data)

                if verification['valid']:
                    logger.info(f"[PHASE 1] Strategy Verified Successfully: {verification.get('reason', 'OK')}")
                    break
                else:
                    logger.warning(f"[PHASE 1] Strategy Verification Failed: {verification.get('feedback')}")
                    feedback = f"Rezultatele obținute nu sunt satisfăcătoare. Feedback: {verification.get('feedback')}. Încearcă din nou."

            if not strategy:
                 return {
                    'success': False,
                    'error': 'Nu s-a putut genera o strategie validă.'
                }

            # 3. Calculate Chunks
            # Conservative chunk size: 50 cases per chunk (approx 30k tokens limit / ~300 tokens per case)
            chunk_size = 50
            chunks = [all_ids[i:i + chunk_size] for i in range(0, len(all_ids), chunk_size)]

            # 4. Generate Plan Object
            plan_id = str(uuid.uuid4())
            plan = {
                "plan_id": plan_id,
                "user_query": user_query,
                "strategy": strategy, # Contains selected_columns
                "total_cases": total_cases,
                "total_chunks": len(chunks),
                "chunk_size": chunk_size,
                "chunks": chunks, # List of lists of IDs
                "created_at": time.time(),
                "status": "created"
            }

            # 5. Save Plan
            self._save_plan(plan)

            logger.info(f"[PHASE 1] Plan created: {plan_id}. Total cases: {total_cases}. Chunks: {len(chunks)}.")
            logger.info(f"[HUMAN-IN-THE-LOOP] 🛑 PHASE 1 COMPLETE. Returning plan to UI. WAITING FOR USER CONFIRMATION to proceed to Phase 2.")

            # Realistic time estimation based on logs: ~60 seconds per LLM query
            # Phase 2 (Chunks) + Phase 3 (Synthesis)
            estimated_seconds = (len(chunks) + 1) * 60
            estimated_minutes = round(estimated_seconds / 60, 1)

            return {
                'success': True,
                'plan_id': plan_id,
                'total_cases': total_cases,
                'total_chunks': len(chunks),
                'estimated_time_seconds': estimated_seconds,
                'estimated_time_minutes': estimated_minutes,  # Added for better UX
                'preview_data': preview_data,
                'strategy_summary': strategy.get('rationale', 'Strategie generată automat.')
            }

        except Exception as e:
            logger.error(f"[PHASE 1] Critical Error: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    async def execute_plan(
        self,
        plan_id: str,
        progress_callback: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None
    ) -> Dict[str, Any]:
        """
        PHASE 2 & 3: Batch Execution (Map) and Final Synthesis (Reduce).
        Resumes from a saved plan ID.
        """
        try:
            logger.info(f"[HUMAN-IN-THE-LOOP] ▶️ USER CONFIRMED PLAN {plan_id}. Starting Phase 2 execution.")

            # 1. Load Plan
            plan_path = os.path.join(self.plans_dir, f"{plan_id}.json")
            if not os.path.exists(plan_path):
                raise FileNotFoundError(f"Planul {plan_id} nu există.")

            with open(plan_path, 'r', encoding='utf-8') as f:
                plan = json.load(f)

            total_chunks = plan['total_chunks']
            logger.info(f"[PHASE 2] Starting execution for Plan {plan_id}. Chunks: {total_chunks}")

            # 2. Iterate Chunks (Phase 2 - Map)
            for i in range(total_chunks):
                # Check if chunk result already exists (simple resume logic)
                chunk_result_path = os.path.join(self.plans_dir, f"{plan_id}_chunk_{i}.json")
                if os.path.exists(chunk_result_path):
                    logger.info(f"[PHASE 2] Chunk {i+1}/{total_chunks} already processed. Skipping.")
                    if progress_callback:
                        await progress_callback({
                            "stage": "execution",
                            "chunk_index": i,
                            "total_chunks": total_chunks,
                            "status": "skipped",
                            "message": f"Chunk {i+1}/{total_chunks} already processed."
                        })
                    continue

                # Notify start of chunk
                if progress_callback:
                    await progress_callback({
                        "stage": "execution",
                        "chunk_index": i,
                        "total_chunks": total_chunks,
                        "status": "processing",
                        "message": f"Processing chunk {i+1}/{total_chunks}..."
                    })

                # Execute Chunk
                chunk_res = await self.execute_chunk(plan, i)

                # We continue even if chunk fails, as Phase 3 will handle missing data
                if not chunk_res['success']:
                    logger.error(f"[PHASE 2] Chunk {i} failed: {chunk_res.get('error')}")

            # 3. Final Synthesis (Phase 3 - Reduce)
            if progress_callback:
                await progress_callback({
                    "stage": "synthesis",
                    "status": "processing",
                    "message": "Synthesizing final results..."
                })

            final_result = await self.synthesize_results(plan_id)

            return final_result

        except Exception as e:
            logger.error(f"[EXECUTION] Critical Error: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    async def execute_chunk(self, plan: Dict[str, Any], chunk_index: int) -> Dict[str, Any]:
        """
        PHASE 2: Batch Execution (Worker)
        Executes analysis for a single chunk.
        """
        try:
            chunks = plan['chunks']
            if chunk_index < 0 or chunk_index >= len(chunks):
                raise IndexError(f"Chunk index {chunk_index} invalid. Total chunks: {len(chunks)}")

            chunk_ids = chunks[chunk_index]
            selected_columns = plan['strategy']['selected_columns']
            user_query = plan['user_query']
            plan_id = plan['plan_id']

            logger.info(f"[PHASE 2] Executing Chunk {chunk_index + 1}/{len(chunks)} for Plan {plan_id}. IDs: {len(chunk_ids)}")

            # 2. Smart Fetch
            chunk_data = self._fetch_chunk_data(chunk_ids, selected_columns)

            # 2.1. Validate and Truncate (Safety Net)
            truncated_data, metadata = self._validate_and_truncate_data(chunk_data, user_query, max_chars=30000)

            if metadata['truncated']:
                logger.warning(f"[PHASE 2] Chunk {chunk_index} truncated: {metadata['cases_included_in_prompt']}/{len(chunk_data)} cases included.")

            # 3. Analyze LLM (Map)
            prompt = self._build_chunk_analysis_prompt(user_query, truncated_data, chunk_index, len(chunks))

            # Network logic
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

            # Parse result
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

            # 4. Save Chunk Result
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
        Aggregates results and generates the final response.
        """
        try:
            # 1. Load Plan
            plan_path = os.path.join(self.plans_dir, f"{plan_id}.json")
            if not os.path.exists(plan_path):
                raise FileNotFoundError(f"Planul {plan_id} nu există.")

            with open(plan_path, 'r', encoding='utf-8') as f:
                plan = json.load(f)

            user_query = plan['user_query']
            total_chunks = plan['total_chunks']

            # 2. Load Chunk Results
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

            if not aggregated_data and len(missing_chunks) == total_chunks:
                 return {
                    'success': False,
                    'error': 'Toate etapele de procesare (chunks) au eșuat. Nu se poate realiza sinteza.'
                }

            logger.info(f"[PHASE 3] Synthesizing results from {len(aggregated_data)} chunks. Missing: {len(missing_chunks)}")

            # 3. Synthesis LLM (Reduce)
            prompt = self._build_synthesis_prompt(user_query, aggregated_data, missing_chunks)

            # Network logic
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

            # Parse final result
            try:
                final_result = self._parse_json_response(poll_content)
                NetworkFileSaver.delete_response_file(response_path)
            except Exception as e:
                logger.error(f"Eroare parsare răspuns Synthesis: {e}")
                return {
                     "results": {"error": "Formatare incorectă de la LLM"},
                     "interpretation": f"Sistemul a primit un răspuns, dar nu l-a putut formata automat. Conținut brut: {poll_content[:500]}...",
                     "charts": [],
                     "process_metadata": {
                        'plan_id': plan_id,
                        'chunks_processed': len(aggregated_data)
                    }
                }

            # Add metadata
            final_result['process_metadata'] = {
                'plan_id': plan_id,
                'total_cases': plan.get('total_cases', 0),
                'chunks_processed': len(aggregated_data),
                'chunks_missing': len(missing_chunks)
            }
            final_result['success'] = True

            return final_result

        except Exception as e:
            logger.error(f"[PHASE 3] Eroare Synthesis: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }

    # =================================================================================================
    # HELPER METHODS
    # =================================================================================================

    def _save_plan(self, plan: Dict[str, Any]):
        """Saves the plan to disk."""
        file_path = os.path.join(self.plans_dir, f"{plan['plan_id']}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(plan, f, indent=2, ensure_ascii=False)

    async def _generate_discovery_strategy(self, user_query: str, feedback: str = "", attempt: int = 1) -> Dict[str, Any]:
        """
        Uses LLM to generate discovery SQL and column list.
        """
        prompt = self._build_discovery_prompt(user_query, feedback)

        # LOG COMPLETE PROMPT
        logger.info("="*80)
        logger.info(f"[PHASE 1] Complete prompt being sent (attempt {attempt}, {len(prompt)} chars):")
        logger.info(prompt)
        logger.info("="*80)

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

        # LOG COMPLETE RESPONSE
        logger.info("="*80)
        logger.info(f"[PHASE 1] LLM Response received ({len(poll_content)} chars):")
        logger.info(poll_content)
        logger.info("="*80)

        try:
            strategy = self._parse_json_response(poll_content)
            logger.info(f"[PHASE 1] Parsed strategy: {json.dumps(strategy, indent=2, ensure_ascii=False)}")
            NetworkFileSaver.delete_response_file(response_path)
            return strategy
        except Exception as e:
            logger.error(f"Eroare parsare răspuns Discovery: {e}")
            raise ValueError(f"LLM a returnat un răspuns invalid în Phase 1: {e}")

    async def _verify_strategy(self, user_query: str, strategy: Dict[str, Any], preview_data: List[Dict]) -> Dict[str, Any]:
        """
        Verifies if the strategy produced useful results.
        """
        prompt = self._build_verification_prompt(user_query, strategy, preview_data)

        retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
        retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

        success, message, saved_path = NetworkFileSaver.save_to_network(
            content=prompt,
            host=retea_host,
            shared_folder=retea_folder,
            subfolder=''
        )

        if not success:
            logger.warning(f"Could not save verification prompt: {message}. Skipping verification.")
            return {"valid": True} # Fail open

        poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
            saved_path=saved_path,
            timeout_seconds=300,
            poll_interval=5
        )

        if not poll_success:
            logger.warning(f"Timeout Verification: {poll_content}. Skipping verification.")
            return {"valid": True}

        try:
            result = self._parse_json_response(poll_content)
            NetworkFileSaver.delete_response_file(response_path)
            return result
        except Exception as e:
            logger.error(f"Error parsing verification response: {e}")
            return {"valid": True}

    def _execute_discovery_queries(self, strategy: Dict[str, Any]) -> Tuple[int, List[int]]:
        """Executes generated queries to get count and ID list."""
        if "count_query" not in strategy or "id_list_query" not in strategy:
            raise ValueError("Strategia nu conține query-urile necesare.")

        count_sql = strategy['count_query']
        ids_sql = strategy['id_list_query']

        # LOG SQL QUERIES
        logger.info("="*80)
        logger.info("[PHASE 1] Executing COUNT query:")
        logger.info(count_sql)
        logger.info("="*80)

        try:
            count_res = self.session.execute(text(count_sql)).scalar()
            logger.info(f"[PHASE 1] Count result: {count_res} cases found")
        except Exception as e:
            logger.error(f"Eroare execuție COUNT query: {e}")
            raise ValueError(f"Query COUNT invalid: {e}")

        logger.info("="*80)
        logger.info("[PHASE 1] Executing ID_LIST query:")
        logger.info(ids_sql)
        logger.info("="*80)

        try:
            ids_res = self.session.execute(text(ids_sql)).scalars().all()
            ids_list = list(ids_res)
            logger.info(f"[PHASE 1] Found {len(ids_list)} IDs")
            if len(ids_list) > 0:
                logger.info(f"[PHASE 1] First 5 IDs: {ids_list[:5]}")
        except Exception as e:
            logger.error(f"Eroare execuție ID_LIST query: {e}")
            raise ValueError(f"Query ID_LIST invalid: {e}")

        return count_res, ids_list

    def _fetch_chunk_data(self, ids: List[int], columns: List[str]) -> List[Dict]:
        """
        Smart Fetch: Extracts only specified columns for a list of IDs.
        """
        if not ids:
            return []

        select_parts = ["id"]
        for col in columns:
            clean_col = col.replace("'", "")
            select_parts.append(f"obj->>'{clean_col}' as \"{clean_col}\"")

        select_clause = ", ".join(select_parts)
        ids_str = ",".join(map(str, ids))

        sql = f"SELECT {select_clause} FROM blocuri WHERE id IN ({ids_str})"

        results = self.session.execute(text(sql)).mappings().all()
        return [dict(r) for r in results]

    def _validate_and_truncate_data(
        self,
        filtered_data: List[Dict],
        user_query: str,
        max_chars: int = 30000
    ) -> Tuple[List[Dict], Dict[str, Any]]:
        """
        Validates and truncates data to fit within max_chars.
        """
        base_prompt = f"TASK: {user_query}" # Simplified base size estimation
        base_size = len(base_prompt)
        available_space = max_chars - base_size - 2000
        if available_space <= 0: available_space = 5000

        truncated_data = []
        current_size = 0
        cases_included = 0

        for case in filtered_data:
            case_json = json.dumps(case, ensure_ascii=False, separators=(',', ':'))
            case_size = len(case_json)

            if current_size + case_size + 10 <= available_space:
                truncated_data.append(case)
                current_size += case_size + 10
                cases_included += 1
            else:
                break

        final_data_json = json.dumps(truncated_data, indent=2, ensure_ascii=False)
        metadata = {
            'total_cases_filtered': len(filtered_data),
            'cases_included_in_prompt': cases_included,
            'truncated': cases_included < len(filtered_data)
        }
        return truncated_data, metadata

    def _parse_json_response(self, content: str) -> Dict[str, Any]:
        """Parses JSON response from LLM, cleaning markdown fences and headers."""
        cleaned = content.strip()

        # Remove markdown code fences
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned)

        # Remove common separator lines (e.g. ====, ----) that LLM might repeat
        cleaned = re.sub(r'^={10,}.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^-{10,}.*$', '', cleaned, flags=re.MULTILINE)

        # Remove "PHASE X" headers if repeated
        cleaned = re.sub(r'^🔬 PHASE \d+:.*$', '', cleaned, flags=re.MULTILINE)

        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to find the first '{' and last '}'
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    pass

            logger.warning(f"Failed to parse JSON response: {content[:100]}...")
            return {
                "results": {"status": "parsed_as_text", "note": "LLM response was not strict JSON"},
                "interpretation": content,
                "charts": []
            }

    # =================================================================================================
    # PROMPTS
    # =================================================================================================

    def _build_discovery_prompt(self, user_query: str, feedback: str = "") -> str:
        feedback_section = ""
        if feedback:
            feedback_section = f"""
=================================================================================== ⚠️ FEEDBACK ANTERIOR
Am încercat o strategie anterioară dar a eșuat sau a dat rezultate slabe.
MOTIV: "{feedback}"
Te rog să ajustezi strategia (SQL sau coloane) pentru a rezolva această problemă.
"""

        return f"""===================================================================================
🔬 PHASE 1: DISCOVERY & PLANNING (SMART PROJECTION)
===================================================================================
Tu ești un Senior Python & SQL Developer specializat în optimizarea query-urilor pe baze de date juridice PostgreSQL.
Scopul tău este să planifici execuția eficientă pentru o analiză Big Data pe cazuri juridice.

TASK UTILIZATOR: "{user_query}"
{feedback_section}

=================================================================================== 📊 SCHEMA BAZEI DE DATE
Tabel: blocuri (id INTEGER PRIMARY KEY, obj JSONB)

Câmpuri JSONB disponibile în 'obj' (LISTA COMPLETĂ):
- 'materie': materia cazului (ex: 'Penal', 'Civil', 'Execuție penală', etc.)
- 'obiect': obiectul cazului (ex: 'omor', 'viol', 'furt calificat', etc.)
- 'text_situatia_de_fapt': textul complet al situației de fapt (câmp lung)
- 'solutia': soluția/decizia completă a instanței (include PEDEPSE) (câmp lung)
- 'keywords': array JSONB cu cuvinte cheie (ex: ["omor", "tentativă"])
- 'denumire': titlul/denumirea cazului
- 'argumente_instanta': argumentele instanței (câmp lung)
- 'considerente_speta': considerentele speței (câmp lung)
- 'text_individualizare': text privind individualizarea pedepsei (câmp lung, IMPORTANT pentru pedepse)
- 'text_doctrina': text doctrinar (câmp lung)
- 'text_ce_invatam': lecții învățate din caz (câmp lung)
- 'Rezumat_generat_de_AI_Cod': rezumat generat AI
- 'tip_speta': tipul speței
- 'parte': părțile implicate
- 'număr_dosar': numărul dosarului
- 'tip_solutie': tipul soluției (ex: 'Condamnare', 'Achitare', etc.)

IMPORTANT: Unele câmpuri pot fi NULL sau lipsă.
Dacă task-ul cere "soluția" sau "pedeapsa", asigură-te că filtrezi cazurile care au acest câmp populat!
Ex: ... AND (obj->>'solutia' IS NOT NULL AND length(obj->>'solutia') > 10 OR obj->>'text_individualizare' IS NOT NULL)

=================================================================================== 🚨 REGULI CRITICE DE SQL
❌ NU FACE NICIODATĂ ASA: SELECT id, obj FROM blocuri...
✅ FACE ÎNTOTDEAUNA ASA: SELECT id, obj->>'solutia' as solutia FROM blocuri...
**SMART PROJECTION**: Extrage DOAR câmpurile necesare.

FILTRARE - REGULI CRITICE:
- **IGNORĂ GREȘELILE DE SCRIERE** din query-ul utilizatorului - extrage doar ESENȚA (ex: "petru ifractiuea de omor" → caută "omor")
- Folosește ILIKE în loc de = pentru flexibilitate (ex: ILIKE '%penal%' în loc de = 'Penal')
- Pentru arrays (keywords), folosește: obj->>'keywords' ILIKE '%cuvânt%'
- Combină multiple câmpuri cu OR pentru rezultate mai bune
- **NU căuta expresii textuale exacte** (ex: "închisoare de", "ani închisoare") - acestea variază prea mult!
- Pentru pedepse: verifică doar că solutia/text_individualizare există (IS NOT NULL), NU căuta formatul textual!
- Relaxează cât mai mult - este mai bine să găsești 100 cazuri și să filtrezi în Faza 2 decât să găsești 0!

=================================================================================== 📚 EXEMPLE DE QUERY-URI

❌ GREȘIT (prea restrictiv):
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE obj->>'materie' = 'Penal' AND obj->>'obiect' = 'omor'",
  "id_list_query": "SELECT id FROM blocuri WHERE obj->>'materie' = 'Penal' AND obj->>'obiect' = 'omor'",
  "selected_columns": ["solutia", "obiect"],
  "rationale": "Caut cazuri de omor"
}}
MOTIV GREȘIT: Folosește egalitate strictă (=) care eșuează dacă există variații ("penal" vs "Penal" vs "PENAL")

✅ CORECT (flexibil):
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE (obj->>'materie' ILIKE '%penal%') AND (obj->>'obiect' ILIKE '%omor%' OR obj->>'keywords' ILIKE '%omor%')",
  "id_list_query": "SELECT id FROM blocuri WHERE (obj->>'materie' ILIKE '%penal%') AND (obj->>'obiect' ILIKE '%omor%' OR obj->>'keywords' ILIKE '%omor%')",
  "selected_columns": ["solutia", "obiect", "materie"],
  "rationale": "Folosesc ILIKE pentru flexibilitate și caut 'omor' în două câmpuri (obiect și keywords)"
}}

✅ FOARTE BUN (maxim flexibil pentru întrebări despre pedeapsă):
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE (obj->>'materie' ILIKE '%penal%') AND (obj->>'obiect' ILIKE '%omor%' OR obj->>'keywords' ILIKE '%omor%' OR obj->>'text_situatia_de_fapt' ILIKE '%omor%') AND (obj->>'solutia' IS NOT NULL AND length(obj->>'solutia') > 10 OR obj->>'text_individualizare' IS NOT NULL)",
  "id_list_query": "SELECT id FROM blocuri WHERE (obj->>'materie' ILIKE '%penal%') AND (obj->>'obiect' ILIKE '%omor%' OR obj->>'keywords' ILIKE '%omor%' OR obj->>'text_situatia_de_fapt' ILIKE '%omor%') AND (obj->>'solutia' IS NOT NULL AND length(obj->>'solutia') > 10 OR obj->>'text_individualizare' IS NOT NULL)",
  "selected_columns": ["solutia", "text_individualizare", "obiect", "materie", "text_situatia_de_fapt"],
  "rationale": "Am inclus două câmpuri relevante pentru pedeapsă (solutia și text_individualizare) și am căutat 'omor' în multiple locuri (obiect, keywords, situatia_de_fapt)"
}}

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "count_query": "SELECT COUNT(*) FROM blocuri WHERE ...",
  "id_list_query": "SELECT id FROM blocuri WHERE ...",
  "selected_columns": ["solutia", "obiect", "materie"],
  "rationale": "Am selectat aceste coloane pentru că..."
}}

RĂSPUNDE DOAR CU JSON:
"""

    def _build_chunk_analysis_prompt(self, user_query: str, chunk_data: List[Dict], chunk_index: int, total_chunks: int) -> str:
        data_json = json.dumps(chunk_data, indent=2, ensure_ascii=False)
        return f"""===================================================================================
🔬 PHASE 2: BATCH EXECUTION (CHUNK {chunk_index + 1}/{total_chunks})
===================================================================================
Tu ești un Data Scientist (Worker). Analizezi un mic lot de date.

TASK UTILIZATOR: "{user_query}"

=================================================================================== 📦 DATELE TALE (CHUNK)
{data_json}

=================================================================================== 🎯 MISIUNEA TA
1. Extragere valori numerice.
2. Sinteză parțială.

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "chunk_index": {chunk_index},
  "analyzed_count": {len(chunk_data)},
  "extracted_data": [ ... ],
  "partial_stats": {{ ... }},
  "summary": "Scurt rezumat al acestui chunk"
}}

RĂSPUNDE DOAR CU JSON:
"""

    def _build_synthesis_prompt(self, user_query: str, aggregated_data: List[Dict], missing_chunks: List[int]) -> str:
        clean_aggregation = []
        for chunk in aggregated_data:
            clean_aggregation.append({
                "chunk_index": chunk.get("chunk_index"),
                "extracted_data": chunk.get("extracted_data"),
                "partial_stats": chunk.get("partial_stats")
            })

        data_json = json.dumps(clean_aggregation, indent=2, ensure_ascii=False)

        return f"""===================================================================================
🔬 PHASE 3: FINAL SYNTHESIS (REDUCE)
===================================================================================
Tu ești Analistul Șef. Agregă datele parțiale și răspunde utilizatorului.

TASK UTILIZATOR: "{user_query}"

=================================================================================== 📦 REZULTATE AGREGATE
{data_json}

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "results": {{ ... }},
  "interpretation": "Concluzia finală...",
  "charts": [ ... ]
}}

RĂSPUNDE DOAR CU JSON:
"""

    def _build_verification_prompt(self, user_query: str, strategy: Dict[str, Any], preview_data: List[Dict]) -> str:
        data_json = json.dumps(preview_data, indent=2, ensure_ascii=False)
        strategy_json = json.dumps(strategy, indent=2, ensure_ascii=False)

        return f"""===================================================================================
🕵️ SELF-VERIFICATION (QUALITY CONTROL)
===================================================================================
Tu ești un Auditor de Calitate. Verifici dacă strategia de căutare generată a produs rezultate utile pentru task-ul utilizatorului.

TASK UTILIZATOR: "{user_query}"

STRATEGIA FOLOSITĂ:
{strategy_json}

REZULTATE OBȚINUTE (Eșantion):
{data_json}

=================================================================================== 🎯 MISIUNEA TA
Analizează rezultatele:
1. Sunt câmpurile extrase populate? (Nu sunt toate null?)
2. Sunt rezultatele relevante pentru task?
3. Există suficientă informație pentru a răspunde la întrebarea utilizatorului?

Dacă vezi câmpuri NULL care ar fi trebuit să fie populate, sau dacă rezultatele sunt irelevante, respinge strategia.

=================================================================================== 📤 FORMAT RĂSPUNS (JSON)
{{
  "valid": true/false,
  "feedback": "Dacă false, explică ce trebuie corectat (ex: 'Câmpul X este null', 'Nu am găsit informații despre Y'). Dacă true, lasă gol."
}}

RĂSPUNDE DOAR CU JSON:
"""

# Alias for backward compatibility
TwoRoundLLMAnalyzer = ThreeStageAnalyzer
