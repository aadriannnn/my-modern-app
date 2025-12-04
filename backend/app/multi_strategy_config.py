"""
Configuration for Multi-Strategy Search Enhancement.

This module defines settings for auto-expansion and exhaustive search features.
"""
from typing import Dict, List


class MultiStrategyConfig:
    """Configuration for multi-strategy auto-expansion and exhaustive search."""

    # ========== AUTO-EXPANSION SETTINGS ==========

    # Minimum results threshold - if primary strategy returns fewer cases, trigger auto-expansion
    MIN_RESULTS_THRESHOLD: int = 5

    # Enable/disable auto-expansion feature globally
    AUTO_EXPAND_ENABLED: bool = True

    # ========== STRATEGY EXPANSION PRIORITY ==========

    # Defines which secondary strategies to try when expanding from a primary strategy
    # Format: {primary_strategy: [secondary_strategy_1, secondary_strategy_2, ...]}
    EXPANSION_PRIORITY: Dict[str, List[str]] = {
        "sql_standard": ["pro_search", "vector_search"],
        "pro_search": ["sql_standard", "vector_search"],
        "vector_search": ["pro_search", "sql_standard"]
    }

    # ========== EXHAUSTIVE SEARCH SETTINGS ==========

    # Maximum number of strategies to run in parallel for exhaustive search
    MAX_PARALLEL_STRATEGIES: int = 3

    # Romanian keywords that trigger exhaustive search mode
    # When LLM detects these in user query, it should use "exhaustive" strategy_type
    EXHAUSTIVE_KEYWORDS: List[str] = [
        "exhaustiv",
        "exhaustivă",
        "complet",
        "completă",
        "toate",
        "tot ce",
        "căutare completă",
        "căutare exhaustivă",
        "search exhaustiv",
        "toate cazurile",
        "tot ce există"
    ]

    # ========== RANKING WEIGHTS ==========

    # Priority weights for ranking merged results
    # Higher weight = higher priority in final ranking
    RANKING_WEIGHTS: Dict[str, float] = {
        "multi_strategy": 4.0,    # Found by 2+ strategies (highest confidence)
        "pro_search_only": 3.0,   # Pro Search only (good for legal reasoning)
        "sql_only": 2.0,          # SQL Standard only
        "vector_only": 1.0        # Vector Search only (lowest priority)
    }

    # ========== PERFORMANCE SETTINGS ==========

    # Timeout for individual strategy execution (seconds)
    STRATEGY_TIMEOUT: int = 30

    # Maximum number of results to fetch per strategy in multi-strategy mode
    MAX_RESULTS_PER_STRATEGY: int = 100

    # ========== LOGGING ==========

    # Enable detailed logging for multi-strategy operations
    VERBOSE_LOGGING: bool = True

    @classmethod
    def get_all_strategies(cls) -> List[str]:
        """Returns list of all available search strategies."""
        return ["sql_standard", "pro_search", "vector_search"]

    @classmethod
    def is_exhaustive_keyword(cls, query: str) -> bool:
        """
        Checks if query contains any exhaustive search keywords.

        Args:
            query: User query to check

        Returns:
            True if query contains exhaustive keywords, False otherwise
        """
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in cls.EXHAUSTIVE_KEYWORDS)
