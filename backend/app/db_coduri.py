import logging
from sqlmodel import create_engine, Session

logger = logging.getLogger(__name__)

# Connection string for coduri database
# Same database as modele_documente, but querying different tables (cod_civil, cod_penal, etc.)
CODURI_DB_URL = "postgresql://adrian:j97Oqzri8TMOtXqsSKM7bMZFh6vof9qhUOfW8aJWsSAZ89AICidoScULSeqNsjF8@192.168.1.30:5433/verdict"

# Create a separate engine for the coduri database
coduri_engine = create_engine(CODURI_DB_URL, echo=False)

logger.info(f"Coduri database engine created for host: 192.168.1.30:5433")


def get_coduri_session():
    """
    Dependency for FastAPI to get database session for legal codes.
    Use this in route dependencies like: session: Session = Depends(get_coduri_session)
    """
    with Session(coduri_engine) as session:
        yield session
