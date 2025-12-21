
import logging
import os
import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Body, status

from app.schemas import (
    TaxaTimbruRequest, TaxaTimbruResponse, TipCerereTaxaOption,
    SugestieIncadrareLLMRequest, SugestieIncadrareLLMResponse, CategorizationOption
)
import app.taxa_timbru_logic as taxa_timbru_logic
import app.taxa_timbru_data as taxa_timbru_data
from app.lib.analyzer.llm_client import LLMClient

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/calculeaza-taxa-timbru",
             response_model=TaxaTimbruResponse,
             tags=["Utilitare", "Taxă Timbru"],
             summary="Calculează taxa judiciară de timbru")
async def calculeaza_taxa_timbru_endpoint(request_data: TaxaTimbruRequest = Body(...)):
    """
    Endpoint pentru calculul taxei de timbru pe baza capetelor de cerere și a datelor generale.
    """
    # logger.info(f"Request calcul taxa timbru received.")
    try:
        taxa_finala, detaliere = await asyncio.to_thread(
            taxa_timbru_logic.main_calcul_taxa,
            request_data.capete_cerere,
            request_data.date_generale
        )
        return TaxaTimbruResponse(taxa_finala=taxa_finala, detaliere_calcul=detaliere)
    except ValueError as e_val_logic:
        logger.error(f"Eroare validare logică taxă: {e_val_logic}")
        raise HTTPException(status_code=400, detail=f"Date invalide pentru calculul taxei: {str(e_val_logic)}")
    except KeyError as e_key_logic:
        logger.error(f"Eroare cheie logică taxă: {e_key_logic}")
        raise HTTPException(status_code=500, detail=f"Eroare internă: Tip cerere taxă necunoscut verificați id_intern.")
    except Exception as e_calc:
        logger.exception(f"Eroare calcul taxă: {e_calc}")
        raise HTTPException(status_code=500, detail=f"Eroare internă server la calculul taxei: {str(e_calc)}")


@router.get("/tipuri-cereri-taxa",
            response_model=List[TipCerereTaxaOption],
            tags=["Utilitare", "Taxă Timbru"],
            summary="Returnează lista tipurilor de cereri pentru calculul taxei")
async def get_tipuri_cereri_taxa_endpoint():
    """
    Returnează opțiunile disponibile pentru tipurile de cereri (folosit în UI pentru dropdown).
    """
    try:
        options = await asyncio.to_thread(taxa_timbru_logic.get_tipuri_cereri_taxa)
        return options
    except Exception as e:
        logger.exception(f"Eroare la obținerea tipurilor de cereri taxă: {e}")
        raise HTTPException(status_code=500, detail="Eroare internă server la încărcarea tipurilor de cereri.")


@router.post("/sugereaza-incadrare-obiect-llm",
             response_model=SugestieIncadrareLLMResponse,
             tags=["Taxa Timbru"],
             summary="Sugerează încadrarea juridică pentru taxa de timbru folosind LLM local")
async def sugereaza_incadrare_obiect_llm(
    request_data: SugestieIncadrareLLMRequest = Body(...)
):
    """
    Folosește LLM-ul local pentru a sugera cel mai potrivit ID de taxare pentru o descriere dată (obiect dosar).
    """
    case_description = request_data.obiect_dosar
    if not case_description or len(case_description.strip()) < 3:
        raise HTTPException(status_code=400, detail="Descrierea obiectului dosarului este prea scurtă.")

    # 1. Get options
    options = taxa_timbru_logic.get_tipuri_cereri_taxa()
    if not options:
         return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            error_message="Nu există opțiuni de categorizare încărcate."
        )

    # 2. Prepare Prompt
    options_text_parts = []
    for opt in options:
        # Use simple description for token efficiency
        desc = f"{opt.nume_standard} ({opt.categorie})"
        options_text_parts.append(f"- ID: {opt.id_intern}, Descriere: \"{desc}\"")

    options_text = "\n".join(options_text_parts)

    system_prompt = f"""Ești un asistent juridic expert în legislația română privind taxele judiciare de timbru (OUG 80/2013).
Sarcina ta este să analizezi obiectul dosarului și să alegi cel mai potrivit ID din lista de mai jos.
Returnează DOAR ID-ul categoriei alese (ex: OUG80_ART3_1_GEN). Dacă nu ești sigur, returnează NEDETERMINAT.

Opțiuni disponibile:
{options_text}"""

    user_prompt = f"""Obiectul dosarului este:
"{case_description}"

Care este ID-ul corect din lista de mai sus? Returnează doar ID-ul."""

    full_prompt = f"{system_prompt}\n\n{user_prompt}"

    # 3. Call Local LLM via LLMClient
    try:
        success, content, _ = await LLMClient.call_llm_local(full_prompt, timeout=60, label="TaxaTimbru Suggestion")

        if not success:
             return SugestieIncadrareLLMResponse(
                original_input_obiect=case_description,
                error_message=f"Eroare la apelul LLM: {content}"
            )

        # 4. Parse Response (Expect raw ID string from local LLM if prompted correctly, or JSON if conditioned)
        # Local LLM response might be chatty, try to extract ID.
        raw_suggestion = content.strip()
        suggested_id = "NEDETERMINAT"

        # Simple extraction logic: check if any valid ID is present in the response
        valid_ids = {opt.id_intern for opt in options}

        # Direct match check
        if raw_suggestion in valid_ids:
            suggested_id = raw_suggestion
        else:
            # Search for ID in text
            for vid in valid_ids:
                if vid in raw_suggestion:
                    suggested_id = vid
                    break

        # Find standard name
        suggested_nume_standard = None
        if suggested_id != "NEDETERMINAT":
            for opt in options:
                if opt.id_intern == suggested_id:
                    suggested_nume_standard = opt.nume_standard
                    break

        return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            sugested_id_intern=suggested_id,
            sugested_nume_standard=suggested_nume_standard,
            llm_raw_suggestion=raw_suggestion
        )

    except Exception as e:
        logger.exception("Eroare neasteptata la sugestia LLM taxa timbru")
        return SugestieIncadrareLLMResponse(
            original_input_obiect=case_description,
            error_message=f"Eroare internă server: {str(e)}"
        )
