from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from .config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)


def init_db():
    with Session(engine) as session:
        session.exec(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        session.commit()
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
