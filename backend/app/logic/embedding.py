import httpx
from ..config import get_settings

settings = get_settings()
OLLAMA_URL = settings.OLLAMA_URL
MODEL_NAME = settings.MODEL_NAME
VECTOR_DIM = settings.VECTOR_DIM


async def embed_text(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{OLLAMA_URL}/api/embed",
            json={"model": MODEL_NAME, "input": text},
            timeout=60,
        )
        r.raise_for_status()

    emb = r.json().get("embeddings", [[]])[0]
    if not emb:
        raise RuntimeError("Embedding gol.")
    if len(emb) != VECTOR_DIM:
        raise RuntimeError(f"Dimensiune embedding {len(emb)} ? {VECTOR_DIM}")
    return emb
