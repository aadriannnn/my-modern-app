from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from .config import get_settings

settings = get_settings()
engine = create_engine(settings.DATABASE_URL, echo=False)


def init_db():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        if "postgresql" in settings.DATABASE_URL:
            session.exec(text("CREATE EXTENSION IF NOT EXISTS vector;"))

        # Create the SQL function for refreshing simple filters
        refresh_function_sql = text("""
        CREATE OR REPLACE FUNCTION refresh_filtre_cache_simple()
        RETURNS void AS $$
        BEGIN
            DELETE FROM filtre_cache;

            INSERT INTO filtre_cache (tip, valoare)
            SELECT DISTINCT 'tip_speta',
            NULLIF(TRIM(COALESCE(b.obj->>'tip_speta', b.obj->>'tip', b.obj->>'categorie_speta')), '')
            FROM blocuri b WHERE NULLIF(TRIM(COALESCE(b.obj->>'tip_speta', b.obj->>'tip', b.obj->>'categorie_speta')), '') IS NOT NULL;

            INSERT INTO filtre_cache (tip, valoare)
            SELECT DISTINCT 'parte',
            NULLIF(TRIM(COALESCE(b.obj->>'parte', b.obj->>'nume_parte')), '')
            FROM blocuri b WHERE NULLIF(TRIM(COALESCE(b.obj->>'parte', b.obj->>'nume_parte')), '') IS NOT NULL;
        END;
        $$ LANGUAGE plpgsql;
        """)
        session.exec(refresh_function_sql)
        session.commit()


def get_session():
    with Session(engine) as session:
        yield session
