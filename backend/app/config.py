from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
from pydantic import model_validator
import os

class Settings(BaseSettings):
    APP_NAME: str = "Modern API"
    CORS_ORIGINS: list[str] | str = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174"
    ]

    @model_validator(mode='before')
    @classmethod
    def parse_cors_origins(cls, values):
        """Parse CORS_ORIGINS if provided as comma-separated string"""
        cors = values.get('CORS_ORIGINS')
        if isinstance(cors, str):
            # Split by comma and strip whitespace
            values['CORS_ORIGINS'] = [origin.strip() for origin in cors.split(',') if origin.strip()]
        return values

    # PostgreSQL settings
    PG_HOST: Optional[str] = None
    PG_PORT: Optional[int] = None
    PG_USER: Optional[str] = None
    PG_PASS: Optional[str] = None
    PG_DB: Optional[str] = None
    DATABASE_URL: Optional[str] = None
    DATABASE_URL_INTERNAL: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def build_database_url(cls, values):
        db_url = values.get('DATABASE_URL')
        if db_url:
            return values # Respect DATABASE_URL if it's already set.

        # Only build the URL if all the PG components are present.
        pg_user = values.get('PG_USER')
        pg_pass = values.get('PG_PASS')
        pg_host = values.get('PG_HOST')
        pg_port = values.get('PG_PORT')
        pg_db = values.get('PG_DB')

        if all([pg_user, pg_pass, pg_host, pg_port, pg_db]):
            values['DATABASE_URL'] = f"postgresql://{pg_user}:{pg_pass}@{pg_host}:{pg_port}/{pg_db}"

        return values

    # Ollama settings
    DEFAULT_OLLAMA_HOST: Optional[str] = "192.168.1.30"
    DEFAULT_OLLAMA_PORT: Optional[int] = None
    OLLAMA_URL: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def build_ollama_url(cls, values):
        ollama_url = values.get('OLLAMA_URL')
        if ollama_url:
            return values

        ollama_host = values.get('DEFAULT_OLLAMA_HOST')
        ollama_port = values.get('DEFAULT_OLLAMA_PORT')

        if all([ollama_host, ollama_port]):
            values['OLLAMA_URL'] = f"http://{ollama_host}:{ollama_port}"

        return values

    MODEL_NAME: str = "rjmalagon/gte-qwen2-1.5b-instruct-embed-f16"
    VECTOR_DIM: int = 1536
    ALPHA_SCORE: float = 0.8
    TOP_K: int = 100

    # Settings page authentication
    USER_SETARI: Optional[str] = None
    PASS_SETARI: Optional[str] = None

    class Config:
        # Make .env path absolute relative to this file
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings():
    return Settings()
