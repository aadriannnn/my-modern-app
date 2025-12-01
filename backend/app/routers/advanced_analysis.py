from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from ..db import get_session
from ..lib.two_round_llm_analyzer import TwoRoundLLMAnalyzer
from ..logic.queue_manager import queue_manager
import logging

router = APIRouter(
    prefix="/advanced-analysis",
    tags=["advanced-analysis"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

class AdvancedAnalysisRequest(BaseModel):
    query: str

@router.post("/")
async def advanced_statistical_analysis(
    request: AdvancedAnalysisRequest,
    session: Session = Depends(get_session)
):
    """
    Endpoint pentru analiză avansată în 2 runde cu LLM.
    """
    try:
        # Pentru moment, rulăm sincron (await) pentru a returna rezultatul direct.
        # În viitor, putem folosi queue_manager pentru job-uri lungi și returna un job_id.
        # Dat fiind că polling-ul poate dura, e mai bine să fie async, dar clientul trebuie să aștepte.
        # Userul a cerut "Worker Python Adaptiv", deci probabil vrea async background processing.
        # Dar în exemplul din prompt, endpointul returna un job_id.

        # Hai să implementăm varianta cu Job Queue dacă queue_manager suportă return values ușor,
        # sau varianta directă async dacă clientul așteaptă.
        # Planul utilizatorului zicea: "Job ID, message: Analiză în 2 runde pusă în coadă."

        # Vom folosi queue_manager.

        async def process_two_round_analysis(payload: dict):
            """Worker asincron pentru analiza în 2 runde."""
            # Notă: Aici avem nevoie de o sesiune nouă, nu cea din request care se închide.
            # queue_manager ar trebui să gestioneze sesiunile sau să le creăm noi.
            # Dar TwoRoundLLMAnalyzer cere session în __init__.

            # Vom crea o sesiune nouă în interiorul worker-ului
            from ..db import engine
            from sqlmodel import Session

            with Session(engine) as worker_session:
                analyzer = TwoRoundLLMAnalyzer(worker_session)
                result = await analyzer.analyze(payload['user_query'])
                return result

        payload = {
            'user_query': request.query
        }

        # Adăugăm în coadă
        # queue_manager.add_to_queue returnează (job_id, position)
        job_id, _ = await queue_manager.add_to_queue(payload, process_two_round_analysis)

        return {
            'success': True,
            'job_id': job_id,
            'message': 'Analiză în 2 runde pusă în coadă. Verificați statusul jobului pentru rezultate.'
        }

    except Exception as e:
        logger.error(f"Eroare endpoint advanced-analysis: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
