---
kind: configuration_system
name: 'Configuration System: Pydantic Settings + Expo Config'
category: configuration_system
scope:
    - '**'
source_files:
    - backend/app/core/config.py
    - backend/.env
    - backend/.env.example
    - app.json
    - package.json
---

## Overview

The repository is a split project (React Native client + FastAPI backend), and the two sides use different configuration systems:

- **Backend (FastAPI)** — `pydantic-settings` `BaseSettings` with `.env` file loading.
- **Client (Expo/React Native)** — declarative `app.json` plus `package.json`; no runtime env loader in the JS codebase.

---

## Backend Configuration (`backend/app/core/config.py`)

### Loader and model

- Uses `pydantic_settings.BaseSettings` with a single `Settings` class.
- `model_config = SettingsConfigDict(env_file=..., case_sensitive=True, extra="ignore")`:
  - Loads from `<repo-root>/backend/.env` if it exists, otherwise falls back to `.env` in the current working directory.
  - Rejects unknown env vars at parse time (`extra="ignore"`).
  - Env var names are case-sensitive.
- A module-level singleton `settings = Settings()` is instantiated once and imported wherever needed.

### Declared settings (with defaults)

| Setting | Default | Used by |
|---|---|---|
| `PROJECT_NAME` | `"HomeCare API"` | `main.py` (OpenAPI title) |
| `API_V1_STR` | `"/api/v1"` | `main.py`, `deps.py` (router prefix, OAuth2 token URL) |
| `DATABASE_URL` | `"postgresql+asyncpg://postgres:postgres@localhost:5432/homecare"` | `db/session.py` |
| `SECRET_KEY` | `"change-this-super-secret-key-in-production-min-32-chars"` | `core/security.py` (JWT signing) |
| `ALGORITHM` | `"HS256"` | `core/security.py` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60 * 24 * 7` (7 days) | `core/security.py` |

### Consumption pattern

Every consumer imports the singleton directly:

```python
from app.core.config import settings
```

This happens in `app/main.py`, `app/api/deps.py`, `app/core/security.py`, and `app/db/session.py`. There is no DI container or factory — `settings` is a global.

### Environment files

- `backend/.env` — active secrets (Neon PostgreSQL URL, JWT secret, expiry override).
- `backend/.env.example` — minimal example containing only `DATABASE_URL=sqlite+aiosqlite:///./homecare.db` (SQLite for local dev).

The `.env` file is committed to the repo (not ideal for production secrets), while the example file documents the shape of required variables.

### Rules enforced by the implementation

1. All runtime configuration flows through `app.core.config.Settings`; there is no alternate loader path.
2. Unknown environment variables are silently ignored (`extra="ignore"`) rather than raising.
3. The `.env` path is resolved relative to `config.py`'s parent's parent (`BASE_DIR = Path(__file__).resolve().parent.parent.parent`), i.e. the `backend/` root.
4. `DATABASE_URL` is stripped before use (`settings.DATABASE_URL.strip()`) in `db/session.py`.

---

## Client Configuration (`app.json`, `package.json`)

- `app.json` is the Expo config manifest: app name, slug, scheme, version, splash screen, platform-specific options (`ios.supportsTablet`, `android.adaptiveIcon`, `web.favicon`), and plugins (`expo-router`, `expo-status-bar`).
- `package.json` declares dependencies, scripts (`start`, `android`, `ios`, `web` via `npx expo start [--platform]`), and sets `"private": true`.
- No `.env` or runtime env-loading library is used in the client; the JS source does not reference `process.env` or `expo-constants` for configuration values.

---

## Architecture & Conventions Observed

- **Single source of truth per side**: backend uses one `Settings` class; client uses Expo's declarative JSON.
- **Defaults everywhere**: every setting has a hard-coded default in `Settings`, so the app runs out-of-the-box without an `.env` (using SQLite-style defaults on the backend, placeholder JWT key).
- **Secrets are loaded from `.env`**, not from environment variables passed into the process — `env_file=` points explicitly at the file path.
- **No feature flags, no layered config** (e.g. dev/staging/prod overrides); environment switching is done by swapping `.env` contents.
- **No validation beyond Pydantic types** — e.g. `SECRET_KEY` is just a `str`; the default comment says "min-32-chars" but nothing enforces length.