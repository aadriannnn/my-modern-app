import logging
from sqlmodel import create_engine, Session

logger = logging.getLogger(__name__)

# Connection string for modele_documente database
# This is a separate database on the same server containing legal document templates
MODELE_DB_URL = "postgresql://adrian:j97Oqzri8TMOtXqsSKM7bMZFh6vof9qhUOfW8aJWsSAZ89AICidoScULSeqNsjF8@192.168.1.30:5433/verdict"

# Create a separate engine for the modele_documente database
modele_engine = create_engine(MODELE_DB_URL, echo=False)

logger.info(f"Modele database engine created for host: 192.168.1.30:5433")


def get_modele_session():
    """
    Dependency for FastAPI to get database session for modele_documente.
    Use this in route dependencies like: session: Session = Depends(get_modele_session)
    """
    with Session(modele_engine) as session:
        yield session
