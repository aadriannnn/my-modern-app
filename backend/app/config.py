from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import model_validator


class Settings(BaseSettings):
    APP_NAME: str = "Modern API"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5178"]

    # PostgreSQL settings
    PG_HOST: str
    PG_PORT: int
    PG_USER: str
    PG_PASS: str
    PG_DB: str
    DATABASE_URL: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def build_database_url(cls, values):
        if not values.get('DATABASE_URL'):
            values['DATABASE_URL'] = "postgresql://{PG_USER}:{PG_PASS}@{PG_HOST}:{PG_PORT}/{PG_DB}".format(
                PG_USER=values.get('PG_USER'),
                PG_PASS=values.get('PG_PASS'),
                PG_HOST=values.get('PG_HOST'),
                PG_PORT=values.get('PG_PORT'),
                PG_DB=values.get('PG_DB')
            )
        return values

    OLLAMA_URL: str
    MODEL_NAME: str = "nomic-embed-text"
    VECTOR_DIM: int = 768
    ALPHA_SCORE: float = 0.8
    TOP_K: int = 100

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()
