import logging
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from .config import get_settings
from .models import Blocuri

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Determine which database URL to use
db_url = settings.DATABASE_URL_INTERNAL if settings.DATABASE_URL_INTERNAL else settings.DATABASE_URL

# Log the database URL to verify it's correct
logger.info(f"Using database URL: {db_url}")

engine = create_engine(db_url, echo=False)


def init_db():
    logger.info("--- Database Initialization Started ---")

    is_postgres = "postgresql" in settings.DATABASE_URL
    logger.info(f"PostgreSQL detected: {is_postgres}")

    if not is_postgres and 'vector' in Blocuri.model_fields:
        logger.warning("SQLite detected, removing 'vector' field from Blocuri model for this session.")
        Blocuri.model_fields.pop('vector')
        Blocuri.model_rebuild(force=True)

    logger.info("Creating all tables from SQLModel metadata...")
    SQLModel.metadata.create_all(engine)
    logger.info("All tables created.")

    with Session(engine) as session:
        if engine.url.drivername == "postgresql":
            logger.info("Ensuring 'vector' extension exists for PostgreSQL...")
            session.exec(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            logger.info("'vector' extension checked/created.")

            logger.info("Creating/updating PostgreSQL function 'refresh_filtre_cache_simple'...")
            refresh_function_sql = text("""
            CREATE OR REPLACE FUNCTION refresh_filtre_cache_simple()
            RETURNS void AS $$
            BEGIN
                DELETE FROM filtre_cache;
                INSERT INTO filtre_cache (tip, valoare)
                SELECT DISTINCT 'tip_speta', NULLIF(TRIM(COALESCE(b.obj->>'tip_speta', b.obj->>'tip', b.obj->>'categorie_speta')), '')
                FROM blocuri b WHERE NULLIF(TRIM(COALESCE(b.obj->>'tip_speta', b.obj->>'tip', b.obj->>'categorie_speta')), '') IS NOT NULL;
                INSERT INTO filtre_cache (tip, valoare)
                SELECT DISTINCT 'parte', NULLIF(TRIM(COALESCE(b.obj->>'parte', b.obj->>'nume_parte')), '')
                FROM blocuri b WHERE NULLIF(TRIM(COALESCE(b.obj->>'parte', b.obj->>'nume_parte')), '') IS NOT NULL;
            END;
            $$ LANGUAGE plpgsql;
            """)
            session.exec(refresh_function_sql)
            logger.info("PostgreSQL function 'refresh_filtre_cache_simple' is up to date.")

        result = session.execute(text("SELECT COUNT(*) FROM blocuri")).scalar()
        if result == 0:
            logger.info("Blocuri table is empty. Seeding with sample data...")
            if engine.url.drivername == "postgresql":
                session.execute(text(
                    """
                    INSERT INTO blocuri (id, obj, vector) VALUES
                    (1, '{"tip_speta": "Litigiu de muncă", "parte": "Angajator", "materie": "Dreptul muncii", "obiect": "Contestație decizie de concediere"}', NULL),
                    (2, '{"tip_speta": "Civil", "parte": "Reclamant", "materie": "Drept civil", "obiect": "Pretenții"}', NULL)
                    """
                ))
            else:
                session.execute(text(
                    """
                    INSERT INTO blocuri (id, obj) VALUES
                    (1, '{"tip_speta": "Litigiu de muncă", "parte": "Angajator", "materie": "Dreptul muncii", "obiect": "Contestație decizie de concediere"}'),
                    (2, '{"tip_speta": "Civil", "parte": "Reclamant", "materie": "Drept civil", "obiect": "Pretenții"}')
                    """
                ))

        session.commit()


def get_session():
    with Session(engine) as session:
        yield session
