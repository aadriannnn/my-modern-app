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
            return json.loads(cleaned)
        except json.JSONDecodeError:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1:
                try:
                    return json.loads(cleaned[start:end+1])
                except json.JSONDecodeError:
                    pass

            logger.warning(f"Failed to parse JSON response: {content[:100]}...")
            # Return a structure that indicates failure but preserves content
            return {
                "results": {"status": "parsed_as_text", "note": "LLM response was not strict JSON"},
                "interpretation": content,
                "charts": [],
                "parsing_error": True
            }

    @staticmethod
    def delete_response(path: str):
        if path:
            NetworkFileSaver.delete_response_file(path)
