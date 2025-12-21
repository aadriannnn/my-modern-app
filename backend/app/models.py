import uuid
import enum
from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON, ARRAY, String, Enum as SAEnum, Boolean, DateTime
from pgvector.sqlalchemy import Vector
from datetime import datetime
from .config import get_settings

settings = get_settings()
is_postgres = settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL
db_specific_json = JSONB if is_postgres else JSON
# Use JSON for arrays in SQLite as a fallback
db_specific_array = ARRAY(String) if is_postgres else JSON


class ClientRole(str, enum.Enum):
    BASIC = "basic"
    PRO = "pro"
    ADMIN = "admin"

class ClientDB(SQLModel, table=True):
    __tablename__ = "clienti"
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(index=True, unique=True, nullable=False)
    parolaHash: Optional[str] = Field(default=None)
    rol: ClientRole = Field(sa_column=Column(SAEnum(ClientRole), default=ClientRole.BASIC, nullable=False))
    dataCreare: datetime = Field(default_factory=datetime.utcnow)
    ipInregistrare: Optional[str] = None
    termeniAcceptati: bool = Field(default=False)
    lastLogin: Optional[datetime] = None
    numeComplet: Optional[str] = None
    functie: Optional[str] = None
    telefon: Optional[str] = None
    google_id: Optional[str] = Field(default=None, index=True, sa_column_kwargs={"unique": True})
    esteContGoogle: bool = Field(default=False)
    numeFacturare: Optional[str] = None
    adresaFacturare: Optional[str] = None
    cuiFacturare: Optional[str] = None
    nrRegComFacturare: Optional[str] = None
    telefonFacturare: Optional[str] = None
    banca: Optional[str] = None
    contIBAN: Optional[str] = None
    puncte_ramase: Optional[int] = Field(default=0)

    # Stripe Integration Fields (existing)
    stripe_customer_id: Optional[str] = Field(default=None, index=True)
    stripe_subscription_id: Optional[str] = Field(default=None, index=True)
    subscription_status: Optional[str] = None
    pro_status_active_until: Optional[datetime] = None
    user_type: Optional[str] = None

    # Enhanced Subscription Tracking Fields (new)
    subscription_plan_id: Optional[str] = Field(default=None, index=True)  # premium_monthly, premium_semiannual, premium_annual
    subscription_start_date: Optional[datetime] = Field(default=None, index=True)
    subscription_end_date: Optional[datetime] = Field(default=None, index=True)
    subscription_payment_method: Optional[str] = Field(default=None)  # card, manual_grant, etc.
    subscription_amount: Optional[float] = Field(default=None)  # Amount paid
    subscription_currency: Optional[str] = Field(default="RON")  # Currency
    subscription_auto_renew: bool = Field(default=True)  # Auto-renewal status
    subscription_cancelled_at: Optional[datetime] = Field(default=None)  # When cancelled (if applicable)


class Blocuri(SQLModel, table=True):

    id: Optional[int] = Field(default=None, primary_key=True)
    obj: dict = Field(sa_column=Column(db_specific_json))
    vector: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(settings.VECTOR_DIM)))
    # Pre-calculated fields for performance optimization
    modele_speta: Optional[List[Any]] = Field(default=None, sa_column=Column(db_specific_json))
    coduri_speta: Optional[List[Any]] = Field(default=None, sa_column=Column(db_specific_json))


class Vectori(SQLModel, table=True):
    speta_id: int = Field(foreign_key="blocuri.id", primary_key=True)
    embedding: List[float] = Field(sa_column=Column(Vector(1536)))


class FiltreCache(SQLModel, table=True):
    __tablename__ = 'filtre_cache'
    tip: str = Field(primary_key=True)
    valoare: str = Field(primary_key=True)

class FiltreCacheMenu(SQLModel, table=True):
    __tablename__ = 'filtre_cache_menu'
    id: int = Field(primary_key=True)
    menu_data: dict = Field(sa_column=Column(db_specific_json))
    materii_map: dict = Field(sa_column=Column(db_specific_json))
    obiecte_map: dict = Field(sa_column=Column(db_specific_json))
    last_updated: Optional[datetime] = Field(default=None)


class FiltreEchivalente(SQLModel, table=True):
    __tablename__ = 'filtre_echivalente'
    type: str = Field(primary_key=True)
    term_canonic_original: str = Field(primary_key=True)
    term_preferat: str


class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    summary: str = ""
    materie: str = ""
    obiect: str = ""


class Contributii(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    denumire: str
    sursa: str
    file_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ModeleDocumente(SQLModel, table=True):
    """Model for legal document templates from the modele_documente database."""
    __tablename__ = 'modele_documente'

    id: str = Field(primary_key=True)  # SHA1 hash from titlu_model + text_model
    keywords_model: Optional[List[str]] = Field(default=None, sa_column=Column(JSON))
    titlu_model: str
    text_model: str
    sursa_model: Optional[str] = None
    obiect_model: Optional[str] = None
    materie_model: Optional[str] = None
    comentariiLLM_model: Optional[str] = None
    comentariiLLM_model_embedding: Optional[List[float]] = Field(
        default=None,
        sa_column=Column(Vector(1536))
    )


class UltimaInterogare(SQLModel, table=True):
    """Stores the IDs from the last search query for LLM export."""
    __tablename__ = 'ultima_interogare'

    id: int = Field(primary_key=True, default=1)  # Single row, always id=1
    speta_ids: List[int] = Field(sa_column=Column(JSON))
    query_text: str = Field(default="")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class FeedbackStatistics(SQLModel, table=True):
    """Stores user feedback ratings (good/bad) for answers."""
    __tablename__ = 'feedbackstatistics'

    id: Optional[int] = Field(default=None, primary_key=True)
    feedback_type: str = Field(index=True)  # 'good' or 'bad'
    speta_id: Optional[int] = Field(default=None, index=True)  # Optional: for future analytics
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False, index=True)


class MaterieStatistics(SQLModel, table=True):
    """Tracks how many times each materie has been displayed in search results."""
    __tablename__ = 'materie_statistics'

    materie: str = Field(primary_key=True)  # The materie name (e.g., "Penal", "Civil")
    display_count: int = Field(default=0, index=True)  # Number of times displayed
    last_updated: datetime = Field(default_factory=datetime.utcnow, nullable=False)
