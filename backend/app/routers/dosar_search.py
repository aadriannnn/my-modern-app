"""
API router for court file number search functionality.

Provides endpoint to search cases by court file number through
integration with the Romanian Court Portal.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, text
from ..db import get_session
from ..schemas import DosarSearchRequest, DosarSearchResponse
from ..lib.rejust_client import get_rejust_client
from ..logic.similarity import find_similar_objects_with_materie
import logging
import json

router = APIRouter(prefix="/search-by-dosar", tags=["dosar-search"])
logger = logging.getLogger(__name__)


@router.post("", response_model=DosarSearchResponse)
async def search_by_dosar_number(
    request: DosarSearchRequest,
    session: Session = Depends(get_session)
):
    """
    Search for cases by court file number.

    This endpoint:
    1. Fetches case data from the Romanian Court Portal
    2. Extracts the case object/description
    3. Compares it with all cases in the database (unfiltered)
    4. Returns cases with >80% similarity

    Args:
        request: DosarSearchRequest with numar_dosar field
        session: Database session

    Returns:
        DosarSearchResponse with matching cases or error
    """
    numar_dosar = request.numar_dosar
    logger.info(f"Processing dosar search request for: {numar_dosar}")

    try:
        # Step 1: Fetch case object from portal
        rejust_client = get_rejust_client()
        portal_result = rejust_client.fetch_case_by_number(numar_dosar)

        if not portal_result["success"]:
            logger.warning(f"Portal fetch failed: {portal_result['error']}")
            return DosarSearchResponse(
                success=False,
                obiect_from_portal=None,
                materie_from_portal=None,
                numar_dosar=numar_dosar,
                results=[],
                match_count=0,
                error=portal_result["error"]
            )

        obiect_from_portal = portal_result["obiect"]
        materie_from_portal = portal_result.get("materie")
        logger.info(f"Fetched from portal: obiect='{obiect_from_portal[:100]}...', materie='{materie_from_portal}'")

        # Step 2: Query ALL cases from database (unfiltered)
        # We need to get all cases with their 'obiect' and 'materie' fields for comparison
        query = text("""
            SELECT
                id,
                obj->>'obiect' as obiect,
                obj->>'materie' as materie
            FROM blocuri
            WHERE obj->>'obiect' IS NOT NULL
                AND obj->>'obiect' != ''
        """)

        result = session.execute(query)
        rows = result.fetchall()

        logger.info(f"Retrieved {len(rows)} cases from database for comparison")

        # Step 3: Prepare candidates for similarity matching
        # candidates must be list of (id, obiect, materie)
        candidates = [(row[0], row[1], row[2]) for row in rows]

        # Step 4: Find similar cases (>80% threshold on object similarity)
        similarity_threshold = 80.0
        # Returns list of (id, obiect, similarity, composite_score)
        matches = find_similar_objects_with_materie(
            target_object=obiect_from_portal,
            target_materie=materie_from_portal,
            candidate_objects=candidates,
            threshold=similarity_threshold
        )

        if not matches:
            logger.info(f"No matches found above {similarity_threshold}% threshold")
            return DosarSearchResponse(
                success=True,
                obiect_from_portal=obiect_from_portal,
                materie_from_portal=materie_from_portal,
                numar_dosar=numar_dosar,
                results=[],
                match_count=0,
                similarity_threshold=similarity_threshold,
                metadata={
                    "categorie_caz": portal_result.get("categorie_caz"),
                    "stadiu_procesual": portal_result.get("stadiu_procesual")
                }
            )

        # Step 5: Fetch complete case data for matches
        matching_ids = [match[0] for match in matches]

        # Create a mapping of ID to scores for later use
        # match structure: (id, obiect, similarity, composite_score)
        id_to_scores = {match[0]: {"similarity": match[2], "composite": match[3]} for match in matches}

        # Fetch full case data
        cases_query = text(f"""
            SELECT id, obj
            FROM blocuri
            WHERE id = ANY(:ids)
        """)

        cases_result = session.execute(cases_query, {"ids": matching_ids})
        cases_rows = cases_result.mappings().all()

        # Step 6: Format results in the same structure as search results
        formatted_results = []
        for row in cases_rows:
            case_id = row['id']
            obj_data = row['obj']

            # Parse JSON if it's a string
            if isinstance(obj_data, str):
                try:
                    obj = json.loads(obj_data)
                except json.JSONDecodeError:
                    logger.warning(f"Could not decode JSON for case {case_id}")
                    continue
            else:
                obj = obj_data

            # Get scores for this case
            scores = id_to_scores.get(case_id, {"similarity": 0.0, "composite": 0.0})
            similarity_score = scores["similarity"]
            composite_score = scores["composite"]

            # Build result in same format as search results
            case_result = {
                "id": case_id,
                "denumire": obj.get("denumire", f"Caz #{case_id}"),
                "situatia_de_fapt_full": obj.get('text_situatia_de_fapt') or obj.get('situatia_de_fapt') or "",
                "argumente_instanta": obj.get('argumente_instanta') or "",
                "considerente_speta": obj.get('considerente_speta') or "",
                "text_individualizare": obj.get('text_individualizare') or "",
                "text_doctrina": obj.get('text_doctrina') or "",
                "text_ce_invatam": obj.get('text_ce_invatam') or "",
                "Rezumat_generat_de_AI_Cod": obj.get('Rezumat_generat_de_AI_Cod') or "",
                "solutia": obj.get("solutia", ""),
                "tip_speta": obj.get('tip_speta', "—"),
                "materie": obj.get('materie', "—"),
                "obiect": obj.get('obiect', ""),
                "score": composite_score / 100.0,  # Use composite score for main ranking (0-1)
                "composite_score": composite_score,
                "similarity_percentage": similarity_score,  # Keep original object similarity for display
                "data": obj
            }

            formatted_results.append(case_result)

        # Sort by composite score descending
        formatted_results.sort(key=lambda x: x['composite_score'], reverse=True)

        logger.info(f"Returning {len(formatted_results)} matching cases")

        return DosarSearchResponse(
            success=True,
            obiect_from_portal=obiect_from_portal,
            materie_from_portal=materie_from_portal,
            numar_dosar=numar_dosar,
            results=formatted_results,
            match_count=len(formatted_results),
            similarity_threshold=similarity_threshold,
            metadata={
                "categorie_caz": portal_result.get("categorie_caz"),
                "stadiu_procesual": portal_result.get("stadiu_procesual")
            }
        )

    except ValueError as e:
        # Validation error
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error in dosar search: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Eroare internă la căutarea dosarului: {str(e)}"
        )
