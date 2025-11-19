"""
API routes for legal document models (modele acte).
Provides endpoints for finding relevant models and downloading them as PDF.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import Session
import logging

from ..db_modele import get_modele_session
from ..schemas import ModeleRequest, ModeleResponse
from ..logic.modele_matching import get_relevant_modele, get_model_by_id

router = APIRouter(prefix="/modele", tags=["modele"])
logger = logging.getLogger(__name__)


@router.post("/relevant", response_model=list[ModeleResponse])
async def get_relevant_modele_for_case(
    request: ModeleRequest,
    session: Session = Depends(get_modele_session)
):
    """
    Returns a list of relevant document models based on case metadata.

    The matching is done using multiple criteria:
    - Exact match on materie (legal matter)
    - Exact match on obiect (legal object)
    - Keywords overlap
    - Semantic similarity using embeddings
    - Trigram text similarity

    Args:
        request: Case metadata (materie, obiect, keywords, situatia_de_fapt)
        session: Database session for modele_documente

    Returns:
        List of relevant models sorted by relevance score (highest first)
    """
    logger.info(f"Received request for relevant modele: materie='{request.materie}', obiect='{request.obiect}'")

    try:
        # Convert request to dict for processing
        case_data = request.model_dump()

        # Get relevant models
        results = get_relevant_modele(session, case_data, request.limit)

        logger.info(f"Returning {len(results)} relevant modele")
        return results

    except Exception as e:
        logger.error(f"Error getting relevant modele: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching relevant document models."
        )


@router.get("/{model_id}")
async def get_model_details(
    model_id: str,
    session: Session = Depends(get_modele_session)
):
    """
    Retrieves the full details of a document model by its ID.

    Args:
        model_id: The SHA1 hash ID of the model
        session: Database session for modele_documente

    Returns:
        Full model data including text_model
    """
    logger.info(f"Received request for model ID: {model_id}")

    try:
        model = get_model_by_id(session, model_id)

        if not model:
            raise HTTPException(
                status_code=404,
                detail=f"Model with ID {model_id} not found."
            )

        return model

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching model {model_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching the model."
        )


@router.get("/{model_id}/text")
async def get_model_text(
    model_id: str,
    session: Session = Depends(get_modele_session)
):
    """
    Returns just the text content of a document model.
    Useful for preview purposes without downloading the full data.

    Args:
        model_id: The SHA1 hash ID of the model
        session: Database session for modele_documente

    Returns:
        Plain text content of the model
    """
    logger.info(f"Received request for model text: {model_id}")

    try:
        model = get_model_by_id(session, model_id)

        if not model:
            raise HTTPException(
                status_code=404,
                detail=f"Model with ID {model_id} not found."
            )

        # Return as plain text response
        return Response(
            content=model['text_model'],
            media_type="text/plain; charset=utf-8"
        )

    except Exception as e:
        logger.error(f"Error fetching model text {model_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching the model text."
        )


@router.get("/{model_id}/download")
async def download_model_pdf(
    model_id: str,
    session: Session = Depends(get_modele_session)
):
    """
    Downloads a document model as PDF with Romanian diacritics.
    """
    logger.info(f"Received request to download PDF for model: {model_id}")

    try:
        model = get_model_by_id(session, model_id)

        if not model:
            raise HTTPException(
                status_code=404,
                detail=f"Model with ID {model_id} not found."
            )

        # Generate PDF
        from ..lib.pdf_generator import generate_pdf_content
        pdf_content = generate_pdf_content(model)

        # Create filename
        filename = f"{model['titlu_model'][:50].replace(' ', '_')}.pdf"

        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating PDF for {model_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while generating the PDF."
        )
