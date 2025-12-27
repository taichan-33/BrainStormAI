from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    DATABASE_URL: str = (
        "postgresql://user:password@localhost:5432/brainstorm"  # Default for local dev if not in docker
    )

    class Config:
        env_file = ".env"


settings = Settings()
