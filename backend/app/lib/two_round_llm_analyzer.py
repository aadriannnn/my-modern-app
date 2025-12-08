"""
Module for Three-Stage Advanced Analysis (Map-Reduce) with LLM.
Refactored to use modular components.
"""
import logging
import asyncio
from sqlmodel import Session
from typing import Dict, Any, Optional, Callable, Awaitable, List

from ..lib.prompt_logger import PromptLogger
from ..logic.search_logic import build_pro_search_query_sql, build_vector_search_query_sql
from ..multi_strategy_config import MultiStrategyConfig

# Import new modular components
from .analyzer.prompt_manager import PromptManager
from .analyzer.llm_client import LLMClient
from .analyzer.plan_manager import PlanManager
from .analyzer.data_fetcher import DataFetcher
from .analyzer.strategy_engine import StrategyEngine

logger = logging.getLogger(__name__)

class ThreeStageAnalyzer:
    """
    Orchestrates the 3-stage advanced analysis (Map-Reduce) with Human-in-the-Loop.
    Phase 1: Discovery & Planning
    Phase 2: Batch Execution
    Phase 3: Final Synthesis
    """

    def __init__(self, session: Session):
        self.session = session
        self.prompt_manager = PromptManager()
        self.plan_manager = PlanManager()
        self.data_fetcher = DataFetcher(session)
        self.strategy_engine = StrategyEngine(self.data_fetcher)

    async def create_plan(self, user_query: str) -> Dict[str, Any]:
        """PHASE 1: Discovery & Planning"""
        try:
            logger.info(f"--- START PHASE 1: DISCOVERY for: {user_query[:50]}... ---")

            # 1. Generate Strategy with Retries
            strategy = await self._generate_strategy_loop(user_query)
            if not strategy:
                 return {'success': False, 'error': 'Nu s-a putut genera o strategie validă.'}

            # 2. Extract Data (Count & IDs)
            # If exhaustive, data is already in strategy
            if strategy.get("strategy_type") == "exhaustive":
                total_cases = strategy.get("precomputed_count", 0)
                all_ids = strategy.get("precomputed_ids", [])
            else:
                total_cases, all_ids = self.data_fetcher.execute_discovery_queries(strategy)

            # 3. Auto-Expansion Check
            # If we have 0 cases OR fewer than threshold, try to expand
            if MultiStrategyConfig.AUTO_EXPAND_ENABLED and total_cases < MultiStrategyConfig.MIN_RESULTS_THRESHOLD:
                logger.info(f"Results below threshold ({total_cases}). Triggering Auto-Expansion.")
                strategy = await self._handle_auto_expansion(user_query, strategy, all_ids)
                total_cases = strategy.get("precomputed_count", 0)
                all_ids = strategy.get("precomputed_ids", [])

            if total_cases == 0:
                # One last attempt: If even auto-expansion failed (or was disabled), try fallback SQL
                logger.warning("Still 0 results after expansion. Attempting final fallback strategy.")
                fallback_strategy = self._generate_fallback_strategy(user_query)
                total_cases, all_ids = self.data_fetcher.execute_discovery_queries(fallback_strategy)

                if total_cases > 0:
                    strategy = fallback_strategy
                    strategy['rationale'] = "Fallback strategy used because primary strategy yielded 0 results."
                else:
                    return {'success': False, 'error': 'Nu s-au găsit date relevante nici după extinderea căutării.'}

            # 4. Create Plan
            plan = self.plan_manager.create_plan_object(user_query, strategy, total_cases, all_ids)
            self.plan_manager.save_plan(plan)

            # 5. Preview Data
            preview_ids = all_ids[:3]
            preview_data = self.data_fetcher.fetch_chunk_data(preview_ids, strategy.get('selected_columns', []))

            # 6. Verification
            await self._verify_strategy(user_query, strategy, preview_data) # Log only

            est_sec = (plan['total_chunks'] + 1) * 60
            return {
                'success': True,
                'plan_id': plan['plan_id'],
                'total_cases': total_cases,
                'total_chunks': plan['total_chunks'],
                'estimated_time_seconds': est_sec,
                'estimated_time_minutes': round(est_sec / 60, 1),
                'preview_data': preview_data,
                'strategy_summary': strategy.get('rationale', 'Strategie generată.'),
                'strategies_used': plan.get("strategies_used"),
                'strategy_breakdown': plan.get("strategy_breakdown")
            }

        except Exception as e:
            logger.error(f"[PHASE 1] Error: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    async def create_plans_batch(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate plans for multiple tasks sequentially.

        Args:
            tasks: List of {id, query} dicts

        Returns:
            Summary of plan generation results.
        """
        results = {}
        succeeded_count = 0
        failed_count = 0
        total_time_seconds = 0
        total_cases = 0

        for task in tasks:
            task_id = task['id']
            query = task['query']

            try:
                # Create plan for single task
                plan_result = await self.create_plan(query)

                if plan_result.get('success'):
                    succeeded_count += 1
                    total_time_seconds += plan_result.get('estimated_time_seconds', 0)
                    total_cases += plan_result.get('total_cases', 0)
                    results[task_id] = plan_result
                else:
                    failed_count += 1
                    results[task_id] = {'success': False, 'error': plan_result.get('error', 'Unknown error')}

            except Exception as e:
                failed_count += 1
                results[task_id] = {'success': False, 'error': str(e)}

        return {
            'success': True,
            'results': results,
            'summary': {
                'total': len(tasks),
                'succeeded': succeeded_count,
                'failed': failed_count,
                'total_cases': total_cases,
                'total_time_seconds': total_time_seconds
            }
        }

    async def execute_plan(self, plan_id: str, progress_callback: Optional[Callable] = None, notification_email: Optional[str] = None, suppress_email: bool = False) -> Dict[str, Any]:
        """PHASE 2 & 3: Execution & Synthesis"""
        import time
        start_time = time.time()

        try:
            plan = self.plan_manager.load_plan(plan_id)

            # Store notification email in plan if provided
            if notification_email:
                plan['notification_email'] = notification_email
                self.plan_manager.save_plan(plan)
                logger.info(f"Email notification enabled for plan {plan_id}: {notification_email}")

            total_chunks = plan['total_chunks']

            # Phase 2: Chunks
            for i in range(total_chunks):
                if self.plan_manager.load_chunk_result(plan_id, i):
                     if progress_callback: await progress_callback({"stage": "execution", "chunk_index": i, "status": "skipped"})
                     continue

                if progress_callback: await progress_callback({"stage": "execution", "chunk_index": i, "total": total_chunks})
                await self.execute_chunk(plan, i)

            # Phase 3: Synthesis
            if progress_callback: await progress_callback({"stage": "synthesis"})
            result = await self.synthesize_results(plan_id)

            # Send success email if notification is enabled and NOT suppressed
            if notification_email and result.get('success') and not suppress_email:
                execution_time = time.time() - start_time
                await self._send_completion_email(
                    notification_email,
                    plan.get('user_query', ''),
                    result,
                    execution_time,
                    plan_id
                )

            return result

        except Exception as e:
            logger.error(f"[EXECUTION] Error: {e}", exc_info=True)
            error_result = {'success': False, 'error': str(e)}

            # Send error email if notification is enabled
            try:
                plan = self.plan_manager.load_plan(plan_id)
                notification_email = plan.get('notification_email')
                if notification_email:
                    await self._send_error_email(
                        notification_email,
                        plan.get('user_query', ''),
                        str(e),
                        plan_id
                    )
            except Exception as email_error:
                logger.error(f"Failed to send error notification email: {email_error}")

            return error_result


    async def execute_chunk(self, plan: Dict[str, Any], chunk_index: int) -> Dict[str, Any]:
        try:
            chunk_ids = plan['chunks'][chunk_index]
            data = self.data_fetcher.fetch_chunk_data(chunk_ids, plan['strategy']['selected_columns'])
            truncated_data, _ = self.data_fetcher.validate_and_truncate_data(data, plan['user_query'])

            prompt = self.prompt_manager.build_chunk_analysis_prompt(
                plan['user_query'], truncated_data, chunk_index, plan['total_chunks']
            )

            # Check LLM mode setting
            from ..settings_manager import settings_manager
            llm_mode = settings_manager.get_value('setari_llm', 'advanced_llm_mode', 'network')

            if llm_mode == 'local':
                success, content, path = await LLMClient.call_llm_local(prompt, label=f"Chunk {chunk_index}")
            else:
                success, content, path = await LLMClient.call_llm(prompt, label=f"Chunk {chunk_index}")
            if not success: raise RuntimeError(content)

            result = LLMClient.parse_json_response(content)
            LLMClient.delete_response(path)

            self.plan_manager.save_chunk_result(plan['plan_id'], chunk_index, result)
            return {'success': True}

        except Exception as e:
            logger.error(f"Chunk {chunk_index} failed: {e}")
            return {'success': False, 'error': str(e)}

    async def synthesize_results(self, plan_id: str) -> Dict[str, Any]:
        try:
            plan = self.plan_manager.load_plan(plan_id)
            aggregated = []
            missing = []

            for i in range(plan['total_chunks']):
                res = self.plan_manager.load_chunk_result(plan_id, i)
                if res: aggregated.append(res)
                else: missing.append(i)

            if not aggregated: return {'success': False, 'error': 'No chunk results available.'}

            prompt = self.prompt_manager.build_synthesis_prompt(plan['user_query'], aggregated, missing)
            # Check LLM mode setting
            from ..settings_manager import settings_manager
            llm_mode = settings_manager.get_value('setari_llm', 'advanced_llm_mode', 'network')

            if llm_mode == 'local':
                success, content, path = await LLMClient.call_llm_local(prompt, label="Synthesis")
            else:
                success, content, path = await LLMClient.call_llm(prompt, label="Synthesis")
            if not success: raise RuntimeError(content)

            result = LLMClient.parse_json_response(content)
            LLMClient.delete_response(path)

            # Programmatically aggregate bibliography from chunks
            unique_ids = set()
            for chunk_res in aggregated:
                if 'referenced_case_ids' in chunk_res and isinstance(chunk_res['referenced_case_ids'], list):
                    for cid in chunk_res['referenced_case_ids']:
                        try:
                            unique_ids.add(int(cid))
                        except (ValueError, TypeError):
                            continue

            # Ensure bibliography is present in result, preferring programmatic aggregation
            result['bibliography'] = {
                'total_cases': len(unique_ids),
                'case_ids': sorted(list(unique_ids))
            }

            # Inject top-level stats for frontend display
            result['cases_analyzed'] = plan.get('total_cases', 0)

            result['process_metadata'] = {
                'plan_id': plan_id, 'total_cases': plan['total_cases'],
                'chunks_processed': len(aggregated)
            }
            result['success'] = True
            return result
        except Exception as e:
            logger.error(f"Synthesis failed: {e}")
            return {'success': False, 'error': str(e)}

    # --- Helpers ---

    async def _generate_strategy_loop(self, user_query: str) -> Dict[str, Any]:
        for attempt in range(1, 4):
            feedback = "" # Could implement feedback loop logic here if needed
            prompt = self.prompt_manager.build_discovery_prompt(user_query, feedback)

            # Check LLM mode setting
            from ..settings_manager import settings_manager
            llm_mode = settings_manager.get_value('setari_llm', 'advanced_llm_mode', 'network')

            if llm_mode == 'local':
                success, content, path = await LLMClient.call_llm_local(prompt, label=f"Discovery {attempt}")
            else:
                success, content, path = await LLMClient.call_llm(prompt, label=f"Discovery {attempt}")

            if not success: continue # Retry loop handled by return check

            # Echo check handled in LLMClient
            strategy = LLMClient.parse_json_response(content)
            LLMClient.delete_response(path)

            if strategy.get("strategy_type") == "exhaustive":
                res = await self.strategy_engine.execute_multi_strategy(user_query, strategy, mode="exhaustive")
                strategy["precomputed_count"] = res["total_cases"]
                strategy["precomputed_ids"] = res["merged_ids"]
                strategy["strategies_used"] = res["strategies_used"]
                strategy["strategy_breakdown"] = res["breakdown"]
                return strategy

            # Build SQL for Pro/Vector/Combined
            try:
                self._enrich_strategy_sql(strategy)
                return strategy
            except Exception as e:
                logger.warning(f"Strategy enrichment failed: {e}")

        return self._generate_fallback_strategy(user_query)

    def _enrich_strategy_sql(self, strategy: Dict[str, Any]):
        stype = strategy.get("strategy_type")
        if stype == "pro_search":
            q = build_pro_search_query_sql(strategy.get("pro_search_term", ""), limit=100)
            strategy.update(q)
        elif stype == "vector_search":
            q = build_vector_search_query_sql(strategy.get("vector_search_term", ""), limit=100)
            strategy.update(q)
        elif stype == "combined":
            primary_strategy = strategy.get("primary_strategy", {})
            primary_type = primary_strategy.get("type", "")
            sql_filters = strategy.get("sql_filters", "")

            if primary_type == "pro_search":
                term = primary_strategy.get("term", "")
                pro_queries = build_pro_search_query_sql(term, limit=100)
                if sql_filters:
                    # Safer combination logic for Pro Search
                    original_count = pro_queries['count_query']
                    if "WHERE" in original_count:
                        # Insert filters after WHERE
                        combined_count = original_count.replace("WHERE", f"WHERE ({sql_filters}) AND", 1)
                    else:
                        combined_count = original_count + f" WHERE {sql_filters}"

                    original_ids = pro_queries['id_list_query']
                    if "WHERE" in original_ids:
                        combined_id_list = original_ids.replace("WHERE", f"WHERE ({sql_filters}) AND", 1)
                    else:
                        # Insert before ORDER BY or at end
                        if "ORDER BY" in original_ids:
                            combined_id_list = original_ids.replace("ORDER BY", f"WHERE {sql_filters} ORDER BY")
                        else:
                            combined_id_list = original_ids + f" WHERE {sql_filters}"

                    strategy['count_query'] = combined_count
                    strategy['id_list_query'] = combined_id_list
                else:
                    strategy.update(pro_queries)

            elif primary_type == "vector_search":
                term = primary_strategy.get("term", "")
                vector_queries = build_vector_search_query_sql(term, limit=100)
                if sql_filters:
                    # Safer combination logic for Vector Search
                    id_list = vector_queries['id_list_query']

                    # Vector query from build_vector_search_query_sql usually looks like:
                    # SELECT id, embedding <=> [...] as distance FROM blocuri ORDER BY distance LIMIT 100
                    # It might NOT have a WHERE clause initially.

                    if "WHERE" in id_list:
                        combined_id_list = id_list.replace("WHERE", f"WHERE ({sql_filters}) AND", 1)
                    else:
                        if "ORDER BY" in id_list:
                            combined_id_list = id_list.replace("ORDER BY", f"WHERE {sql_filters} ORDER BY")
                        else:
                            combined_id_list = id_list + f" WHERE {sql_filters}"

                    # Approximate count query logic
                    # Vector search counts are tricky because they depend on similarity threshold,
                    # but typically we just count filtered results or use the total if just sorting.
                    # Here we construct a count query based on filters only, as 'similarity' is a sort, not a hard filter usually unless thresholded.
                    # But for 'combined', we assume filters reduce the scope.
                    strategy['count_query'] = f"SELECT COUNT(*) FROM blocuri WHERE {sql_filters}"
                    strategy['id_list_query'] = combined_id_list
                else:
                    strategy.update(vector_queries)
            elif primary_type == "sql_standard" or not primary_type:
                # Handle case where LLM uses 'sql_standard' as primary inside combined, or just filters
                # This essentially treats it as a standard SQL search where primary 'term' (if any)
                # is combined with 'sql_filters'
                term = primary_strategy.get("term", "")

                conditions = []
                if term:
                    # If term is not a SQL operation (e.g. contains = or LIKE), assume it's a keyword
                    if not any(op in term.upper() for op in ["=", "LIKE", "ILKE", "~", ">", "<", "IS NULL", "IS NOT NULL"]):
                        logger.info(f"Treating bare term '{term}' as keyword search.")
                        # Construct a generic search condition for the term
                        term_safe = term.replace("'", "''")
                        term_condition = (
                            f"(obj->>'obiect' ILIKE '%{term_safe}%' OR "
                            f"obj->>'keywords' ILIKE '%{term_safe}%' OR "
                            f"obj->>'text_situatia_de_fapt' ILIKE '%{term_safe}%')"
                        )
                        conditions.append(term_condition)
                    else:
                        conditions.append(term)

                if sql_filters:
                    conditions.append(sql_filters)

                if conditions:
                    combined_where = " AND ".join([f"({c})" for c in conditions])
                    strategy['count_query'] = f"SELECT COUNT(*) FROM blocuri WHERE {combined_where}"
                    strategy['id_list_query'] = f"SELECT id FROM blocuri WHERE {combined_where} LIMIT 100"
                else:
                    logger.warning("Combined strategy with no valid filters or term.")
            else:
                 # Fallback if unknown primary
                 logger.warning(f"Unknown primary strategy in combined: {primary_type}")

    async def _handle_auto_expansion(self, user_query: str, strategy: Dict[str, Any], initial_ids: list) -> Dict[str, Any]:
        strategy["initial_ids"] = initial_ids
        res = await self.strategy_engine.execute_multi_strategy(user_query, strategy, mode="auto_expand")
        strategy["precomputed_count"] = res["total_cases"]
        strategy["precomputed_ids"] = res["merged_ids"]
        strategy["rationale"] += f"\nAuto-Expanded: {res['rationale']}"
        strategy["strategies_used"] = res["strategies_used"]
        strategy["strategy_breakdown"] = res["breakdown"]
        return strategy

    def _generate_fallback_strategy(self, user_query: str) -> Dict[str, Any]:
        return self.strategy_engine._generate_fallback_sql_strategy(user_query)

    async def _verify_strategy(self, user_query: str, strategy: Dict[str, Any], preview_data: list):
        prompt = self.prompt_manager.build_verification_prompt(user_query, strategy, preview_data)
        await LLMClient.call_llm(prompt, timeout=300, label="Verification")

    async def _send_completion_email(
        self,
        recipient_email: str,
        user_query: str,
        result: Dict[str, Any],
        execution_time: float,
        plan_id: str
    ):
        """Send email notification when analysis completes successfully"""
        try:
            from .email_utils import send_analysis_completion_email

            # Prepare analysis summary
            analysis_summary = {
                'total_cases_analyzed': result.get('cases_analyzed', 0),
                'interpretation': result.get('interpretation', '')
            }

            await send_analysis_completion_email(
                recipient_email,
                user_query,
                analysis_summary,
                execution_time,
                plan_id
            )
            logger.info(f"Sent completion email to {recipient_email} for plan {plan_id}")
        except Exception as e:
            # Don't fail the analysis if email fails
            logger.error(f"Failed to send completion email: {e}", exc_info=True)

    async def _send_error_email(
        self,
        recipient_email: str,
        user_query: str,
        error_message: str,
        plan_id: str
    ):
        """Send email notification when analysis fails"""
        try:
            from .email_utils import send_analysis_error_email

            await send_analysis_error_email(
                recipient_email,
                user_query,
                error_message,
                plan_id
            )
            logger.info(f"Sent error email to {recipient_email} for plan {plan_id}")
        except Exception as e:
            # Don't fail further if error email fails
            logger.error(f"Failed to send error email: {e}", exc_info=True)

    def update_plan_case_limit(self, plan_id: str, max_cases: int) -> Dict[str, Any]:
        return self.plan_manager.update_plan_case_limit(plan_id, max_cases)

    async def decompose_into_tasks(self, user_query: str) -> Dict[str, Any]:
        """
        PHASE 0: Task Decomposition

        Uses LLM to intelligently break down a complex legal query into
        multiple distinct sub-tasks.

        Args:
            user_query: The original user question

        Returns:
            {
                'success': bool,
                'tasks': List[Dict],  # Each task: {id, title, query, category, priority, rationale}
                'rationale': str,
                'total_tasks': int,
                'estimated_complexity': str
            }
        """
        try:
            logger.info(f"--- START TASK DECOMPOSITION for: {user_query[:50]}... ---")

            # 1. Build task breakdown prompt
            prompt = self.prompt_manager.build_task_breakdown_prompt(user_query)

            # 2. Call LLM
            # Check LLM mode setting
            from ..settings_manager import settings_manager
            llm_mode = settings_manager.get_value('setari_llm', 'advanced_llm_mode', 'network')

            if llm_mode == 'local':
                success, content, path = await LLMClient.call_llm_local(prompt, timeout=300, label="Task Breakdown")
            else:
                success, content, path = await LLMClient.call_llm(prompt, timeout=300, label="Task Breakdown")

            if not success:
                logger.error(f"[Task Breakdown] LLM call failed: {content}")
                return {
                    'success': False,
                    'error': f'Nu s-a putut obține răspuns de la LLM: {content}'
                }

            # 3. Parse JSON response
            try:
                result = LLMClient.parse_json_response(content)
                LLMClient.delete_response(path)
            except Exception as parse_error:
                logger.error(f"[Task Breakdown] JSON parsing failed: {parse_error}")
                LLMClient.delete_response(path)
                return {
                    'success': False,
                    'error': f'Răspunsul LLM nu este în format JSON valid: {str(parse_error)}'
                }

            # 4. Validate response structure
            if not isinstance(result, dict):
                return {'success': False, 'error': 'Răspunsul LLM nu este un obiect JSON.'}

            if 'tasks' not in result or not isinstance(result['tasks'], list):
                return {'success': False, 'error': 'Răspunsul LLM nu conține un array "tasks" valid.'}

            if len(result['tasks']) == 0:
                return {'success': False, 'error': 'LLM-ul nu a generat niciun task.'}

            # 5. Validate each task has required fields
            required_fields = ['id', 'title', 'query', 'category', 'priority', 'rationale']
            valid_tasks = []

            for task in result['tasks']:
                if not isinstance(task, dict):
                    continue

                # Check all required fields are present
                if all(field in task for field in required_fields):
                    # Validate category
                    valid_categories = [
                        'definitional', 'legislative', 'case_law', 'statistical',
                        'doctrinal', 'comparative', 'case_study', 'structural', 'synthesis'
                    ]
                    if task['category'] not in valid_categories:
                        logger.warning(f"Invalid category '{task['category']}' for task {task['id']}, defaulting to 'definitional'")
                        task['category'] = 'definitional'

                    # Validate priority
                    valid_priorities = ['high', 'medium', 'low']
                    if task['priority'] not in valid_priorities:
                        logger.warning(f"Invalid priority '{task['priority']}' for task {task['id']}, defaulting to 'medium'")
                        task['priority'] = 'medium'

                    valid_tasks.append(task)
                else:
                    missing = [f for f in required_fields if f not in task]
                    logger.warning(f"Task {task.get('id', 'unknown')} missing required fields: {missing}")

            if len(valid_tasks) == 0:
                return {
                    'success': False,
                    'error': 'Niciunul dintre taskurile generate nu are toate câmpurile obligatorii.'
                }

            logger.info(f"[Task Breakdown] Successfully generated {len(valid_tasks)} tasks")

            return {
                'success': True,
                'tasks': valid_tasks,
                'decomposition_rationale': result.get('decomposition_rationale', 'N/A'),
                'total_tasks': len(valid_tasks),
                'estimated_complexity': result.get('estimated_complexity', 'medium')
            }

        except Exception as e:
            logger.error(f"[Task Breakdown] Unexpected error: {e}", exc_info=True)
            return {
                'success': False,
                'error': f'Eroare neașteptată la descompunerea taskului: {str(e)}'
            }

    async def synthesize_final_report(
        self,
        original_query: str,
        task_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        PHASE 4: Final Report Synthesis

        Aggregates all task results and generates a professional legal dissertation
        through LLM.

        Args:
            original_query: The original user question
            task_results: List of completed task results
                         Format: [{
                             'task_id': str,
                             'query': str,
                             'user_metadata': dict,
                             'result': dict (from PHASE 3)
                         }]

        Returns:
            {
                'success': bool,
                'report': dict,
                'report_id': str,
                'total_cases_cited': int,
                'word_count': int,
                'generation_time': float
            }
        """
        import time
        import uuid
        import json
        start_time = time.time()

        logger.info("=" * 80)
        logger.info("📋 PHASE 4: Final Report Synthesis Started")
        logger.info(f"Original Query: {original_query}")
        logger.info(f"Processing {len(task_results)} task results")
        logger.info(f"⏰ Start Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)

        try:
            # 1. Aggregate all case IDs from all tasks
            logger.info("Step 1/6: Aggregating case IDs from all task results...")
            all_case_ids = set()
            task_case_counts = []

            for idx, task_result in enumerate(task_results, 1):
                # Extract case IDs from result (Phase 3 stores them in bibliography_ids)
                case_ids = task_result.get('result', {}).get('bibliography_ids', [])
                all_case_ids.update(case_ids)
                task_case_counts.append({
                    'task': task_result.get('query', f'Task {idx}')[:50],
                    'case_count': len(case_ids)
                })
                logger.debug(f"  Task {idx}/{len(task_results)}: {len(case_ids)} case IDs")

            logger.info(f"✓ Total unique case IDs referenced: {len(all_case_ids)}")
            for tc in task_case_counts[:5]:
                logger.info(f"  - {tc['task']}: {tc['case_count']} cases")
            if len(task_case_counts) > 5:
                logger.info(f"  ... and {len(task_case_counts) - 5} more tasks")

            # 2. Format task results for LLM
            logger.info("Step 2/6: Formatting task results for LLM prompt...")
            aggregated_data = []
            for task in task_results:
                aggregated_data.append({
                    'task_title': task.get('query', 'Untitled Task'),
                    'task_category': task.get('user_metadata', {}).get('category', 'general'),
                    'task_result': task.get('result', {}),
                    'referenced_case_ids': task.get('result', {}).get('bibliography_ids', [])
                })

            # 3. Build prompt
            logger.info("Step 3/6: Building LLM prompt...")
            prompt = self.prompt_manager.build_final_report_synthesis_prompt(original_query, aggregated_data)

            logger.info(f"Prompt length: ~{len(prompt)} characters")

            # 4. Call LLM with extended timeout
            logger.info("Step 4/6: Calling LLM for final report synthesis...")
            logger.info("⏰ Expected duration: 5-10 minutes")

            # Check LLM mode setting
            from ..settings_manager import settings_manager
            llm_mode = settings_manager.get_value('setari_llm', 'advanced_llm_mode', 'network')

            if llm_mode == 'local':
                success, content, path = await LLMClient.call_llm_local(
                    prompt,
                    timeout=600,  # 10 minutes
                    label="Final Report Synthesis"
                )
            else:
                success, content, path = await LLMClient.call_llm(
                    prompt,
                    timeout=600,  # 10 minutes
                    label="Final Report Synthesis"
                )

            if not success:
                logger.error(f"LLM call failed: {content}")
                return {
                    'success': False,
                    'error': f"LLM synthesis failed: {content}",
                    'recoverable': True
                }

            # 5. Parse JSON response
            logger.info("Step 5/6: Parsing and validating LLM response...")
            try:
                report = LLMClient.parse_json_response(content)
            except Exception as e:
                logger.error(f"Failed to parse LLM response as JSON: {e}")
                return {
                    'success': False,
                    'error': f"Invalid JSON from LLM: {str(e)}",
                    'recoverable': True
                }

            # Validate required fields
            required_fields = ['title', 'table_of_contents', 'introduction', 'chapters', 'conclusions', 'bibliography']
            missing_fields = [f for f in required_fields if f not in report]
            if missing_fields:
                logger.error(f"Report missing required fields: {missing_fields}")
                return {
                    'success': False,
                    'error': f"Incomplete report structure. Missing: {', '.join(missing_fields)}"
                }

            # Validate bibliography - CRITICAL: Only cited case IDs
            cited_ids = set()
            for item in report.get('bibliography', {}).get('jurisprudence', []):
                cited_ids.add(item.get('case_id'))

            # Check for hallucinated IDs
            unknown_ids = cited_ids - all_case_ids
            if unknown_ids:
                logger.warning(f"⚠️  LLM cited unknown case IDs (hallucinations): {unknown_ids}")
                # Filter out hallucinated references
                report['bibliography']['jurisprudence'] = [
                    item for item in report['bibliography']['jurisprudence']
                    if item.get('case_id') in all_case_ids
                ]
                logger.info(f"✓ Filtered bibliography to only include verified case IDs")

            valid_cited_ids = cited_ids & all_case_ids
            report['bibliography']['total_cases_cited'] = len(valid_cited_ids)

            # 6. Generate report ID and save immediately to disk
            logger.info("Step 6/6: Persisting final report to disk...")
            report_id = f"report_{uuid.uuid4().hex[:8]}"

            # CRITICAL: Save immediately - this is our checkpoint
            # If system crashes after this, report is recoverable
            self.plan_manager.save_final_report(report_id, report)

            generation_time = time.time() - start_time
            logger.info("=" * 80)
            logger.info("✅ PHASE 4: Final Report Synthesis COMPLETED")
            logger.info(f"Report ID: {report_id}")
            logger.info(f"Valid citations: {len(valid_cited_ids)}")
            logger.info(f"Word count: ~{report.get('metadata', {}).get('word_count_estimate', 0)}")
            logger.info(f"Generation time: {generation_time:.2f}s")
            logger.info(f"Report persisted: analyzer_plans/final_report_{report_id}.json")
            logger.info("=" * 80)

            return {
                'success': True,
                'report': report,
                'report_id': report_id,
                'total_cases_cited': len(valid_cited_ids),
                'word_count': report.get('metadata', {}).get('word_count_estimate', 0),
                'generation_time': generation_time,
                'file_path': f"analyzer_plans/final_report_{report_id}.json"
            }

        except Exception as e:
            logger.error("=" * 80)
            logger.error("❌ PHASE 4: Final Report Synthesis FAILED")
            logger.error(f"Error: {e}", exc_info=True)
            logger.error("All task results are still persisted - report generation can be retried")
            logger.error("=" * 80)
            return {
                'success': False,
                'error': str(e),
                'recoverable': True
            }



# Alias
TwoRoundLLMAnalyzer = ThreeStageAnalyzer
