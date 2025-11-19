"""
API routes for legal code articles (coduri).
Provides endpoints for finding relevant articles and retrieving article details.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlmodel import Session
import logging

from ..db_coduri import get_coduri_session
from ..schemas import CoduriRequest, CoduriResponse
from ..logic.coduri_matching import get_relevant_articles, get_article_by_id, get_available_code_tables

router = APIRouter(prefix="/coduri", tags=["coduri"])
logger = logging.getLogger(__name__)


@router.post("/relevant", response_model=list[CoduriResponse])
async def get_relevant_articles_for_case(
    request: CoduriRequest,
    session: Session = Depends(get_coduri_session)
):
    """
    Returns a list of relevant legal code articles based on case metadata.

    The matching is done using multiple criteria:
    - Exact match on materie (legal matter)
    - Exact match on obiect (legal object)
    - Keywords overlap
    - Semantic similarity using embeddings
    - Trigram text similarity

    Args:
        request: Case metadata (materie, obiect, keywords, situatia_de_fapt)
        session: Database session for coduri

    Returns:
        List of relevant articles sorted by relevance score (highest first)
    """
    logger.info(f"Received request for relevant articles: materie='{request.materie}', obiect='{request.obiect}'")

    try:
        # Convert request to dict for processing
        case_data = request.model_dump()

        # Get relevant articles
        results = get_relevant_articles(session, case_data, request.limit)

        logger.info(f"Returning {len(results)} relevant articles")
        return results

    except Exception as e:
        logger.error(f"Error getting relevant articles: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching relevant legal articles."
        )


@router.get("/tables")
async def get_code_tables(
    session: Session = Depends(get_coduri_session)
):
    """
    Returns a list of available legal code tables in the database.
    Useful for debugging and verification.

    Args:
        session: Database session for coduri

    Returns:
        List of table names
    """
    logger.info("Received request for available code tables")

    try:
        tables = get_available_code_tables(session)
        return {"tables": tables, "count": len(tables)}

    except Exception as e:
        logger.error(f"Error getting code tables: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching code tables."
        )


@router.get("/{table_name}/{article_id}")
async def get_article_details(
    table_name: str,
    article_id: str,
    session: Session = Depends(get_coduri_session)
):
    """
    Retrieves the full details of a legal article by its ID from a specific table.

    Args:
        table_name: Name of the code table (e.g., "cod_civil")
        article_id: The SHA1 hash ID of the article
        session: Database session for coduri

    Returns:
        Full article data
    """
    logger.info(f"Received request for article ID: {article_id} from table: {table_name}")

    try:
        article = get_article_by_id(session, article_id, table_name)

        if not article:
            raise HTTPException(
                status_code=404,
                detail=f"Article with ID {article_id} not found in table {table_name}."
            )

        return article

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching article {article_id} from {table_name}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching the article."
        )


@router.get("/{table_name}/{article_id}/text")
async def get_article_text(
    table_name: str,
    article_id: str,
    session: Session = Depends(get_coduri_session)
):
    """
    Returns just the text content of a legal article.
    Useful for preview or copying purposes.

    Args:
        table_name: Name of the code table
        article_id: The SHA1 hash ID of the article
        session: Database session for coduri

    Returns:
        Plain text content of the article
    """
    logger.info(f"Received request for article text: {article_id} from {table_name}")

    try:
        article = get_article_by_id(session, article_id, table_name)

        if not article:
            raise HTTPException(
                status_code=404,
                detail=f"Article with ID {article_id} not found in table {table_name}."
            )

        # Return as plain text response
        return Response(
            content=article['text'],
            media_type="text/plain; charset=utf-8"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching article text {article_id} from {table_name}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching the article text."
        )
