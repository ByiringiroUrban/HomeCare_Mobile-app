---
kind: build_system
name: Build System — Expo/React Native Client + FastAPI Backend
category: build_system
scope:
    - '**'
source_files:
    - package.json
    - app.json
    - tsconfig.json
    - backend/app/main.py
    - backend/requirements.txt
---

## What system/approach is used

The repository has two independent build surfaces with no shared orchestration:

1. **Client (Expo/React Native)** — built via the Expo CLI and `package.json` scripts. The entry point is `expo-router/entry` (`main` field in `package.json`), with `App.tsx` as the app root and routing defined under `src/app/` using Expo Router's file-based convention.
2. **Backend (FastAPI, Python)** — a standalone FastAPI application under `backend/app/main.py`, run directly via the Python interpreter; there is no containerization or process manager.

There is **no CI pipeline**, **no Dockerfile**, **no Makefile**, **no shell build scripts**, and **no `.github/`** directory. Artifacts are produced locally through Expo tooling only.

## Key files and packages

- `package.json` — declares dependencies (`expo ~57.0.31`, `expo-router ~57.0.29`, `react-native 0.86.3`, `react 19.2.3`, `zustand`, `@tanstack/react-query`) and defines the four dev/build scripts: `start`, `android`, `ios`, `web`. All three platform targets use `npx expo start --<platform>` rather than pre-bundling artifacts.
- `app.json` — Expo config for name/slug/scheme/version, splash screen, adaptive icons, and enabled plugins (`expo-router`, `expo-status-bar`). Version is pinned here to `1.0.0`.
- `tsconfig.json` — TypeScript configuration for the client.
- `backend/app/main.py` — FastAPI application entrypoint.
- `backend/requirements.txt` — present but empty; backend dependencies are not declared in a manifest.
- `backend/.env.example` / `backend/.env` — environment configuration for the backend.
- `backend/migrate_db.py`, `backend/seed_db.py`, `backend/verify_auth.py` — ad-hoc maintenance scripts run directly with Python.

## Architecture and conventions

- **Monorepo layout without a build orchestrator**: the client lives at the repo root and the backend lives in `backend/`; they are developed and started independently.
- **Expo development workflow**: developers run `npm start` (or `npm run android` / `npm run ios` / `npm run web`) which invokes `npx expo start --<platform>`. There are no separate `build` or `eject` scripts — builds are delegated to Expo CLI at runtime.
- **Versioning**: both `package.json` and `app.json` hardcode version `1.0.0`. There is no automated version bumping script or release flow.
- **Backend deployment model**: the FastAPI app is intended to be run directly from source (e.g., `uvicorn backend.app.main:app` or similar); there is no WSGI/ASGI server wrapper, no systemd unit, no Docker image, and no requirements pinning.
- **No cross-compilation or artifact publishing**: nothing in the repo produces signed APKs/IPAs, publishes to EAS, or uploads artifacts to an app store. The `temp-export/` directory appears to be a leftover Expo web export.

## Conventions and constraints

Observed conventions (descriptive):
- Platform-specific entry points are invoked through `npx expo start --<platform>` in all `package.json` scripts.
- Expo Router file-based routes live under `src/app/` with route groups `(auth)`, `(doctor)`, `(patient)`, `(admin)`.
- App metadata (name, slug, scheme, version, splash, icons) is centralized in `app.json`.
- Backend code follows a small package layout (`app/api`, `app/core`, `app/db`, `app/models`, `app/schemas`, `app/main`).

Constraints enforced by the codebase:
- The client requires Node/npm because `package.json` is the sole dependency and script surface; running the app depends on `expo` being available via `npx`.
- The backend has no installed dependency lockfile — `backend/requirements.txt` is empty — so its dependency graph is not reproducible from the repo alone.

Notably absent: no `Dockerfile`, no `docker-compose.yml`, no `Makefile`, no CI configuration (`.github/workflows`, `.gitlab-ci.yml`, etc.), no build/release shell scripts, and no EAS Build or Fastlane configuration. The build system is therefore purely local and manual.