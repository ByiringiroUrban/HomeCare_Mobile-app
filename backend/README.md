# HomeCare Python FastAPI Backend with Neon PostgreSQL

Production-ready backend built with **FastAPI**, **SQLAlchemy (Async)**, and **PostgreSQL** (configured for [Neon.tech Serverless Postgres](https://neon.tech)).

---

## 🚀 Features Implemented (Phase 1: Authentication)

- **Authentication & Authorization**:
  - `POST /api/v1/auth/register/patient`: Patient registration with profile details.
  - `POST /api/v1/auth/register/doctor`: Doctor registration with specialty, license number, and district coverage.
  - `POST /api/v1/auth/login`: Authentication with identifier (email or phone) + password returning JWT Bearer token and user profile.
  - `GET /api/v1/auth/me`: Protected endpoint to fetch currently authenticated user.
  - `POST /api/v1/auth/verify-otp`: Verification endpoint.
  - `POST /api/v1/auth/reset-password`: Dispatch password reset request.
- **Database Support**:
  - Direct compatibility with **Neon Serverless PostgreSQL** via `asyncpg` / `psycopg2-binary`.
  - Automatic table creation on startup.
- **Interactive Documentation**:
  - Swagger UI: `http://localhost:8000/docs`
  - ReDoc: `http://localhost:8000/redoc`

---

## 🛠 Setup & Run Instructions

### 1. Configure Neon PostgreSQL Database

1. Sign up / Log into [Neon Console](https://console.neon.tech).
2. Create a new project named `homecare` or choose an existing one.
3. In your Neon Dashboard, copy the connection string. It will look like:
   ```text
   postgresql://neondb_owner:npg_xxxxxxx@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. In `backend/.env`, set `DATABASE_URL` with `+asyncpg` driver:
   ```env
   DATABASE_URL=postgresql+asyncpg://neondb_owner:npg_xxxxxxx@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb?ssl=require
   SECRET_KEY=your-secure-jwt-secret-key-min-32-chars
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   ```

*(Note: A local SQLite fallback is enabled by default in `.env` for zero-setup instant local testing)*

### 2. Activate Virtual Environment & Start Server

From the project root:

```powershell
# Windows
.\backend\venv\Scripts\Activate.ps1

# Run the dev server
uvicorn app.main:app --reload --app-dir backend --port 8000
```

Or run directly without activating:
```powershell
.\backend\venv\Scripts\python -m uvicorn app.main:app --reload --app-dir backend --port 8000
```

### 3. Open API Documentation
Open your browser and navigate to:
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
