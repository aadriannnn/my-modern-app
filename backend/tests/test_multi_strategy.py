
import pytest
import asyncio
from unittest.mock import MagicMock, AsyncMock, patch
from backend.app.lib.two_round_llm_analyzer import ThreeStageAnalyzer
from backend.app.multi_strategy_config import MultiStrategyConfig

@pytest.fixture
def analyzer():
    mock_session = MagicMock()
    return ThreeStageAnalyzer(mock_session)

@pytest.mark.asyncio
async def test_auto_expansion(analyzer):
    """
    Test 1: Auto-Expansion
    Input: "cazuri despre legitima apărare în București"
    Expected:
      - Primary: SQL Standard găsește 3 cazuri (< threshold 5)
      - Auto-expand: Pro Search găsește încă 8 cazuri
      - Total: 11 cazuri (3 + 8)
      - Rationale: "🔄 AUTO-EXPANDED: SQL + Pro Search"
    """
    user_query = "cazuri despre legitima apărare în București"

    # Mocking _execute_discovery_queries to return 3 results initially
    analyzer._execute_discovery_queries = MagicMock(return_value=(3, [1, 2, 3]))

    # Mocking _execute_multi_strategy to return expanded results
    expanded_results = {
        "total_cases": 11,
        "merged_ids": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        "strategies_used": ["sql_standard", "pro_search"],
        "breakdown": {"sql_standard": 3, "pro_search": 8},
        "rationale": "Auto-expanded rationale"
    }
    analyzer._execute_multi_strategy = AsyncMock(return_value=expanded_results)

    # Mock LLM generation
    initial_strategy = {
        "strategy_type": "sql_standard",
        "count_query": "SELECT...",
        "id_list_query": "SELECT...",
        "selected_columns": [],
        "rationale": "Initial rationale",
        "initial_ids": [1, 2, 3] # Injecting this as it would be in real flow if we modify create_plan
    }
    analyzer._generate_discovery_strategy = AsyncMock(return_value=initial_strategy)

    # Mock Verification
    analyzer._verify_strategy = AsyncMock(return_value={"valid": True})
    analyzer._fetch_chunk_data = MagicMock(return_value=[])
    analyzer._save_plan = MagicMock()

    # Run create_plan
    plan = await analyzer.create_plan(user_query)

    # Assertions
    assert plan['success'] is True
    assert plan['total_cases'] == 11
    assert "AUTO-EXPANDED" in plan['strategy_summary']
    assert plan['strategies_used'] == ["sql_standard", "pro_search"]

    # Verify auto-expansion was called
    analyzer._execute_multi_strategy.assert_called_once()
    args, kwargs = analyzer._execute_multi_strategy.call_args
    assert kwargs['mode'] == "auto_expand"

@pytest.mark.asyncio
async def test_exhaustive_search(analyzer):
    """
    Test 2: Exhaustive Search
    Input: "caută exhaustiv toate cazurile despre omor calificat"
    Expected:
      - Detectează "exhaustiv"
      - Rulează: SQL + Pro Search + Vector (implicit in test mock)
      - Deduplică: 67 cazuri unice
    """
    user_query = "caută exhaustiv toate cazurile despre omor calificat"

    # Mocking inner call
    expanded_results = {
        "total_cases": 67,
        "merged_ids": list(range(67)),
        "strategies_used": ["sql_standard", "pro_search", "vector_search"],
        "breakdown": {"sql_standard": 45, "pro_search": 12, "vector_search": 28},
        "rationale": "Exhaustive search results."
    }
    analyzer._execute_multi_strategy = AsyncMock(return_value=expanded_results)

    # Mock network saver to return "exhaustive" strategy type
    with patch('backend.app.lib.network_file_saver.NetworkFileSaver.save_to_network', return_value=(True, "ok", "path")):
        with patch('backend.app.lib.network_file_saver.NetworkFileSaver.poll_for_response', return_value=(True, '{"strategy_type": "exhaustive"}', "path")):
             with patch('backend.app.lib.network_file_saver.NetworkFileSaver.delete_response_file'):
                # Call the method
                strategy = await analyzer._generate_discovery_strategy(user_query)

                # Assertions
                assert strategy['strategy_type'] == "exhaustive"
                assert strategy['precomputed_count'] == 67
                analyzer._execute_multi_strategy.assert_called_once()
                args, kwargs = analyzer._execute_multi_strategy.call_args
                assert kwargs['mode'] == "exhaustive"

def test_deduplication(analyzer):
    """
    Test 3: Deduplication Logic
    Verify merging results from multiple strategies.
    """
    results = [
        {"strategy_type": "sql_standard", "ids": [1, 2, 3]},
        {"strategy_type": "pro_search", "ids": [2, 3, 4]},
        {"strategy_type": "vector_search", "ids": [3, 4, 5]}
    ]

    merged = analyzer._merge_strategy_results(results)

    assert set(merged['unique_ids']) == {1, 2, 3, 4, 5}
    assert len(merged['unique_ids']) == 5

    # Check source map
    assert "sql_standard" in merged['source_map'][1]
    assert "pro_search" not in merged['source_map'][1]

    assert "sql_standard" in merged['source_map'][2]
    assert "pro_search" in merged['source_map'][2]

    assert "sql_standard" in merged['source_map'][3]
    assert "pro_search" in merged['source_map'][3]
    assert "vector_search" in merged['source_map'][3]

def test_ranking(analyzer):
    """
    Test 4: Ranking Logic
    """
    merged = {
        "unique_ids": [1, 2, 3, 4],
        "source_map": {
            1: ["sql_standard"], # Priority 3 (sql_only)
            2: ["pro_search"], # Priority 2 (pro_search_only)
            3: ["sql_standard", "pro_search"], # Priority 1 (multi_strategy)
            4: ["vector_search"] # Priority 4 (vector_only)
        }
    }

    ranked = analyzer._rank_merged_results(merged)
    ids = ranked['unique_ids']

    # Expected order: Multi (3) -> Pro Only (2) -> SQL Only (1) -> Vector Only (4)
    assert ids == [3, 2, 1, 4]
