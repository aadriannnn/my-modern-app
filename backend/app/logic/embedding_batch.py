"""
Batch embedding service for GPU-optimized Ollama.
Processes multiple texts simultaneously for better performance.
"""
import httpx
import logging
from typing import List
from ..config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()
OLLAMA_URL = settings.OLLAMA_URL
MODEL_NAME = settings.MODEL_NAME
VECTOR_DIM = settings.VECTOR_DIM


async def embed_texts_batch(texts: List[str], batch_size: int = 10) -> List[list[float]]:
    """
    Generate embeddings for multiple texts in batches.

    Ollama supports batch processing via the /api/embed endpoint by passing
    multiple texts in the "input" array. This is much faster than processing
    texts one-by-one since the GPU can parallelize the computation.

    Args:
        texts: List of text strings to embed
        batch_size: Number of texts to process per batch (default 10)

    Returns:
        List of embedding vectors (one per input text)

    Example:
        >>> texts = ["Text 1", "Text 2", "Text 3"]
        >>> embeddings = await embed_texts_batch(texts)
        >>> len(embeddings)
        3
        >>> len(embeddings[0])
        1536
    """
    if not texts:
        logger.warning("embed_texts_batch called with empty list")
        return []

    results = []

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            # Process in batches to avoid overwhelming the server
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]

                logger.info(f"Processing batch {i//batch_size + 1}: {len(batch)} texts")

                # Ollama's /api/embed supports batch processing via "input" array
                response = await client.post(
                    f"{OLLAMA_URL}/api/embed",
                    json={
                        "model": MODEL_NAME,
                        "input": batch  # Send multiple texts at once
                    }
                )
                response.raise_for_status()

                # Response format: {"embeddings": [[...], [...], ...]}
                batch_embeddings = response.json().get("embeddings", [])

                # Validate we got the right number of embeddings
                if len(batch_embeddings) != len(batch):
                    logger.error(
                        f"Batch size mismatch: sent {len(batch)} texts, "
                        f"received {len(batch_embeddings)} embeddings"
                    )
                    # Fill with zero vectors for missing embeddings
                    while len(batch_embeddings) < len(batch):
                        batch_embeddings.append([0.0] * VECTOR_DIM)

                # Validate dimensions for each embedding
                for idx, emb in enumerate(batch_embeddings):
                    if len(emb) != VECTOR_DIM:
                        logger.error(
                            f"Embedding dimension mismatch at index {idx}: "
                            f"Expected {VECTOR_DIM}, got {len(emb)}"
                        )
                        # Replace with zero vector
                        batch_embeddings[idx] = [0.0] * VECTOR_DIM

                results.extend(batch_embeddings)

    except httpx.HTTPError as e:
        logger.error(f"HTTP error in batch embedding: {e}")
        # Return zero vectors for all texts
        return [[0.0] * VECTOR_DIM for _ in texts]
    except Exception as e:
        logger.error(f"Unexpected error in batch embedding: {e}", exc_info=True)
        # Return zero vectors for all texts
        return [[0.0] * VECTOR_DIM for _ in texts]

    return results


async def embed_text_single(text: str) -> list[float]:
    """
    Generate embedding for a single text (optimized).
    Uses batch function with size 1 for consistency.

    Args:
        text: Text string to embed

    Returns:
        Embedding vector (1536-dimensional)

    Example:
        >>> embedding = await embed_text_single("Test text")
        >>> len(embedding)
        1536
    """
    if not text or not text.strip():
        logger.warning("embed_text_single called with empty string")
        return [0.0] * VECTOR_DIM

    embeddings = await embed_texts_batch([text], batch_size=1)
    return embeddings[0] if embeddings else [0.0] * VECTOR_DIM
