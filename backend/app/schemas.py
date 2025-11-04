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
