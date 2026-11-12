---
kind: error_handling
name: Error Handling in HomeCare Mobile App (React Native + FastAPI Backend)
category: error_handling
scope:
    - '**'
source_files:
    - src/services/api.ts
    - src/stores/authStore.ts
    - backend/app/api/auth.py
    - backend/app/api/deps.py
    - backend/app/main.py
    - src/mock/mockDomainStore.ts
---

## Overview

The repository is split into two layers with distinct error-handling approaches:

- **Client (Expo/React Native, TypeScript)** — no custom error class hierarchy; errors are thrown as plain `new Error(...)` strings and caught locally by services or Zustand stores.
- **Backend (FastAPI, Python)** — uses FastAPI's built-in `HTTPException` with explicit `status_code` + `detail` payloads; a reusable `credentials_exception` sentinel is defined in `app/api/deps.py`.

There is no centralized error-reporting SDK, no Sentry integration, and no global middleware that transforms exceptions into a unified response shape beyond FastAPI's default behavior.

---

## Client-Side Error Handling (`src/services/api.ts`)

### Pattern: try/catch around `fetch`, fallback to mock store

Every network call in `authService` wraps its `fetch` in a `try { ... } catch { /* Fallback */ }` block that silently swallows transport failures and falls back to the in-memory `mockDomainStore`. This is intentional — see comments like `// Graceful fallback to mock store if offline or direct testing` (line 90) and `// Fallback` (line 118).

### Error propagation from backend to client

When the backend returns a non-2xx response, `registerPatient` reads `res.json().catch(() => ({}))` and re-throws `errJson.detail` as a new `Error` (line 164–165). The outer `catch` then filters out raw `fetch` errors via `if (e.message && !e.message.includes('fetch')) throw e;` (line 168), allowing only domain-level errors to escape.

### Domain-layer validation throws string-based `Error`

Business-rule violations inside service methods throw plain `Error` instances with human-readable messages, e.g.:

- `'Doctor not found'` (line 328)
- `'Visit not found'` (lines 355, 362, 387)
- `'Unauthorized'` (lines 363, 388)
- `'Cannot cancel visit after doctor has started traveling or arrived.'` (line 365)
- `'Cannot reschedule after doctor has departed.'` (line 375)
- `'Invalid execution status transition to ${status}'` (line 535)
- `'Unverified or suspended doctors cannot accept patient visits.'` (line 512)

These are not typed sentinel values — they are ad-hoc string literals used both for user-facing messaging and for state transitions.

### Store-level error capture (`src/stores/authStore.ts`)

Zustand actions (`loginDemo`, `loginCustom`) wrap calls in `try/catch`, set `{ error: err.message || 'Login failed', isLoading: false }` on the store, and then re-throw the original error so callers can still react programmatically. The store exposes an `error: string | null` field consumed by UI components.

### Mock layer also throws plain `Error`

`src/mock/mockDomainStore.ts` throws `new Error('...')` for missing entities (`'Patient profile not found'`, `'Doctor not found'`, `'Visit request not found'`, `'Sample not found'`) and business-rule conflicts (`'A slot already exists at this date and time.'`, `'This doctor is already reserved...'`).

---

## Backend Error Handling (`backend/app/api/auth.py`)

### Central exception type: `fastapi.HTTPException`

All route handlers raise `HTTPException(status_code=..., detail="...")`. Examples:

- Duplicate email/phone during registration → `HTTP_400_BAD_REQUEST` (lines 31–34, 75–78, 84–87)
- Invalid credentials / unregistered account → `HTTP_401_UNAUTHORIZED` (lines 133–136, 143–146)
- Invalid OTP code → `HTTP_400_BAD_REQUEST` (lines 161–164)

No custom exception classes are defined anywhere in the backend; `HTTPException` is the sole error type.

### Reusable credential exception in `deps.py`

`app/api/deps.py` defines a module-level `credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")` and raises it from `get_current_user` when JWT verification fails (lines 19, 28, 30, 40). This is the closest thing to a sentinel error in the backend.

### Startup error handling in `main.py`

The `lifespan` context manager catches `Exception` during DB connection and table creation, logging the message via `print(f"[HomeCare DB] ERROR connecting to database: {e}")` rather than propagating it. This means a failed DB startup is logged but does not crash the process visibly to the caller of `lifespan`.

---

## Conventions Observed

| Area | Convention | Evidence |
|------|-----------|----------|
| Client domain errors | Throw plain `new Error(message)` with descriptive text | `services/api.ts`, `mock/mockDomainStore.ts` |
| Network errors | Silently swallowed inside service methods to enable mock fallback | `try/catch` blocks around every `fetch` in `authService` |
| Store error state | Catch errors, write `error` string to Zustand store, re-throw | `stores/authStore.ts` lines 52–55, 79–82 |
| Backend errors | Raise `fastapi.HTTPException` with explicit `status_code` + `detail` | `app/api/auth.py` throughout |
| Auth dependency error | Shared `credentials_exception` sentinel raised from `get_current_user` | `app/api/deps.py` line 19 |
| No custom error types | No `class *Error extends Error` in TS; no custom Python exception classes | grep across repo finds none |
| No global error middleware | No Express/FastAPI exception handler registered; relies on framework defaults | `main.py` registers only CORS middleware |
| Startup failures | Logged via `print` inside `lifespan` exception handler | `main.py` lines 24–26 |

### Rules enforced by the codebase

- Backend route handlers do not return arbitrary objects on failure — they raise `HTTPException`, which FastAPI converts to a JSON body containing `detail` and the HTTP status code. The client explicitly reads `errJson.detail` to surface backend messages (line 165 of `api.ts`).
- Frontend service methods never let raw `fetch` exceptions propagate past their own `catch`; only domain-level `Error`s bubble up to the store/UI layer.
- The auth store always resets `isLoading` to `false` in both success and error branches of login actions.