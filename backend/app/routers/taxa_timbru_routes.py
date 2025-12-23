
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

    # Call Logic Function directly
    try:
        result = await taxa_timbru_logic.suggest_tax_classification(case_description)
        return result
    except Exception as e:
        logger.exception("Eroare neasteptata la sugestia LLM taxa timbru (route)")
        raise HTTPException(status_code=500, detail=f"Eroare internă server: {str(e)}")
