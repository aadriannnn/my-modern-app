from typing import Optional
from sqlmodel import SQLModel, Field


class Case(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    summary: str = ""
    materie: str = ""
    obiect: str = ""
