from fastapi import APIRouter, Depends
from sqlmodel import Session
from typing import Dict, Any
import datetime
import tempfile
from fastapi.responses import FileResponse
from ..lib.docx_generator import generate_academic_docx
from ..db import get_session

router = APIRouter()

@router.post("/simulate-report")
async def simulate_report() -> Dict[str, Any]:
    """
    Returns a simulated final report structure for testing purposes.
    Mimics the output of two_round_llm_analyzer.synthesize_final_report.
    """
    return _get_simulated_report_data()

import json
from pathlib import Path

def _get_simulated_report_data() -> Dict[str, Any]:
    try:
        # Load from external JSON file for rich content
        current_dir = Path(__file__).parent
        json_path = current_dir / "simulated_report.json"

        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Update timestamp to now
        if "metadata" in data:
            data["metadata"]["generation_timestamp"] = datetime.datetime.now().isoformat()
            data["metadata"]["generation_date"] = datetime.datetime.now().strftime("%d %B %Y")

        return data
    except Exception as e:
        print(f"Error loading simulated report: {e}")
        # Fallback to minimal data if file missing (though we just created it)
        return {
            "success": False,
            "error": f"Failed to load simulation data: {str(e)}"
        }

@router.get("/simulate-docx")
async def simulate_docx(session: Session = Depends(get_session)):
    """
    Generates a real DOCX file from the simulated report data with DATABASE-ENRICHED citations.
    Uses the same enrichment process as production to ensure footnotes display actual case titles.
    """
    try:
        # Get simulated data
        report_data = _get_simulated_report_data()

        # In advanced_analysis, the report object loaded from plan_manager is passed to generate_academic_docx.
        # This report object is a dict.
        # My _get_simulated_report_data returns a Dict which matches the standard structure.

        # Generate .docx in temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp_file:
            temp_path = tmp_file.name

        # Prepare data for docx generator
        # report_data has keys "dissertation", "visual_tasks", etc.
        # generate_academic_docx expects a flat dict with "title", "chapters", "tasks" etc.

        docx_data = report_data.get("dissertation", {}).copy()

        # Map visual_tasks to tasks
        if "visual_tasks" in report_data:
            docx_data["tasks"] = report_data["visual_tasks"]

        # Ensure we have a title if missing
        if "title" not in docx_data:
             docx_data["title"] = "Raport Simulat"

        # --- NEW: Use REAL database enrichment like production ---
        from ..lib.report_utils import enrich_report_with_titles
        import logging
        logger = logging.getLogger(__name__)

        logger.info("Enriching simulated report with REAL case titles from database...")

        # This will:
        # 1. Extract case IDs from docx_data (e.g., from [[CITATION:ID:...]] or [cite: ID] patterns)
        # 2. Query Blocuri table for real titles
        # 3. Replace all IDs with [[CITATION:ID:RealTitle]] format
        docx_data = enrich_report_with_titles(docx_data, session, for_docx=True)

        logger.info("Citation enrichment complete - footnotes will show database titles")
        # -----------------------------------------------------

        # Generate document
        generate_academic_docx(docx_data, temp_path)

        # Return as file download
        return FileResponse(
            temp_path,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename="referat_simulat_dev.docx",
            background=None
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return error as JSON if something fails, though FileResponse is expected
        return {"error": str(e)}
