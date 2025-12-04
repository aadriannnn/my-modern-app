"""
Module for Three-Stage Advanced Analysis (Map-Reduce) with LLM.
Refactored to use modular components.
"""
import logging
import asyncio
from sqlmodel import Session
from typing import Dict, Any, Optional, Callable, Awaitable

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
            if MultiStrategyConfig.AUTO_EXPAND_ENABLED and 0 < total_cases < MultiStrategyConfig.MIN_RESULTS_THRESHOLD:
                strategy = await self._handle_auto_expansion(user_query, strategy, all_ids)
                total_cases = strategy["precomputed_count"]
                all_ids = strategy["precomputed_ids"]

            if total_cases == 0:
                return {'success': False, 'error': 'Nu s-au găsit date relevante.'}

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

    async def execute_plan(self, plan_id: str, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
        """PHASE 2 & 3: Execution & Synthesis"""
        try:
            plan = self.plan_manager.load_plan(plan_id)
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
            return await self.synthesize_results(plan_id)

        except Exception as e:
            logger.error(f"[EXECUTION] Error: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    async def execute_chunk(self, plan: Dict[str, Any], chunk_index: int) -> Dict[str, Any]:
        try:
            chunk_ids = plan['chunks'][chunk_index]
            data = self.data_fetcher.fetch_chunk_data(chunk_ids, plan['strategy']['selected_columns'])
            truncated_data, _ = self.data_fetcher.validate_and_truncate_data(data, plan['user_query'])

            prompt = self.prompt_manager.build_chunk_analysis_prompt(
                plan['user_query'], truncated_data, chunk_index, plan['total_chunks']
            )

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
            success, content, path = await LLMClient.call_llm(prompt, label="Synthesis")
            if not success: raise RuntimeError(content)

            result = LLMClient.parse_json_response(content)
            LLMClient.delete_response(path)

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

    def update_plan_case_limit(self, plan_id: str, max_cases: int) -> Dict[str, Any]:
        return self.plan_manager.update_plan_case_limit(plan_id, max_cases)

# Alias
TwoRoundLLMAnalyzer = ThreeStageAnalyzer
