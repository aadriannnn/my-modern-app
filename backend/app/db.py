import logging
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from .config import get_settings
from .models import Blocuri, MaterieStatistics, FeedbackStatistics, UltimaInterogare, ClientDB, ClientRole

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
    is_postgres = "postgresql" in settings.DATABASE_URL

    # Conditionally remove the 'vector' column for SQLite
    if not is_postgres and 'vector' in Blocuri.model_fields:
        # This is a bit of a hack, but it's the cleanest way to handle this
        # without creating a separate model for SQLite.
        Blocuri.model_fields.pop('vector')
        Blocuri.model_rebuild(force=True)


    # Create all tables including MaterieStatistics, FeedbackStatistics, etc.
    logger.info("Creating all database tables (including materie_statistics)...")
    SQLModel.metadata.create_all(engine)

    # Automatic migration for new columns
    try:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        if inspector.has_table("blocuri"):
            columns = [col['name'] for col in inspector.get_columns('blocuri')]

            with Session(engine) as session:
                # Check and add modele_speta
                if 'modele_speta' not in columns:
                    logger.info("Column 'modele_speta' missing in 'blocuri'. Adding it...")
                    col_type = "JSONB" if is_postgres else "JSON"
                    session.exec(text(f"ALTER TABLE blocuri ADD COLUMN modele_speta {col_type}"))
                    session.commit()
                    logger.info("Column 'modele_speta' added successfully.")

                # Check and add coduri_speta
                if 'coduri_speta' not in columns:
                    logger.info("Column 'coduri_speta' missing in 'blocuri'. Adding it...")
                    col_type = "JSONB" if is_postgres else "JSON"
                    session.exec(text(f"ALTER TABLE blocuri ADD COLUMN coduri_speta {col_type}"))
                    session.commit()
                    logger.info("Column 'coduri_speta' added successfully.")
    except Exception as e:
        logger.error(f"Error during column migration: {e}")

    with Session(engine) as session:
        # Use a more robust check for PostgreSQL
        if engine.url.drivername == "postgresql":
            session.exec(text("CREATE EXTENSION IF NOT EXISTS vector;"))

        # Seed data for testing if the blocuri table is empty
        try:
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
        except Exception as e:
            logger.warning(f"Could not seed data or check count: {e}")



def get_session():
    with Session(engine) as session:
        yield session
