from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Modern API"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DATABASE_URL: str = "sqlite:///./app.db"
    OLLAMA_URL: str = "http://localhost:11434"
    MODEL_NAME: str = "sentence-transformers/all-mpnet-base-v2"
    VECTOR_DIM: int = 768
    ALPHA_SCORE: float = 0.5
    TOP_K: int = 10

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()
