from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector


class Blocuri(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    data: dict = Field(sa_column=Column(JSONB))


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
    menu_data: dict = Field(sa_column=Column(JSONB))
    materii_map: dict = Field(sa_column=Column(JSONB))
    obiecte_map: dict = Field(sa_column=Column(JSONB))


class FiltreEchivalente(SQLModel, table=True):
    __tablename__ = 'filtre_echivalente'
    type: str = Field(primary_key=True)
    term_canonic_original: str = Field(primary_key=True)
    term_preferat: str
