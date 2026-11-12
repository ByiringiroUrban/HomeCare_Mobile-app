# API Endpoints

<cite>
**Referenced Files in This Document**
- [main.py](file://backend/app/main.py)
- [auth.py](file://backend/app/api/auth.py)
- [config.py](file://backend/app/core/config.py)
- [security.py](file://backend/app/core/security.py)
- [deps.py](file://backend/app/api/deps.py)
- [auth.py (schemas)](file://backend/app/schemas/auth.py)
- [user.py](file://backend/app/models/user.py)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes the FastAPI backend authentication endpoints for the HomeCare application. It covers user registration (patient and doctor), login, OTP verification, password reset, and retrieving the current user profile. It also explains API versioning via settings.API_V1_STR, CORS configuration for mobile and web clients, request/response schemas, authentication requirements, error responses, status codes, and example curl commands.

## Project Structure
The authentication API is implemented under the FastAPI application entry point and an auth router:
- Application entry point configures lifespan, CORS, OpenAPI URL, and includes the auth router with a versioned prefix.
- Auth router defines all authentication-related endpoints.
- Schemas define request and response models.
- Security utilities handle password hashing and JWT creation/verification.
- Dependencies provide authenticated user resolution.

```mermaid
graph TB
Client["Client App"] --> API["FastAPI App<br/>main.py"]
API --> Router["Auth Router<br/>api/auth.py"]
Router --> Schemas["Schemas<br/>schemas/auth.py"]
Router --> Models["Models<br/>models/user.py"]
Router --> Security["Security Utils<br/>core/security.py"]
Router --> Deps["Auth Dependency<br/>api/deps.py"]
API --> Config["Settings<br/>core/config.py"]
```

**Diagram sources**
- [main.py:31-46](file://backend/app/main.py#L31-L46)
- [auth.py:1-21](file://backend/app/api/auth.py#L1-L21)
- [config.py:10-30](file://backend/app/core/config.py#L10-L30)

**Section sources**
- [main.py:31-46](file://backend/app/main.py#L31-L46)
- [config.py:10-30](file://backend/app/core/config.py#L10-L30)

## Core Components
- Authentication endpoints are defined in the auth router and mounted at /api/v1/auth using the API_V1_STR setting.
- Request/response validation uses Pydantic models from schemas/auth.py.
- Password hashing and JWT token generation are provided by core/security.py.
- Protected routes use OAuth2 Bearer tokens resolved via api/deps.py.

Key responsibilities:
- Registration: patient and doctor accounts creation with profile data.
- Login: email or phone-based login returning a JWT.
- OTP verification: demo implementation accepting a 6-digit code or a specific test code.
- Password reset: placeholder endpoint that returns success messages without sending emails.
- Current user: protected route to retrieve the authenticated user’s profile.

**Section sources**
- [auth.py:24-180](file://backend/app/api/auth.py#L24-L180)
- [auth.py (schemas):27-119](file://backend/app/schemas/auth.py#L27-L119)
- [security.py:10-26](file://backend/app/core/security.py#L10-L26)
- [deps.py:12-41](file://backend/app/api/deps.py#L12-L41)

## Architecture Overview
The authentication flow uses JWT-based authorization. Clients obtain a bearer token via login and include it in subsequent requests. The dependency layer decodes and validates the token, loads the user with eager-loaded profiles, and enforces access control.

```mermaid
sequenceDiagram
participant C as "Client"
participant A as "FastAPI App<br/>main.py"
participant R as "Auth Router<br/>api/auth.py"
participant S as "Security<br/>core/security.py"
participant D as "Deps<br/>api/deps.py"
participant DB as "Database"
C->>A : POST /api/v1/auth/login
A->>R : Route handler login()
R->>DB : Query user by identifier
DB-->>R : User record
R->>S : verify_password()
S-->>R : bool
alt Valid credentials
R->>S : create_access_token()
S-->>R : JWT
R-->>C : TokenResponse {access_token, token_type, user}
else Invalid credentials
R-->>C : 401 Unauthorized
end
C->>A : GET /api/v1/auth/me (Authorization : Bearer <token>)
A->>R : Route handler get_me()
R->>D : get_current_user(token)
D->>D : jwt.decode()
D->>DB : Load user with profiles
DB-->>D : User object
D-->>R : User
R-->>C : UserResponse
```

**Diagram sources**
- [auth.py:121-180](file://backend/app/api/auth.py#L121-L180)
- [security.py:18-26](file://backend/app/core/security.py#L18-L26)
- [deps.py:15-41](file://backend/app/api/deps.py#L15-L41)

## Detailed Component Analysis

### API Versioning Strategy
- All API routes are prefixed with settings.API_V1_STR, which defaults to "/api/v1".
- The OpenAPI schema is exposed at "{settings.API_V1_STR}/openapi.json".
- The root path "/" serves a simple health message and docs link.

Example base URLs:
- Base: http://localhost:8000
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json
- Interactive Docs: http://localhost:8000/docs

**Section sources**
- [main.py:31-46](file://backend/app/main.py#L31-L46)
- [config.py:10-16](file://backend/app/core/config.py#L10-L16)

### CORS Configuration
- CORS middleware allows all origins, methods, and headers, and permits credentials.
- This configuration enables both mobile and web clients to call the API during development.

Recommendation: Restrict allow_origins to known domains in production.

**Section sources**
- [main.py:37-44](file://backend/app/main.py#L37-L44)

### Authentication Endpoints

#### Register Patient
- Method: POST
- URL: /api/v1/auth/register/patient
- Authentication: None
- Request body: PatientRegisterRequest
- Response: UserResponse (201 Created)
- Errors:
  - 400 Bad Request if email or phone already exists

Example curl:
curl -X POST http://localhost:8000/api/v1/auth/register/patient \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+250788000000",
    "password": "SecurePass1!",
    "age": 30,
    "gender": "female",
    "residence_address": "Kigali",
    "district": "Kigali City",
    "sector": "Gisozi"
  }'

**Section sources**
- [auth.py:24-65](file://backend/app/api/auth.py#L24-L65)
- [auth.py (schemas):27-36](file://backend/app/schemas/auth.py#L27-L36)
- [auth.py (schemas):97-109](file://backend/app/schemas/auth.py#L97-L109)

#### Register Doctor
- Method: POST
- URL: /api/v1/auth/register/doctor
- Authentication: None
- Request body: DoctorRegisterRequest
- Response: UserResponse (201 Created)
- Errors:
  - 400 Bad Request if email or phone already exists
  - 400 Bad Request if license number already exists

Example curl:
curl -X POST http://localhost:8000/api/v1/auth/register/doctor \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. John Smith",
    "email": "john.smith@example.com",
    "phone": "+250788111111",
    "password": "SecurePass1!",
    "specialty": "Cardiology",
    "license_number": "MED-12345",
    "experience_years": 10,
    "qualifications": ["MBBS", "MD"],
    "coverage_districts": ["Kigali City", "Gasabo"]
  }'

**Section sources**
- [auth.py:68-118](file://backend/app/api/auth.py#L68-L118)
- [auth.py (schemas):39-49](file://backend/app/schemas/auth.py#L39-L49)
- [auth.py (schemas):97-109](file://backend/app/schemas/auth.py#L97-L109)

#### Login
- Method: POST
- URL: /api/v1/auth/login
- Authentication: None
- Request body: LoginRequest (identifier can be email or phone; password required)
- Response: TokenResponse {access_token, token_type, user}
- Errors:
  - 401 Unauthorized if credentials are invalid or account not found

Example curl:
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "jane@example.com",
    "password": "SecurePass1!"
  }'

Notes:
- Demo passwords may be accepted in this implementation. Use strong passwords in production.

**Section sources**
- [auth.py:121-153](file://backend/app/api/auth.py#L121-L153)
- [auth.py (schemas):52-62](file://backend/app/schemas/auth.py#L52-L62)
- [security.py:10-15](file://backend/app/core/security.py#L10-L15)

#### Verify OTP
- Method: POST
- URL: /api/v1/auth/verify-otp
- Authentication: None
- Request body: OtpVerifyRequest {code, user_id (optional)}
- Response: {"verified": true, "message": "..."} on success
- Errors:
  - 400 Bad Request if code is invalid

Example curl:
curl -X POST http://localhost:8000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "user_id": "some-user-id"
  }'

Note: This is a demo implementation. Replace with secure OTP issuance and verification logic in production.

**Section sources**
- [auth.py:156-164](file://backend/app/api/auth.py#L156-L164)
- [auth.py (schemas):112-115](file://backend/app/schemas/auth.py#L112-L115)

#### Reset Password
- Method: POST
- URL: /api/v1/auth/reset-password
- Authentication: None
- Request body: ResetPasswordRequest {email}
- Response: Success message indicating whether email was registered
- Errors: None explicitly raised; returns informational message

Example curl:
curl -X POST http://localhost:8000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com"
  }'

Note: Integrate with an email service provider to send actual reset instructions in production.

**Section sources**
- [auth.py:167-175](file://backend/app/api/auth.py#L167-L175)
- [auth.py (schemas):117-119](file://backend/app/schemas/auth.py#L117-L119)

#### Get Current User
- Method: GET
- URL: /api/v1/auth/me
- Authentication: Required (Bearer token)
- Authorization header: Authorization: Bearer <access_token>
- Response: UserResponse
- Errors:
  - 401 Unauthorized if token is missing, invalid, or user not found

Example curl:
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

**Section sources**
- [auth.py:178-180](file://backend/app/api/auth.py#L178-L180)
- [deps.py:12-41](file://backend/app/api/deps.py#L12-L41)

### Request and Response Schemas

#### PatientRegisterRequest
Fields:
- name: string (required)
- email: string (required)
- phone: string (required)
- password: string (required, min length 6)
- age: integer (optional)
- gender: string (optional)
- residence_address: string (optional)
- district: string (optional)
- sector: string (optional)

#### DoctorRegisterRequest
Fields:
- name: string (required)
- email: string (required)
- phone: string (required)
- password: string (required, min length 6)
- specialty: string (required)
- license_number: string (required)
- experience_years: integer (default 0)
- qualifications: array of strings (default [])
- coverage_districts: array of strings (default [])

#### LoginRequest
Fields:
- identifier: string (required; accepts email or phone)
- password: string (required)
- demo_role: string (optional; legacy support)

#### TokenResponse
Fields:
- access_token: string
- token_type: string (default "bearer")
- user: UserResponse

#### OtpVerifyRequest
Fields:
- code: string (required)
- user_id: string (optional)

#### ResetPasswordRequest
Fields:
- email: string (required)

#### UserResponse
Fields:
- id: string
- name: string
- email: string
- phone: string
- role: enum ("patient", "doctor", "admin")
- avatar_url: string (optional)
- created_at: datetime
- patient_profile: PatientProfileResponse (optional)
- doctor_profile: DoctorProfileResponse (optional)

**Section sources**
- [auth.py (schemas):27-119](file://backend/app/schemas/auth.py#L27-L119)

### Error Responses and Status Codes
Common HTTP status codes:
- 201 Created: Successful registration
- 200 OK: Successful login, OTP verification, password reset, or getting current user
- 400 Bad Request: Validation errors or business rule violations (e.g., duplicate email/phone/license)
- 401 Unauthorized: Invalid credentials or invalid/expired token

Error payload structure:
- FastAPI returns a JSON body with a detail field describing the error.

Examples:
- Duplicate registration: 400 with detail "User with this email or phone already exists."
- Invalid credentials: 401 with detail "Invalid credentials or unregistered account."
- Invalid OTP: 400 with detail "Invalid verification code"
- Missing/invalid token: 401 with detail "Could not validate credentials"

**Section sources**
- [auth.py:31-34](file://backend/app/api/auth.py#L31-L34)
- [auth.py:74-87](file://backend/app/api/auth.py#L74-L87)
- [auth.py:132-146](file://backend/app/api/auth.py#L132-L146)
- [auth.py:161-164](file://backend/app/api/auth.py#L161-L164)
- [deps.py:19-30](file://backend/app/api/deps.py#L19-L30)

### Authentication Requirements
- Public endpoints: register/patient, register/doctor, login, verify-otp, reset-password
- Protected endpoints: me requires a valid Bearer token
- Token format: JWT encoded with HS256 using settings.SECRET_KEY and settings.ALGORITHM
- Token lifetime: configurable via settings.ACCESS_TOKEN_EXPIRE_MINUTES (default 7 days)

How to include the token:
- Header: Authorization: Bearer <access_token>

**Section sources**
- [deps.py:12-41](file://backend/app/api/deps.py#L12-L41)
- [security.py:18-26](file://backend/app/core/security.py#L18-L26)
- [config.py:18-22](file://backend/app/core/config.py#L18-L22)

### Rate Limiting
No explicit rate limiting is configured in the backend. Consider adding middleware or using an API gateway to enforce rate limits per IP or per user.

[No sources needed since this section provides general guidance]

## Dependency Analysis
The following diagram shows how components depend on each other:

```mermaid
graph LR
Main["main.py"] --> Config["core/config.py"]
Main --> AuthRouter["api/auth.py"]
AuthRouter --> Schemas["schemas/auth.py"]
AuthRouter --> Models["models/user.py"]
AuthRouter --> Security["core/security.py"]
AuthRouter --> Deps["api/deps.py"]
Deps --> Config
Deps --> Models
```

**Diagram sources**
- [main.py:31-46](file://backend/app/main.py#L31-L46)
- [auth.py:1-18](file://backend/app/api/auth.py#L1-L18)
- [deps.py:1-10](file://backend/app/api/deps.py#L1-L10)
- [config.py:10-30](file://backend/app/core/config.py#L10-L30)

**Section sources**
- [main.py:31-46](file://backend/app/main.py#L31-L46)
- [auth.py:1-18](file://backend/app/api/auth.py#L1-L18)
- [deps.py:1-10](file://backend/app/api/deps.py#L1-L10)

## Performance Considerations
- Database queries use async SQLAlchemy sessions and eager loading (selectinload) to avoid N+1 issues when returning user profiles.
- Password hashing uses bcrypt via passlib; ensure appropriate hardware resources for hashing operations.
- JWT decoding is lightweight; consider caching user lookups if high concurrency is expected.
- Avoid exposing sensitive fields in responses; UserResponse currently includes basic identity and profile references.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- 401 Unauthorized on protected routes:
  - Ensure Authorization header is present and formatted as "Bearer <token>".
  - Verify token has not expired; adjust ACCESS_TOKEN_EXPIRE_MINUTES if needed.
- 400 Bad Request on registration:
  - Check for duplicate email or phone numbers.
  - For doctors, ensure license_number is unique.
- 401 Unauthorized on login:
  - Confirm identifier matches either email or phone.
  - Validate password against stored hash; demo passwords may work in this environment.
- 400 Bad Request on OTP verification:
  - Ensure code is exactly 6 digits or matches the demo code.
- CORS errors:
  - During development, CORS allows all origins. In production, restrict allow_origins to trusted domains.

**Section sources**
- [deps.py:19-30](file://backend/app/api/deps.py#L19-L30)
- [auth.py:31-34](file://backend/app/api/auth.py#L31-L34)
- [auth.py:74-87](file://backend/app/api/auth.py#L74-L87)
- [auth.py:132-146](file://backend/app/api/auth.py#L132-L146)
- [auth.py:161-164](file://backend/app/api/auth.py#L161-L164)
- [main.py:37-44](file://backend/app/main.py#L37-L44)

## Conclusion
The FastAPI backend exposes a clear set of authentication endpoints under the /api/v1 prefix. Clients can register patients and doctors, log in with email or phone, verify OTPs, request password resets, and access their profile with a Bearer token. CORS is open for development, and API versioning is centralized via settings.API_V1_STR. For production, tighten CORS policies, implement robust OTP handling, integrate email services for password resets, and add rate limiting and security hardening.