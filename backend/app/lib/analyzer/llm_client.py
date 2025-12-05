import json
import logging
import re
import os
from typing import Dict, Any, Optional, Tuple

# Correct imports assuming this file is backend/app/lib/analyzer/llm_client.py
# NetworkFileSaver is in backend/app/lib/network_file_saver.py
# settings_manager is in backend/app/settings_manager.py
from ...settings_manager import settings_manager
from ..network_file_saver import NetworkFileSaver

logger = logging.getLogger(__name__)

class LLMClient:
    """Handles interaction with the LLM via NetworkFileSaver."""

    @staticmethod
    async def call_llm(prompt: str, timeout: int = 600, label: str = "LLM Call") -> Tuple[bool, str, str]:
        """
        Sends prompt to LLM and waits for response.
        Returns: (success, content, response_path)
        """
        retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
        retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

        success, message, saved_path = NetworkFileSaver.save_to_network(
            content=prompt,
            host=retea_host,
            shared_folder=retea_folder,
            subfolder=''
        )

        if not success:
            logger.error(f"[{label}] Failed to save prompt: {message}")
            return False, message, ""

        poll_success, poll_content, response_path = await NetworkFileSaver.poll_for_response(
            saved_path=saved_path,
            timeout_seconds=timeout,
            poll_interval=5
        )

        if not poll_success:
            logger.error(f"[{label}] Timeout or error: {poll_content}")
            return False, poll_content, ""

        # Check for Echo
        if prompt[:200].strip() == poll_content[:200].strip():
             logger.error(f"[{label}] ECHO DETECTED.")
             NetworkFileSaver.delete_response_file(response_path)
             return False, "ECHO DETECTED", response_path

        return True, poll_content, response_path

    @staticmethod
    def parse_json_response(content: str) -> Dict[str, Any]:
        """Parses JSON response from LLM, cleaning markdown fences and headers."""
        cleaned = content.strip()
        cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
        cleaned = re.sub(r'\s*```\s*$', '', cleaned)
        cleaned = re.sub(r'^={10,}.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^-{10,}.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^🔬 PHASE \d+:.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    parsed = json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    logger.warning(f"Failed to parse JSON response: {content[:100]}...")
                    # Return a structure that indicates failure but preserves content
                    return {
                        "results": {"status": "parsed_as_text", "note": "LLM response was not strict JSON"},
                        "interpretation": content,
                        "charts": [],
                        "tables": [],
                        "parsing_error": True
                    }
            else:
                logger.warning(f"Failed to parse JSON response: {content[:100]}...")
                return {
                    "results": {"status": "parsed_as_text", "note": "LLM response was not strict JSON"},
                    "interpretation": content,
                    "charts": [],
                    "tables": [],
                    "parsing_error": True
                }

        # Validate and clean charts
        if 'charts' in parsed and isinstance(parsed['charts'], list):
            parsed['charts'] = LLMClient._validate_charts(parsed['charts'])
        elif 'charts' not in parsed:
            parsed['charts'] = []

        # Validate and clean tables
        if 'tables' in parsed and isinstance(parsed['tables'], list):
            parsed['tables'] = LLMClient._validate_tables(parsed['tables'])
        elif 'tables' not in parsed:
            parsed['tables'] = []

        return parsed

    @staticmethod
    def _validate_charts(charts: list) -> list:
        """Validates chart data structure and filters out invalid charts."""
        valid_charts = []
        for i, chart in enumerate(charts):
            if not isinstance(chart, dict):
                logger.warning(f"Chart {i} is not a dict, skipping")
                continue

            if 'type' not in chart or 'title' not in chart or 'data' not in chart:
                logger.warning(f"Chart {i} missing required fields (type, title, data), skipping")
                continue

            data = chart.get('data', {})
            if not isinstance(data, dict) or 'labels' not in data or 'values' not in data:
                logger.warning(f"Chart {i} data missing labels or values, skipping")
                continue

            labels = data.get('labels', [])
            values = data.get('values', [])

            if not isinstance(labels, list) or not isinstance(values, list):
                logger.warning(f"Chart {i} labels or values are not arrays, skipping")
                continue

            if len(labels) != len(values):
                logger.warning(f"Chart {i} labels length ({len(labels)}) != values length ({len(values)}), skipping")
                continue

            # Ensure all values are numeric
            try:
                numeric_values = [float(v) if not isinstance(v, (int, float)) else v for v in values]
                chart['data']['values'] = numeric_values
            except (ValueError, TypeError) as e:
                logger.warning(f"Chart {i} contains non-numeric values: {e}, skipping")
                continue

            valid_charts.append(chart)

        return valid_charts

    @staticmethod
    def _validate_tables(tables: list) -> list:
        """Validates table data structure and filters out invalid tables."""
        valid_tables = []
        for i, table in enumerate(tables):
            if not isinstance(table, dict):
                logger.warning(f"Table {i} is not a dict, skipping")
                continue

            if 'title' not in table or 'columns' not in table or 'rows' not in table:
                logger.warning(f"Table {i} missing required fields (title, columns, rows), skipping")
                continue

            columns = table.get('columns', [])
            rows = table.get('rows', [])

            if not isinstance(columns, list) or not isinstance(rows, list):
                logger.warning(f"Table {i} columns or rows are not arrays, skipping")
                continue

            # Validate that all rows have the same number of columns
            expected_cols = len(columns)
            for row_idx, row in enumerate(rows):
                if not isinstance(row, list):
                    logger.warning(f"Table {i}, row {row_idx} is not an array, skipping table")
                    break
                if len(row) != expected_cols:
                    logger.warning(f"Table {i}, row {row_idx} has {len(row)} columns, expected {expected_cols}, skipping table")
                    break
            else:
                # All rows are valid
                valid_tables.append(table)

        return valid_tables

    @staticmethod
    def delete_response(path: str):
        if path:
            NetworkFileSaver.delete_response_file(path)
