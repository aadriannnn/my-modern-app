from pydantic import BaseModel


class CaseCreate(BaseModel):
    title: str
    summary: str = ""
    materie: str = ""
    obiect: str = ""


class CaseRead(CaseCreate):
    id: int
