# Project Overview

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [architecture.md](file://src/docs/architecture.md)
- [App.tsx](file://App.tsx)
- [welcome.tsx](file://src/app/(auth)/welcome.tsx)
- [patient index.tsx](file://src/app/(patient)/index.tsx)
- [doctor index.tsx](file://src/app/(doctor)/index.tsx)
- [admin index.tsx](file://src/app/(admin)/index.tsx)
- [backend main.py](file://backend/app/main.py)
- [backend config.py](file://backend/app/core/config.py)
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
HomeCare is a mobile-first digital healthcare application designed for residential medical consultations in Rwanda, with Kigali as the default operational context and prices expressed in Rwandan Francs (RWF). The platform connects patients with verified medical specialists who travel to the patient’s home to conduct physical examinations, collect laboratory samples, and securely deliver clinical summaries, electronic prescriptions, and lab results.

The project combines:
- A React Native/Expo frontend targeting iOS, Android, and Web.
- A FastAPI backend with PostgreSQL for authentication, configuration, and API routing.
- A multi-role system supporting patients, doctors, and administrators.

Key product goals include doctor discovery, home visit booking, end-to-end consultation workflows, medical records management, and administrative oversight for compliance, quality assurance, and analytics.

**Section sources**
- [README.md:1-8](file://README.md#L1-L8)
- [architecture.md:1-6](file://src/docs/architecture.md#L1-L6)

## Project Structure
At a high level, the repository separates frontend screens by role, shared UI components, services, stores, types, mock data, and documentation, while the backend provides a FastAPI application entry point, configuration, database session setup, models, schemas, and API routes.

```mermaid
graph TB
subgraph "Frontend"
A["src/app/(auth)<br/>Authentication"]
B["src/app/(patient)<br/>Patient App"]
C["src/app/(doctor)<br/>Doctor App"]
D["src/app/(admin)<br/>Admin Console"]
E["src/components/ui<br/>Shared UI"]
F["src/services/api.ts<br/>Service Layer"]
G["src/stores/authStore.ts<br/>Zustand Auth Store"]
H["src/types/domain.ts<br/>Domain Types"]
end
subgraph "Backend"
I["backend/app/main.py<br/>FastAPI App"]
J["backend/app/core/config.py<br/>Settings & Env"]
K["backend/app/db/session.py<br/>DB Session"]
L["backend/app/models/user.py<br/>User Model"]
M["backend/app/schemas/auth.py<br/>Auth Schemas"]
N["backend/app/api/auth.py<br/>Auth Routes"]
end
A --> F
B --> F
C --> F
D --> F
F --> I
I --> J
I --> K
I --> L
I --> M
I --> N
```

**Diagram sources**
- [package.json:1-36](file://package.json#L1-L36)
- [backend main.py:1-61](file://backend/app/main.py#L1-L61)
- [backend config.py:1-33](file://backend/app/core/config.py#L1-L33)

**Section sources**
- [README.md:117-199](file://README.md#L117-L199)
- [architecture.md:36-68](file://src/docs/architecture.md#L36-L68)

## Core Components
This section outlines the primary user roles and their core responsibilities within HomeCare.

- Patient
  - Onboarding, consent, profile setup, specialist discovery, booking, visit tracking, records access, ratings, and complaints.
- Doctor
  - Credential registration, admin verification gate, availability management, request handling, visit execution, clinical workspace, and result publication.
- Administrator
  - Doctor license verification, platform configuration, complaint resolution, analytics dashboards, and immutable audit logs for health record compliance.

These roles are implemented through dedicated route groups under `src/app/(auth)`, `src/app/(patient)`, `src/app/(doctor)`, and `src/app/(admin)`.

**Section sources**
- [architecture.md:9-33](file://src/docs/architecture.md#L9-L33)
- [README.md:117-199](file://README.md#L117-L199)

## Architecture Overview
The HomeCare architecture follows a clear separation between the mobile/web frontend and the backend API:

- Frontend
  - Built with Expo Router, React Native, TypeScript, Zustand for local state, and TanStack React Query for server-state caching and synchronization.
  - Role-based screens implement domain flows such as doctor search, booking, visit lifecycle, records, and administrative oversight.
- Backend
  - FastAPI application exposing `/api/v1` endpoints.
  - Configuration via Pydantic settings, including database URL, JWT parameters, and API versioning.
  - Database connection and table initialization handled during application lifespan.

```mermaid
graph TB
Client["Mobile/Web Client<br/>React Native + Expo Router"]
Services["Service Layer<br/>api.ts"]
State["Local State<br/>Zustand authStore"]
Cache["Server State Cache<br/>TanStack React Query"]
API["FastAPI Backend<br/>/api/v1"]
Config["Settings & Environment<br/>config.py"]
DB["PostgreSQL<br/>Neon Serverless"]
Client --> Cache
Client --> State
Client --> Services
Services --> API
API --> Config
API --> DB
```

**Diagram sources**
- [package.json:1-36](file://package.json#L1-L36)
- [backend main.py:1-61](file://backend/app/main.py#L1-L61)
- [backend config.py:1-33](file://backend/app/core/config.py#L1-L33)

**Section sources**
- [README.md:1-8](file://README.md#L1-L8)
- [backend main.py:11-46](file://backend/app/main.py#L11-L46)

## Detailed Component Analysis

### Authentication and Onboarding
The authentication flow begins at the welcome screen, which introduces the brand, emergency disclaimer, and quick actions for patient registration, login, and doctor onboarding. OTP verification supports simulated one-time codes for demo purposes.

```mermaid
sequenceDiagram
participant User as "User"
participant Welcome as "Welcome Screen"
participant Login as "Login Screen"
participant OTP as "OTP Verification"
participant Service as "api.ts"
participant Store as "authStore"
User->>Welcome : Open app
Welcome->>Login : Navigate to login
Login->>Service : Submit credentials
Service-->>Login : Return token/user
Login->>OTP : Enter OTP code
OTP->>Service : Verify OTP
Service-->>OTP : Verified
OTP->>Store : Persist session
Store-->>User : Redirect to role-specific dashboard
```

**Diagram sources**
- [welcome.tsx:18-83](file://src/app/(auth)/welcome.tsx#L18-L83)
- [README.md:119-125](file://README.md#L119-L125)

**Section sources**
- [welcome.tsx:1-86](file://src/app/(auth)/welcome.tsx#L1-L86)
- [README.md:119-125](file://README.md#L119-L125)

### Patient Experience
The patient home screen greets the user, shows location context, provides a search bar, displays upcoming visits, lists specialties, and recommends verified specialists. It uses TanStack React Query to fetch visits, specialties, and recommended doctors, and integrates with the service layer for data operations.

```mermaid
flowchart TD
Start(["Patient Home Entry"]) --> LoadVisits["Fetch Visits"]
LoadVisits --> LoadSpecialties["Fetch Specialties"]
LoadSpecialties --> LoadDoctors["Fetch Recommended Doctors"]
LoadDoctors --> RenderDashboard["Render Dashboard"]
RenderDashboard --> UpcomingVisit{"Has Active Visit?"}
UpcomingVisit --> |Yes| ShowVisitCard["Show Visit Card"]
UpcomingVisit --> |No| SkipVisit["Skip Visit Section"]
RenderDashboard --> SearchBar["Open Specialist Search"]
RenderDashboard --> SpecialtyChips["Tap Specialty Chip"]
SpecialtyChips --> FilterSearch["Navigate to Doctors with Filter"]
SearchBar --> FilterSearch
```

**Diagram sources**
- [patient index.tsx:22-50](file://src/app/(patient)/index.tsx#L22-L50)
- [patient index.tsx:51-177](file://src/app/(patient)/index.tsx#L51-L177)

**Section sources**
- [patient index.tsx:1-177](file://src/app/(patient)/index.tsx#L1-L177)
- [README.md:127-137](file://README.md#L127-L137)

### Doctor Experience
The doctor dashboard presents today’s metrics, pending requests, active visits, and an online/offline toggle. It filters visits into pending, active, and completed categories and allows navigation to request management and visit execution.

```mermaid
flowchart TD
Entry(["Doctor Dashboard Entry"]) --> FetchVisits["Fetch Visits"]
FetchVisits --> Classify["Classify Pending / Active / Completed"]
Classify --> Metrics["Display Metrics"]
Classify --> PendingList["Show Pending Requests"]
Classify --> ActiveList["Show Active Visits"]
PendingList --> ReviewRequests["Navigate to Requests"]
ActiveList --> OpenCockpit["Open Visit Cockpit"]
Metrics --> OnlineToggle["Toggle Online/Offline"]
```

**Diagram sources**
- [doctor index.tsx:25-57](file://src/app/(doctor)/index.tsx#L25-L57)
- [doctor index.tsx:58-181](file://src/app/(doctor)/index.tsx#L58-L181)

**Section sources**
- [doctor index.tsx:1-181](file://src/app/(doctor)/index.tsx#L1-L181)
- [README.md:139-146](file://README.md#L139-L146)

### Administrative Console
The admin console provides tabs for metrics, doctor verification, complaints, and audit logs. It supports filtering, status updates, complaint resolution, and resetting demo data. Compliance references include Law No. 058/2021 and RMDC authority.

```mermaid
flowchart TD
AdminEntry(["Admin Console Entry"]) --> Tabs["Select Tab: Metrics / Doctors / Complaints / Audit"]
Tabs --> MetricsTab["Operational Metrics & Platform Config"]
Tabs --> DoctorsTab["Verify / Approve / Suspend Doctors"]
Tabs --> ComplaintsTab["Triage & Resolve Complaints"]
Tabs --> AuditTab["Immutable Access Audit Logs"]
DoctorsTab --> UpdateStatus["Update Verification Status"]
ComplaintsTab --> ResolveComplaint["Mark Complaint Resolved"]
AuditTab --> ViewLogs["View SHA-256 Verified Logs"]
```

**Diagram sources**
- [admin index.tsx:60-121](file://src/app/(admin)/index.tsx#L60-L121)
- [admin index.tsx:339-439](file://src/app/(admin)/index.tsx#L339-L439)
- [admin index.tsx:442-587](file://src/app/(admin)/index.tsx#L442-L587)
- [admin index.tsx:590-735](file://src/app/(admin)/index.tsx#L590-L735)

**Section sources**
- [admin index.tsx:1-121](file://src/app/(admin)/index.tsx#L1-L121)
- [admin index.tsx:339-735](file://src/app/(admin)/index.tsx#L339-L735)
- [README.md:108-114](file://README.md#L108-L114)

## Dependency Analysis
The frontend depends on Expo, React Native, TypeScript, Zustand, and TanStack React Query. The backend depends on FastAPI, Pydantic Settings, SQLAlchemy engine/session, and PostgreSQL.

```mermaid
graph LR
RN["React Native 0.86.3"]
Expo["Expo ~57.0.31"]
Router["expo-router ~57.0.29"]
TS["TypeScript ~6.0.3"]
Zustand["Zustand ^5.0.15"]
Query["@tanstack/react-query ^5.104.5"]
FE["Frontend Dependencies"]
FE --> RN
FE --> Expo
FE --> Router
FE --> TS
FE --> Zustand
FE --> Query
FastAPI["FastAPI"]
Pydantic["Pydantic Settings"]
AsyncPG["asyncpg / SQLAlchemy Engine"]
PG["PostgreSQL"]
BE["Backend Dependencies"]
BE --> FastAPI
BE --> Pydantic
BE --> AsyncPG
BE --> PG
```

**Diagram sources**
- [package.json:1-36](file://package.json#L1-L36)
- [backend main.py:1-10](file://backend/app/main.py#L1-L10)
- [backend config.py:1-33](file://backend/app/core/config.py#L1-L33)

**Section sources**
- [package.json:1-36](file://package.json#L1-L36)
- [backend main.py:1-61](file://backend/app/main.py#L1-L61)
- [backend config.py:1-33](file://backend/app/core/config.py#L1-L33)

## Performance Considerations
- Use TanStack React Query for efficient caching, background refetching, and deduplication of network requests across patient, doctor, and admin screens.
- Keep Zustand stores minimal and focused on local UI state and session persistence; offload heavy data to server state.
- Avoid unnecessary re-renders by memoizing expensive computations and using query keys that reflect data dependencies.
- For large lists (doctors, visits, complaints), implement pagination or virtualization when integrating with real APIs.
- Optimize image assets and avoid loading heavy resources on initial render; lazy-load where appropriate.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and checks:
- Frontend typecheck: Run TypeScript checks to ensure all routes, components, and stores adhere to strict typing.
- Backend environment: Ensure `.env` contains correct database URL, secret key, and algorithm settings.
- Database connectivity: Validate that the FastAPI lifespan initializes tables and connects to PostgreSQL successfully.
- Demo accounts: Use provided credentials and quick-fill helpers to validate role-based flows quickly.
- Health check: Confirm the backend health endpoint returns a successful status.

**Section sources**
- [README.md:76-84](file://README.md#L76-L84)
- [README.md:89-107](file://README.md#L89-L107)
- [backend main.py:11-28](file://backend/app/main.py#L11-L28)
- [backend config.py:10-30](file://backend/app/core/config.py#L10-L30)

## Conclusion
HomeCare delivers a comprehensive, mobile-first platform for residential medical consultations in Rwanda. Its architecture cleanly separates role-based frontends from a FastAPI backend, enabling robust doctor discovery, home visit booking, consultation workflows, medical records management, and administrative oversight. With Expo SDK and React Native targeting iOS, Android, and Web, and a backend configured for Neon PostgreSQL, the project is positioned for scalable deployment and regulatory alignment with Rwandan health data requirements.

[No sources needed since this section summarizes without analyzing specific files]