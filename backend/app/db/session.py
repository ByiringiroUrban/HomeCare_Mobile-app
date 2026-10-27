from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Adjust connection URL and args for asyncpg with Neon PostgreSQL
db_url = settings.DATABASE_URL.strip()

# Convert standard postgresql:// or postgres:// to postgresql+asyncpg://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

connect_args = {}
# asyncpg expects ssl mode in connect_args or stripped query params
if "sslmode=require" in db_url or "ssl=require" in db_url or "neon.tech" in db_url:
    # Strip libpq-specific query params that asyncpg does not take in the DSN string
    base_url = db_url.split("?")[0]
    db_url = base_url
    connect_args = {"ssl": True}

engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    pool_pre_ping=True,
    connect_args=connect_args
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
