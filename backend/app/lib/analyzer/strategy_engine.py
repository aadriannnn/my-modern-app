import logging
import asyncio
from typing import Dict, Any, List
from ...multi_strategy_config import MultiStrategyConfig
from ...logic.search_logic import build_pro_search_query_sql, build_vector_search_query_sql
from .data_fetcher import DataFetcher

logger = logging.getLogger(__name__)

class StrategyEngine:
    """Handles multi-strategy logic (auto-expansion, exhaustive search)."""

    def __init__(self, data_fetcher: DataFetcher):
        self.data_fetcher = data_fetcher

    async def execute_multi_strategy(self, user_query: str, primary_strategy: Dict[str, Any], mode: str = "auto_expand") -> Dict[str, Any]:
        """Execute multiple search strategies and merge results."""
        logger.info(f"[MULTI-STRATEGY] Mode: {mode}")

        strategies_to_run = self._determine_expansion_strategies(primary_strategy, mode)

        # In exhaustive mode, we run ALL strategies including what would be primary.
        if mode == "exhaustive":
            strategies_to_run = MultiStrategyConfig.get_all_strategies()

        if not strategies_to_run and mode == "auto_expand":
             # Should include at least one expansion if called
             pass

        tasks = [self._execute_single_strategy_by_name(user_query, s) for s in strategies_to_run]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        valid_results = []
        for res in results:
            if not isinstance(res, Exception):
                valid_results.append(res)
            else:
                logger.error(f"Strategy failed: {res}")

        # For auto_expand, inject primary result if available (it should be passed or reconstructed)
        if mode == "auto_expand":
            if "initial_ids" in primary_strategy:
                valid_results.append({
                    "strategy_type": primary_strategy.get("strategy_type", "unknown"),
                    "ids": primary_strategy["initial_ids"],
                    "count": len(primary_strategy["initial_ids"])
                })

        merged = self._merge_strategy_results(valid_results)
        ranked = self._rank_merged_results(merged)

        strategies_used = [r["strategy_type"] for r in valid_results]

        return {
            "total_cases": len(ranked["unique_ids"]),
            "strategies_used": strategies_used,
            "breakdown": {s["strategy_type"]: s["count"] for s in valid_results},
            "merged_ids": ranked["unique_ids"],
            "rationale": self._build_rationale(valid_results, mode)
        }

    async def _execute_single_strategy_by_name(self, user_query: str, strategy_name: str) -> Dict[str, Any]:
        """Executes a single named strategy."""
        try:
            strategy_def = {}
            if strategy_name == "sql_standard":
                # Basic fallback for SQL standard if we don't have LLM SQL
                strategy_def = self._generate_fallback_sql_strategy(user_query)
            elif strategy_name == "pro_search":
                pro_queries = build_pro_search_query_sql(user_query, limit=100)
                strategy_def = {
                    "strategy_type": "pro_search",
                    "count_query": pro_queries["count_query"],
                    "id_list_query": pro_queries["id_list_query"],
                    "selected_columns": ["considerente_speta", "solutia", "obiect"]
                }
            elif strategy_name == "vector_search":
                vector_queries = build_vector_search_query_sql(user_query, limit=100)
                strategy_def = {
                    "strategy_type": "vector_search",
                    "count_query": vector_queries["count_query"],
                    "id_list_query": vector_queries["id_list_query"],
                    "selected_columns": ["text_situatia_de_fapt", "solutia"]
                }

            count, ids = self.data_fetcher.execute_discovery_queries(strategy_def)
            return {
                "strategy_type": strategy_name,
                "ids": ids,
                "count": count
            }
        except Exception as e:
            logger.error(f"Error in {strategy_name}: {e}")
            raise

    def _generate_fallback_sql_strategy(self, user_query: str) -> Dict[str, Any]:
        words = [w for w in user_query.lower().split() if len(w) > 3]
        if not words: words = ['penal']

        conditions = []
        for kw in words[:3]:
            conditions.append(f"(obj->>'obiect' ILIKE '%{kw}%' OR obj->>'keywords' ILIKE '%{kw}%')")

        where = " OR ".join(conditions)
        return {
            "strategy_type": "sql_standard",
            "count_query": f"SELECT COUNT(*) FROM blocuri WHERE ({where})",
            "id_list_query": f"SELECT id FROM blocuri WHERE ({where}) LIMIT 100"
        }

    def _determine_expansion_strategies(self, primary: Dict[str, Any], mode: str) -> List[str]:
        if mode == "auto_expand":
            primary_type = primary.get("strategy_type", "sql_standard")
            return MultiStrategyConfig.EXPANSION_PRIORITY.get(primary_type, ["vector_search"])
        return []

    def _merge_strategy_results(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        unique_ids = set()
        source_map = {}
        for res in results:
            stype = res["strategy_type"]
            for cid in res["ids"]:
                unique_ids.add(cid)
                if cid not in source_map: source_map[cid] = []
                if stype not in source_map[cid]: source_map[cid].append(stype)
        return {"unique_ids": list(unique_ids), "source_map": source_map}

    def _rank_merged_results(self, merged: Dict[str, Any]) -> Dict[str, Any]:
        ranking = {"multi": [], "pro": [], "sql": [], "vector": []}
        for cid, sources in merged["source_map"].items():
            if len(sources) > 1: ranking["multi"].append(cid)
            elif "pro_search" in sources: ranking["pro"].append(cid)
            elif "sql_standard" in sources: ranking["sql"].append(cid)
            else: ranking["vector"].append(cid)

        final = ranking["multi"] + ranking["pro"] + ranking["sql"] + ranking["vector"]
        return {"unique_ids": final}

    def _build_rationale(self, results: List[Dict[str, Any]], mode: str) -> str:
        lines = [f"Mode: {mode}"]
        for r in results:
            lines.append(f"- {r['strategy_type']}: {r['count']} found")
        return "\n".join(lines)
