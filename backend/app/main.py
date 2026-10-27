from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine, Base
from app.api import auth

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "=" * 60)
    print("[HomeCare DB] Connecting to PostgreSQL database...")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version();"))
            db_version = result.scalar()
            print(f"[HomeCare DB] SUCCESS: Connected to Neon PostgreSQL!")
            print(f"[HomeCare DB] Version: {db_version}")
            print("[HomeCare DB] Initializing tables (User, PatientProfile, DoctorProfile)...")
            await conn.run_sync(Base.metadata.create_all)
            print("[HomeCare DB] SUCCESS: All tables verified and ready.")
    except Exception as e:
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


@app.get("/")
def root():
    return {
        "message": "HomeCare API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
