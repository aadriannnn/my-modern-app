from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import enum
from datetime import datetime

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


# Dosar Search Schemas
class DosarSearchRequest(BaseModel):
    """Request schema for court file number search."""

    numar_dosar: str = Field(
        ...,
        min_length=3,
        description="Court file number (minimum 3 characters)"
    )

    from pydantic import field_validator

    @field_validator('numar_dosar')
    @classmethod
    def validate_numar_dosar(cls, v: str) -> str:
        """Validate and clean the case number."""
        if not v or len(v.strip()) < 3:
            raise ValueError('Numărul dosarului trebuie să aibă minim 3 caractere')
        return v.strip()


class DosarSearchResponse(BaseModel):
    """Response schema for court file number search."""

    success: bool = Field(..., description="Whether the search was successful")

    obiect_from_portal: Optional[str] = Field(
        None,
        description="The case object fetched from the court portal"
    )

    materie_from_portal: Optional[str] = Field(
        None,
        description="The case matter (materie) fetched from the court portal"
    )

    numar_dosar: str = Field(..., description="The searched case number")

    results: List[Dict] = Field(
        default_factory=list,
        description="List of matching cases from database"
    )

    match_count: int = Field(
        default=0,
        description="Number of matching cases found"
    )

    similarity_threshold: float = Field(
        default=80.0,
        description="Similarity threshold used for matching"
    )

    error: Optional[str] = Field(
        None,
        description="Error message if search failed"
    )

    metadata: Optional[Dict] = Field(
        None,
        description="Additional metadata from portal (category, stage, etc.)"
    )

# =======================
# Auth Schemas
# =======================
class ClientRole(str, enum.Enum): # Defining enum here as well if needed for schemas, or import from models
    BASIC = "basic"
    PRO = "pro"
    ADMIN = "admin"

class LoginRequest(BaseModel):
    email: str
    parola: str

class RegistrationRequest(BaseModel):
    email: str
    parola: str
    numeComplet: str
    termeniAcceptati: bool
    functie: Optional[str] = None
    telefon: Optional[str] = None
    numeFacturare: Optional[str] = None
    adresaFacturare: Optional[str] = None
    cuiFacturare: Optional[str] = None
    user_type: Optional[str] = None

class ClientDataResponse(BaseModel):
    id: str
    email: str
    rol: str
    numeComplet: Optional[str] = None
    functie: Optional[str] = None
    telefon: Optional[str] = None
    puncte_ramase: Optional[int] = 0
    esteContGoogle: bool = False
    dataCreare: datetime

    class Config:
        from_attributes = True


# =======================
# Taxa Timbru Schemas
# =======================

class CapatCerereInput(BaseModel):
    id_intern: str
    Valoare_Obiect: Optional[float] = None
    Valoare_Bun_Imobil: Optional[float] = None
    Numar_Coproprietari_Mostenitori: Optional[int] = None
    Tip_Divort: Optional[str] = None
    Este_Contestatie_Executare_Pe_Fond: Optional[bool] = None
    Valoare_Bunuri_Contestate_Executare: Optional[float] = None
    Valoare_Debit_Urmarit_Executare: Optional[float] = None
    Numar_Pagini: Optional[int] = None
    Numar_Exemplare: Optional[int] = None
    Numar_Inscrise_Supralegalizare: Optional[int] = None
    Numar_Participanti_Recuzati: Optional[int] = None
    Contine_Transfer_Imobiliar: Optional[bool] = None
    Contine_Partaj: Optional[bool] = None
    Numar_Motive_Revizuire: Optional[int] = None
    Numar_Motive_Anulare_Arbitraj: Optional[int] = None
    Este_Nava_Aeronava: Optional[bool] = None
    Este_Ordonanta_UE_Indisponibilizare: Optional[bool] = None
    Valoare_Creanta_Creditor: Optional[float] = None
    Valoare_Afectata_Prin_Act_Fraudulos: Optional[float] = None
    Valoare_Obiect_Subiacent: Optional[float] = None
    Este_Evaluabil: Optional[bool] = None
    Este_Cale_Atac_Doar_Considerente: Optional[bool] = None
    Motive_Recurs_Invocate: Optional[List[str]] = []
    Valoare_Contestata_Recurs: Optional[float] = None

    class Config:
        extra = 'ignore'

class DateGeneraleInput(BaseModel):
    Filtru_Proces_Vechi: bool = False
    Aplica_Scutire: bool = False
    Temei_Scutire_Selectat: Optional[str] = None
    Taxa_Achitata_Prima_Instanta: Optional[float] = None
    Stadiu_Procesual: Optional[str] = None

    class Config:
        extra = 'ignore'

class TaxaTimbruRequest(BaseModel):
    """Request schema for calculating stamp duty."""
    capete_cerere: List[CapatCerereInput]
    date_generale: DateGeneraleInput

class TaxaTimbruResponse(BaseModel):
    """Response schema for stamp duty calculation."""
    taxa_finala: float
    detaliere_calcul: str

class TipCerereTaxaOption(BaseModel):
    """Schema for a tax request type option."""
    id_intern: str
    nume_standard: str
    categorie: str
    articol_referinta: Optional[str] = None
    evaluabil: Optional[bool] = None
    necesita_valoare_obiect: Optional[bool] = None
    campuri_necesare: Optional[List[str]] = []

class SugestieIncadrareLLMRequest(BaseModel):
    obiect_dosar: str
    confirm_deduct_points: Optional[bool] = False

class SugestieIncadrareLLMResponse(BaseModel):
    criminal_classification: Optional[str] = None
    sugested_id_intern: Optional[str] = None
    sugested_nume_standard: Optional[str] = None
    original_input_obiect: str
    llm_raw_suggestion: Optional[str] = None
    error_message: Optional[str] = None

class CategorizationOption(BaseModel):
    id: str
    description: str
