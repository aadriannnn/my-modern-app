from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class CaseCreate(BaseModel):
    title: str
    summary: str = ""
    materie: str = ""
    obiect: str = ""

class CaseRead(CaseCreate):
    id: int

class SearchRequest(BaseModel):
    situatie: str
    materie: Optional[List[str]] = Field(default_factory=list)
    obiect: Optional[List[str]] = Field(default_factory=list)
    tip_speta: Optional[List[str]] = Field(default_factory=list)
    parte: Optional[List[str]] = Field(default_factory=list)
    doctrina: bool = False
    offset: Optional[int] = 0
    limit: Optional[int] = 20
    pro_search: bool = False  # Enable Pro Keyword Search (strict diacritics in considerente)

class FilterOptions(BaseModel):
    tip_speta: List[str]
    parte: List[str]
    menu_data: Dict[str, List[str]]

class Equivalent(BaseModel):
    type: str
    term_canonic_original: str
    term_preferat: str

class ContributieCreate(BaseModel):
    denumire: str
    sursa: str

class ModeleRequest(BaseModel):
    """Request schema for fetching relevant document models for a case."""
    materie: Optional[str] = None
    obiect: Optional[str] = None
    keywords: Optional[List[str]] = Field(default_factory=list)
    situatia_de_fapt: Optional[str] = None
    rezumat_ai: Optional[str] = None
    limit: Optional[int] = 10

class ModeleResponse(BaseModel):
    """Response schema for a document model."""
    id: str
    titlu_model: str
    obiect_model: Optional[str] = None
    materie_model: Optional[str] = None
    sursa_model: Optional[str] = None
    relevance_score: float

class CoduriRequest(BaseModel):
    """Request schema for fetching relevant legal articles for a case."""
    materie: Optional[str] = None
    obiect: Optional[str] = None
    keywords: Optional[List[str]] = Field(default_factory=list)
    situatia_de_fapt: Optional[str] = None
    rezumat_ai: Optional[str] = None
    limit: Optional[int] = 10

class CoduriResponse(BaseModel):
    """Response schema for a legal code article."""
    id: str
    numar: str
    titlu: str
    obiect: Optional[str] = None
    materie: Optional[str] = None
    text: str
    keywords: Optional[str] = None
    art_conex: Optional[str] = None
    doctrina: Optional[str] = None
    relevance_score: float
    cod_sursa: str  # e.g., "cod_civil", "cod_penal"


class SpetaLLMExport(BaseModel):
    """Schema for exporting a single case for LLM prompting."""
    id: int
    denumire: str
    situatia_de_fapt: str


class LLMExportResponse(BaseModel):
    """Response schema for LLM data export."""
    success: bool
    message: Optional[str] = None
    query_text: str
    total_spete: int
    spete: List[SpetaLLMExport]
