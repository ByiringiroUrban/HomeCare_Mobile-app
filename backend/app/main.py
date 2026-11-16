from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, ensure_schema
from app.api import auth, payments

from sqlalchemy import text


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "=" * 60)
    print("[HomeCare DB] Connecting to PostgreSQL database...")
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            db_version = result.scalar()
            print("[HomeCare DB] SUCCESS: Connected to Neon PostgreSQL!")
            print(f"[HomeCare DB] Version: {db_version}")
        await ensure_schema()
        print("[HomeCare DB] SUCCESS: All tables verified and ready.")
    except Exception as e:
        # Never block startup: the first request retries via ensure_schema()
        print(f"[HomeCare DB] ERROR connecting to database: {e}")
    print("=" * 60 + "\n")
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS setup for mobile and web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(payments.router, prefix=f"{settings.API_V1_STR}/payments", tags=["payments"])


@app.get("/")
def root():
    return {
        "message": "HomeCare API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "ok", "environment": settings.PAWAPAY_ENVIRONMENT}
