from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON, ARRAY, String
from pgvector.sqlalchemy import Vector
from datetime import datetime
from .config import get_settings

settings = get_settings()
is_postgres = settings.DATABASE_URL and "postgresql" in settings.DATABASE_URL
db_specific_json = JSONB if is_postgres else JSON
# Use JSON for arrays in SQLite as a fallback
db_specific_array = ARRAY(String) if is_postgres else JSON


class Blocuri(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    obj: dict = Field(sa_column=Column(db_specific_json))
    vector: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(settings.VECTOR_DIM)))
    # Pre-calculated fields for performance optimization
    modele_speta: Optional[List[Any]] = Field(default=None, sa_column=Column(db_specific_json))
    coduri_speta: Optional[List[Any]] = Field(default=None, sa_column=Column(db_specific_json))


class Vectori(SQLModel, table=True):
    speta_id: int = Field(foreign_key="blocuri.id", primary_key=True)
    embedding: List[float] = Field(sa_column=Column(Vector(768)))


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
