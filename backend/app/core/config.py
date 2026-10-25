from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "HomeCare API"
    API_V1_STR: str = "/api/v1"
    
    # Neon PostgreSQL database URL
    # Format: postgresql+asyncpg://<user>:<password>@<neon-endpoint>.neon.tech/<dbname>?ssl=require
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/homecare"
    
    # JWT authentication settings
    SECRET_KEY: str = "change-this-super-secret-key-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
