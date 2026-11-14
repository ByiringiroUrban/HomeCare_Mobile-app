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
    # Also print codes to the server log (development only; codes go out by email)
    OTP_LOG_TO_CONSOLE: bool = False

    # SMTP delivery for one-time codes
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_STARTTLS: bool = True
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None
    SMTP_FROM: Optional[str] = None

    # Cloudinary (profile photos and clinical attachments)
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # PawaPay mobile money collections (deposits)
    # "sandbox" uses api.sandbox.pawapay.io, "production" uses api.pawapay.io
    PAWAPAY_ENVIRONMENT: str = "sandbox"
    PAWAPAY_API_TOKEN: Optional[str] = None
    PAWAPAY_BASE_URL: Optional[str] = None  # optional override for tests/proxies

    @property
    def smtp_configured(self) -> bool:
        return bool(self.SMTP_HOST and self.SMTP_USER and self.SMTP_PASS)

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


