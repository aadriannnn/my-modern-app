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
    async def call_llm(prompt: str, timeout: int = 600, label: str = "LLM Call", filename_suffix: str = "") -> Tuple[bool, str, str]:
        """
        Sends prompt to LLM and waits for response.
        Returns: (success, content, response_path)
        """
        retea_host = settings_manager.get_value('setari_retea', 'retea_host', '')
        retea_folder = settings_manager.get_value('setari_retea', 'retea_folder_partajat', '')

        # Generate unique filename with optional suffix
        filename = NetworkFileSaver.generate_unique_filename(suffix=filename_suffix)

        success, message, saved_path = NetworkFileSaver.save_to_network(
            content=prompt,
            host=retea_host,
            shared_folder=retea_folder,
            subfolder='',
            filename=filename
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
    async def call_llm_local(prompt: str, timeout: int = 180, label: str = "LLM Call") -> Tuple[bool, str, str]:
        """
        Sends prompt to local GPU-accelerated LLM (verdict-ro:latest).
        Alternative to network file sharing for faster responses.

        Returns: (success, content, empty_path)
        """
        import httpx

        logger.info(f"[{label}] Using LOCAL GPU LLM (verdict-ro:latest)")

        try:
            # Get LLM URL from config
            llm_url = settings_manager.get_value('setari_llm', 'llm_url', 'http://192.168.1.30:11434/api/generate')

            # Prepare payload with optimized GPU parameters
            payload = {
                "model": "verdict-line",
                "prompt": prompt,
                "format": "json",
                "stream": False,
                "keep_alive": "5m",       # Unload model after 5 minutes
                "options": {
                    "num_ctx": 8192,         # STRICT LIMIT 8k for VRAM Stability
                    "temperature": 0.1,      # Low temperature for precision
                    "top_p": 0.9,           # Nucleus sampling
                    "top_k": 40,            # Top-k sampling
                    "repeat_penalty": 1.1   # Avoid repetition
                }
            }

            logger.info(f"[{label}] Sending request to {llm_url}...")

            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(llm_url, json=payload)
                response.raise_for_status()
                result = response.json()

                content = result.get("response", "")

                if not content:
                    logger.error(f"[{label}] Empty response from local LLM")
                    return False, "Empty response from local LLM", ""

                logger.info(f"[{label}] ✓ Local LLM response received ({len(content)} chars)")
                return True, content, ""  # No file path for local LLM

        except httpx.HTTPError as e:
            logger.error(f"[{label}] HTTP error calling local LLM: {e}")
            return False, f"HTTP error: {str(e)}", ""
        except Exception as e:
            logger.error(f"[{label}] Error calling local LLM: {e}", exc_info=True)
            return False, f"Error: {str(e)}", ""


    @staticmethod
    def parse_json_response(content: str) -> Dict[str, Any]:
        """Parses JSON response from LLM, cleaning markdown fences and headers."""
        cleaned = content.strip()

        # Remove markdown code fences - more robust patterns
        # Handle cases like: ```json\n{...}\n``` or ```\n{...}\n```
        cleaned = re.sub(r'^```(?:json)?\s*\n?', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'\n?```\s*$', '', cleaned, flags=re.MULTILINE)

        # Remove any remaining backticks at start/end
        cleaned = cleaned.strip('`').strip()

        # Remove separator lines
        cleaned = re.sub(r'^={10,}.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^-{10,}.*$', '', cleaned, flags=re.MULTILINE)
        cleaned = re.sub(r'^🔬 PHASE \d+:.*$', '', cleaned, flags=re.MULTILINE)

        # Remove citation marking tags that invalidate JSON structure
        # These are sometimes output by the LLM (e.g., [cite_start]"key": ...)
        cleaned = cleaned.replace("[cite_start]", "").replace("[cite_end]", "")

        cleaned = cleaned.strip()

        data = None
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    data = json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    pass

        if data is None:
            logger.warning(f"Failed to parse JSON response: {content[:100]}...")
            # Return a structure that indicates failure but preserves content
            return {
                "results": {"status": "parsed_as_text", "note": "LLM response was not strict JSON"},
                "interpretation": content,
                "charts": [],
                "parsing_error": True
            }

        # --- Validation Logic for Charts & Tables ---

        # Validate Charts
        if "charts" in data and isinstance(data["charts"], list):
            valid_charts = []
            for chart in data["charts"]:
                if not isinstance(chart, dict):
                    continue

                # Check required fields
                if not all(k in chart for k in ["type", "title", "data"]):
                    logger.warning(f"Skipping chart missing required fields: {chart.get('title', 'Unknown')}")
                    continue

                chart_data = chart["data"]
                if not isinstance(chart_data, dict):
                    logger.warning(f"Skipping chart with invalid data object: {chart.get('title')}")
                    continue

                if "labels" not in chart_data or "values" not in chart_data:
                    logger.warning(f"Skipping chart missing labels/values: {chart.get('title')}")
                    continue

                labels = chart_data["labels"]
                values = chart_data["values"]

                if not isinstance(labels, list) or not isinstance(values, list):
                     logger.warning(f"Skipping chart with non-list labels/values: {chart.get('title')}")
                     continue

                if len(labels) != len(values):
                    logger.warning(f"Skipping chart with mismatched labels/values length: {chart.get('title')}")
                    continue

                # Ensure values are numeric
                try:
                    numeric_values = []
                    for v in values:
                        if isinstance(v, (int, float)):
                            numeric_values.append(v)
                        elif isinstance(v, str) and v.replace('.','',1).isdigit():
                             numeric_values.append(float(v))
                        else:
                             numeric_values.append(0) # Fallback

                    chart["data"]["values"] = numeric_values
                    valid_charts.append(chart)

                except Exception as e:
                    logger.warning(f"Error processing chart values: {e}")

            data["charts"] = valid_charts

        # Validate Tables
        if "tables" in data and isinstance(data["tables"], list):
            valid_tables = []
            for table in data["tables"]:
                if not isinstance(table, dict):
                    continue

                if not all(k in table for k in ["title", "columns", "rows"]):
                    logger.warning(f"Skipping table missing required fields: {table.get('title', 'Unknown')}")
                    continue

                columns = table["columns"]
                rows = table["rows"]

                if not isinstance(columns, list) or not isinstance(rows, list):
                    continue

                col_count = len(columns)
                valid_rows = []
                for row in rows:
                    if isinstance(row, list) and len(row) == col_count:
                        valid_rows.append(row)
                    else:
                         logger.warning(f"Skipping malformed row in table: {table.get('title')}")

                table["rows"] = valid_rows
                valid_tables.append(table)

            data["tables"] = valid_tables

        return data

    @staticmethod
    def delete_response(path: str):
        if path:
            NetworkFileSaver.delete_response_file(path)
