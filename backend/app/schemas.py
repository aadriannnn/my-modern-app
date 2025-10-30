from pydantic import BaseModel
from typing import List, Dict

class CaseCreate(BaseModel):
    title: str
    summary: str = ""
    materie: str = ""
    obiect: str = ""

class CaseRead(CaseCreate):
    id: int

class SearchQuery(BaseModel):
    text: str
    filters: Dict[str, List[str]]

class FilterOptions(BaseModel):
    tip_speta: List[str]
    parte: List[str]
    menu_data: Dict[str, List[str]]

class Equivalent(BaseModel):
    type: str
    term_canonic_original: str
    term_preferat: str
