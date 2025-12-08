import json
import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PromptManager:
    """Manages loading and formatting of prompts."""

    def __init__(self):
        self.prompts = self._load_prompts()

    def _load_prompts(self) -> Dict[str, str]:
        """Loads prompts from the external JSON configuration file."""
        try:
            # Assumes backend/llm_default.json is relative to the backend root
            # Path calculation: backend/app/lib/analyzer/prompt_manager.py
            # ../../../.. -> backend/

            # Use a safer way to find the root. Assuming typical structure.
            # If we are in app/lib/analyzer, we go up 3 levels to app root? No.
            # backend/app/lib/analyzer -> backend/
            # dirname(__file__) is .../analyzer
            # ../ is .../lib
            # ../ is .../app
            # ../ is .../backend

            current_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.abspath(os.path.join(current_dir, "../../../llm_default.json"))

            if not os.path.exists(config_path):
                logger.error(f"Prompt configuration file not found at {config_path}")
                return {}

            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
                return config.get("prompturi_three_stage", {})
        except Exception as e:
            logger.error(f"Failed to load prompts: {e}")
            return {}

    def build_discovery_prompt(self, user_query: str, feedback: str = "") -> str:
        feedback_section = ""
        if feedback:
            feedback_section = f"""
=================================================================================== ⚠️ FEEDBACK ANTERIOR
Am încercat o strategie anterioară dar a eșuat sau a dat rezultate slabe.
MOTIV: "{feedback}"
Te rog să ajustezi strategia (SQL sau coloane) pentru a rezolva această problemă.
"""

        force_suggestion = ""
        if "embeddings" in user_query.lower() or "vector" in user_query.lower() or "semantic" in user_query.lower():
             force_suggestion = """
⚠️ NOTĂ IMPORTANTĂ: Utilizatorul a menționat termeni legați de 'embeddings', 'vector', sau 'semantic'.
Te rog să iei în considerare serios utilizarea strategiei VECTOR SEARCH (Varianta C) dacă este relevantă.
"""

        template = self.prompts.get("discovery_prompt", "")
        if not template:
            return "EROARE: Prompt discovery_prompt lipsă."

        return template.format(
            user_query=user_query,
            feedback_section=feedback_section + force_suggestion
        )

    def build_chunk_analysis_prompt(self, user_query: str, chunk_data: List[Dict], chunk_index: int, total_chunks: int) -> str:
        data_json = json.dumps(chunk_data, indent=2, ensure_ascii=False)
        template = self.prompts.get("chunk_analysis_prompt", "")
        if not template:
             return "EROARE: Prompt chunk_analysis_prompt lipsă."

        return template.format(
            user_query=user_query,
            data_json=data_json,
            chunk_index=chunk_index,
            total_chunks=total_chunks,
            analyzed_count=len(chunk_data)
        )

    def build_synthesis_prompt(self, user_query: str, aggregated_data: List[Dict], missing_chunks: List[int]) -> str:
        clean_aggregation = []
        for chunk in aggregated_data:
            clean_aggregation.append({
                "chunk_index": chunk.get("chunk_index"),
                "extracted_data": chunk.get("extracted_data"),
                "partial_stats": chunk.get("partial_stats")
            })

        data_json = json.dumps(clean_aggregation, indent=2, ensure_ascii=False)
        template = self.prompts.get("synthesis_prompt", "")
        if not template:
             return "EROARE: Prompt synthesis_prompt lipsă."

        return template.format(
            user_query=user_query,
            data_json=data_json
        )

    def build_task_breakdown_prompt(self, user_query: str) -> str:
        """
        Builds the prompt for automatic task decomposition.
        The LLM will analyze the user's query and break it down into
        multiple legal research tasks.
        """
        template = self.prompts.get("task_breakdown_prompt", "")
        if not template:
            return "EROARE: Prompt task_breakdown_prompt lipsă."

        return template.format(user_query=user_query)

    def build_verification_prompt(self, user_query: str, strategy: Dict[str, Any], preview_data: List[Dict]) -> str:
        data_json = json.dumps(preview_data, indent=2, ensure_ascii=False)
        strategy_json = json.dumps(strategy, indent=2, ensure_ascii=False)

        template = self.prompts.get("verification_prompt", "")
        if not template:
             return "EROARE: Prompt verification_prompt lipsă."

        return template.format(
            user_query=user_query,
            strategy_json=strategy_json,
            data_json=data_json
        )

    def build_final_report_synthesis_prompt(
        self,
        original_query: str,
        aggregated_task_results: List[Dict[str, Any]],
        retry_mode: bool = False,
        previous_error: str = None
    ) -> str:
        """
        Builds the prompt for final report synthesis (Phase 4).
        Aggregates all task results into a professional legal dissertation.

        Args:
            original_query: The original user question
            aggregated_task_results: List of completed task results
            retry_mode: If True, adds enhanced JSON enforcement warnings
            previous_error: Error message from previous attempt

        Returns:
            Formatted prompt string
        """
        # Calculate total unique case IDs from all tasks
        unique_case_ids = set()
        for task in aggregated_task_results:
            case_ids = task.get('referenced_case_ids', [])
            unique_case_ids.update(case_ids)

        total_cases = len(unique_case_ids)
        min_word_count = max(total_cases * 150, 2000)  # Minimum 150 words per case, at least 2000 words

        data_json = json.dumps(aggregated_task_results, indent=2, ensure_ascii=False)
        template = self.prompts.get("final_report_synthesis_prompt", "")

        if not template:
            return "EROARE: Prompt final_report_synthesis_prompt lipsă."

        # Add retry warning if in retry mode
        retry_warning = ""
        if retry_mode and previous_error:
            retry_warning = f"""
🚨🚨🚨 RETRY MODE - EROARE CRITICĂ ÎN ÎNCERCAREA ANTERIOARĂ 🚨🚨🚨
{previous_error}

TREBUIE SĂ GENEREZI JSON PUR. FĂRĂ MARKDOWN. FĂRĂ TEXT NARATIV.
ÎNCEPE RĂSPUNSUL CU {{ ȘI TERMINĂ CU }}
NU FOLOSI markdown code fences precum ```json
==================================================================================

"""

        # Format the prompt with dynamic values
        formatted_prompt = template.format(
            original_user_query=original_query,
            aggregated_task_results=data_json,
            total_cases=total_cases,
            min_word_count=min_word_count
        )

        # Prepend retry warning if needed
        if retry_warning:
            formatted_prompt = retry_warning + formatted_prompt

        return formatted_prompt
