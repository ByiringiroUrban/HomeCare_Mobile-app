---
kind: dependency_management
name: Dual-Language Dependency Management (npm + pip, no lockfiles committed)
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - .npmrc
    - backend/requirements.txt
    - .gitignore
---

## Overview

The repository is a monorepo containing two independent language stacks with separate dependency-management setups:

- **Frontend / client**: Expo/React Native app managed via **npm** (`package.json`, `package-lock.json`).
- **Backend**: FastAPI Python service under `backend/` managed via **pip** (`requirements.txt`).

There is no shared workspace tool (no `pnpm-workspace.yaml`, no `yarn.lock`, no `lerna`, no `turborepo`). Each subproject manages its own dependencies independently.

## Frontend (npm)

### Manifest and versioning
- `package.json` declares runtime dependencies in `dependencies` and tooling in `devDependencies`.
- Version ranges use a mix of tilde (`~`) and caret (`^`) prefixes:
  - Expo ecosystem packages (`expo`, `expo-router`, `expo-constants`, `expo-linking`, `expo-status-bar`, `eslint-config-expo`) use `~` for patch-level pinning within the same major Expo release.
  - Third-party libraries (`@tanstack/react-query`, `lucide-react-native`, `zustand`, `react-native-web`, `eslint`) use `^` for semver-compatible updates.
  - Core React/Native versions are pinned exactly: `react: "19.2.3"`, `react-dom: "19.2.3"`, `react-native: "0.86.3"`, `@types/react: "~19.2.4"`, `typescript: "~6.0.3"`.
- The package is marked `"private": true`, preventing accidental publication to npm.

### Lockfile
- `package-lock.json` is committed to the repo, providing deterministic installs across machines.

### Registry and cache configuration
- `.npmrc` sets a custom local cache path: `cache=D:\npm-cache`. No private registry or auth tokens are configured — all packages resolve from the public npm registry.

### Vendoring
- No vendored third-party code. Dependencies are installed into `node_modules/`, which is gitignored (`node_modules/`, `*/node_modules/` in `.gitignore`).

### Scripts
- Entry points are npm scripts that delegate to `npx expo start` with platform flags (`android`, `ios`, `web`). No build step pins a specific npm/yarn executable.

## Backend (pip)

### Manifest
- `backend/requirements.txt` exists but is **empty** (only a blank line). There is no pinned list of Python dependencies in the repository.
- A virtual environment directory `backend/venv/` exists locally but is gitignored via the root `.gitignore` rules `venv/`, `*/venv/`, `env/`, `*/env/`, `ENV/`, `.venv/`, `*/.venv/`.
- No `pyproject.toml`, `setup.py`, `Pipfile`, or `poetry.lock` is present.

### Consequence
- The backend's Python dependencies are not reproducible from source alone; they must be inferred from the application code or recreated by the developer.

## Cross-cutting conventions

- Per-language separation: Node deps live at the repo root; Python deps live under `backend/`. There is no cross-language dependency resolution.
- Generated/install artifacts are consistently ignored: `node_modules/`, `*/node_modules/`, `venv/`, `*/venv/`, `env/`, `*/env/`, `*.pyc`, `__pycache__/`, `.pytest_cache/`, `.expo/`, `/ios`, `/android`, `dist/`, `web-build/`.
- Secrets and environment files are excluded (`.env`, `.env.*`, `!.env.example`, `backend/.env`), keeping credentials out of the dependency graph.
- No private npm registry or scoped-package authentication is configured in `.npmrc`; no `GOPRIVATE` equivalent exists for Python.
- No automated update tooling (e.g., Dependabot, Renovate) is visible in the repository tree.