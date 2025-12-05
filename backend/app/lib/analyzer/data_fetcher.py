import json
import logging
from typing import List, Dict, Tuple, Any
from sqlmodel import Session, text

logger = logging.getLogger(__name__)

class DataFetcher:
    """Handles SQL execution and data retrieval."""

    def __init__(self, session: Session):
        self.session = session

    def execute_discovery_queries(self, strategy: Dict[str, Any]) -> Tuple[int, List[int]]:
        """Executes generated queries to get count and ID list."""

        if "precomputed_count" in strategy and "precomputed_ids" in strategy:
            logger.info(f"[DATA] Using precomputed results for {strategy.get('strategy_type')}")
            return strategy["precomputed_count"], strategy["precomputed_ids"]

        if "count_query" not in strategy or "id_list_query" not in strategy:
            raise ValueError("Strategia nu conține query-urile necesare.")

        count_sql = strategy['count_query']
        ids_sql = strategy['id_list_query']

        # Execute Count
        try:
            count_res = self.session.execute(text(count_sql)).scalar()
            logger.info(f"[DATA] Count result: {count_res}")
        except Exception as e:
            logger.error(f"Error executing COUNT query: {e}")
            raise ValueError(f"Query COUNT invalid: {e}")

        # Execute IDs
        try:
            ids_res = self.session.execute(text(ids_sql)).scalars().all()
            ids_list = list(ids_res)
            logger.info(f"[DATA] Found {len(ids_list)} IDs")
        except Exception as e:
            logger.error(f"Error executing ID_LIST query: {e}")
            raise ValueError(f"Query ID_LIST invalid: {e}")

        return count_res, ids_list

    def fetch_chunk_data(self, ids: List[int], columns: List[str]) -> List[Dict]:
        """Smart Fetch: Extracts only specified columns for a list of IDs."""
        if not ids:
            return []

        select_parts = ["id"]
        for col in columns:
            clean_col = col.replace("'", "")

            # Determine the SQL expression for the column
            if clean_col == 'denumire':
                # Logic mirrored from frontend ResultItem.tsx: titlu || text_denumire_articol || denumire || Caz #ID
                # Also include 'obiect' as a fallback if everything else is missing, as it often contains the case name type
                expression = """
                    COALESCE(
                        NULLIF(obj->>'titlu', ''),
                        NULLIF(obj->>'text_denumire_articol', ''),
                        NULLIF(obj->>'denumire', ''),
                        'Caz #' || id::text
                    )
                """
            elif clean_col == 'solutia':
                # Fallback chain for solution
                expression = "COALESCE(obj->>'solutia', obj->>'solutie', obj->>'minuta', obj->>'decizia', '')"
            elif clean_col == 'text_situatia_de_fapt':
                # Fallback chain for situation text
                expression = "COALESCE(obj->>'text_situatia_de_fapt', obj->>'situatia_de_fapt', obj->>'situatie', '')"
            else:
                expression = f"obj->>'{clean_col}'"

            # Apply truncation for long text fields to avoid LLM context overflow
            if clean_col in ['considerente_speta', 'text_situatia_de_fapt', 'solutia', 'text_individualizare', 'argumente_instanta', 'text_doctrina', 'text_ce_invatam']:
                select_parts.append(f"substring({expression} from 1 for 4000) as \"{clean_col}\"")
            else:
                select_parts.append(f"{expression} as \"{clean_col}\"")

        select_clause = ", ".join(select_parts)
        ids_str = ",".join(map(str, ids))

        sql = f"SELECT {select_clause} FROM blocuri WHERE id IN ({ids_str})"

        results = self.session.execute(text(sql)).mappings().all()
        return [dict(r) for r in results]

    def validate_and_truncate_data(self, filtered_data: List[Dict], user_query: str, max_chars: int = 30000) -> Tuple[List[Dict], Dict[str, Any]]:
        """Validates and truncates data to fit within max_chars."""
        base_prompt = f"TASK: {user_query}"
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

        metadata = {
            'total_cases_filtered': len(filtered_data),
            'cases_included_in_prompt': cases_included,
            'truncated': cases_included < len(filtered_data)
        }
        return truncated_data, metadata
