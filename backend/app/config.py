from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    APP_NAME: str = "Modern API"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    DATABASE_URL: str = "sqlite:///./app.db"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings():
    return Settings()
