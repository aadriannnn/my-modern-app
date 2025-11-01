from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from pgvector.sqlalchemy import Vector
from .config import get_settings

settings = get_settings()
db_specific_json = JSONB if "postgresql" in settings.DATABASE_URL else JSON


class Blocuri(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    obj: dict = Field(sa_column=Column(db_specific_json))


class Vectori(SQLModel, table=True):
    speta_id: int = Field(foreign_key="blocuri.id", primary_key=True)
    embedding: List[float] = Field(sa_column=Column(Vector(768)))


class FiltreCache(SQLModel, table=True):
    __tablename__ = 'filtre_cache'
    tip: str = Field(primary_key=True)
    valoare: str = Field(primary_key=True)


from datetime import datetime
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
