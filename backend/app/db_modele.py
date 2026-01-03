import logging
from sqlmodel import create_engine, Session

from .config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Connection string for modele_documente database
# This is a separate database on the same server containing legal document templates
MODELE_DB_URL = settings.DATABASE_URL

# Create a separate engine for the modele_documente database
modele_engine = create_engine(MODELE_DB_URL, echo=False)

logger.info(f"Modele database engine created for host: {settings.PG_HOST}:{settings.PG_PORT}")


def get_modele_session():
    """
    Dependency for FastAPI to get database session for modele_documente.
    Use this in route dependencies like: session: Session = Depends(get_modele_session)
    """
    with Session(modele_engine) as session:
        yield session
