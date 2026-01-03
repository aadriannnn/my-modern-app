
import sys
import os

# Add parent directory to path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../../')))

from backend.app.lib.two_round_llm_analyzer import DEFAULT_SELECTED_COLUMNS
from backend.app.lib.analyzer.strategy_engine import StrategyEngine

print(f"DEFAULT_SELECTED_COLUMNS: {DEFAULT_SELECTED_COLUMNS}")

if "titlu" in DEFAULT_SELECTED_COLUMNS:
    print("SUCCESS: Default columns defined correctly.")
else:
    print("FAILURE: Default columns missing.")

# Check StrategyEngine fallback
try:
    # Mock data fetcher
    se = StrategyEngine(None)
    fallback = se._generate_fallback_sql_strategy("test query")
    if "selected_columns" in fallback:
        print(f"SUCCESS: Fallback strategy has selected_columns: {fallback['selected_columns']}")
    else:
        print("FAILURE: Fallback strategy missing selected_columns")
except Exception as e:
    print(f"FAILURE: Strategy check failed: {e}")
