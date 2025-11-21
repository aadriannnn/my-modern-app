import logging
from sqlmodel import create_engine, Session

from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Connection string for coduri database
# Same database as modele_documente, but querying different tables (cod_civil, cod_penal, etc.)
CODURI_DB_URL = settings.DATABASE_URL

# Create a separate engine for the coduri database
coduri_engine = create_engine(CODURI_DB_URL, echo=False)

logger.info(f"Coduri database engine created for host: {settings.PG_HOST}:{settings.PG_PORT}")


def get_coduri_session():
    """
    Dependency for FastAPI to get database session for legal codes.
    Use this in route dependencies like: session: Session = Depends(get_coduri_session)
    """
    with Session(coduri_engine) as session:
        yield session
