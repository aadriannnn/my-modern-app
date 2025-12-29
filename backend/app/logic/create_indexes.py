import logging
from sqlmodel import text
from app.db import engine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_indexes():
    """
    Creates necessary indexes for search optimization.
    """
    logger.info("Starting index creation...")

    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")

        # 1. Ensure extensions exist
        logger.info("Ensuring extensions 'vector' and 'pg_trgm' exist...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm;"))

        # 2. HNSW Index for Vectors
        # Using vector_cosine_ops because we use <=> (cosine distance)
        logger.info("Creating HNSW index on vectori.embedding (this may take a while)...")
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_vectori_embedding_hnsw
                ON vectori USING hnsw (embedding vector_cosine_ops);
            """))
            logger.info("HNSW index created/verified.")
        except Exception as e:
            logger.error(f"Failed to create HNSW index: {e}")

        # 3. GIN Index for JSONB
        logger.info("Creating GIN index on blocuri.obj...")
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_blocuri_obj_gin
                ON blocuri USING gin (obj);
            """))
            logger.info("GIN index created/verified.")
        except Exception as e:
            logger.error(f"Failed to create GIN index: {e}")

    logger.info("Index creation complete.")

if __name__ == "__main__":
    create_indexes()
