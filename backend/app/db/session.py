import asyncio
import os
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool

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

# Serverless instances are frozen between invocations, so a pooled connection
# would sit open and quickly exhaust the database's connection limit.
IS_SERVERLESS = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))

engine_options = {
    "echo": False,
    "future": True,
    "pool_pre_ping": True,
    "connect_args": connect_args,
}
if IS_SERVERLESS:
    engine_options["poolclass"] = NullPool

engine = create_async_engine(db_url, **engine_options)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()

_schema_ready = False
_schema_lock = asyncio.Lock()


async def ensure_schema() -> None:
    """Create missing tables and top up missing columns, once per process.

    This normally runs from the app lifespan, but serverless platforms do not
    always execute ASGI startup, so it is also triggered by the first
    database-backed request.
    """
    global _schema_ready
    if _schema_ready:
        return

    async with _schema_lock:
        if _schema_ready:
            return

        # Import the models so every table is registered with the metadata
        from app.db.migrate import apply_pending_columns
        from app.models import domain as _domain  # noqa: F401
        from app.models import user as _user  # noqa: F401

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            await apply_pending_columns(conn)

        _schema_ready = True


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    await ensure_schema()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
