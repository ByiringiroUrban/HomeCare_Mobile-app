import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"


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

    # One-time codes (account verification & password reset)
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    # Until an SMS/email provider is configured, codes are written to the server log
    OTP_LOG_TO_CONSOLE: bool = True

    # Initial administrator, created automatically at startup when no admin exists
    ADMIN_NAME: Optional[str] = None
    ADMIN_EMAIL: Optional[str] = None
    ADMIN_PHONE: Optional[str] = None
    ADMIN_PASSWORD: Optional[str] = None
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH) if ENV_PATH.exists() else ".env",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()


