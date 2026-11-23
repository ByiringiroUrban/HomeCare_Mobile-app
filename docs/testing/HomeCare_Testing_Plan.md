# SOFTWARE TESTING PLAN

**HomeCare — Home Healthcare Mobile Application**

Testing and Execution Procedures | Software Testing Techniques

---

Institution: ______________________________________________

Faculty / Department: ______________________________________________

Course: **Software Testing Techniques**

Lecturer: ______________________________________________

Academic year / semester: ______________________________________________

Student name(s): ______________________________________________

Student ID(s): ______________________________________________

Programme / class: ______________________________________________

Submission date: 24 November 2026

---

## Document control

| Item | Detail |
|---|---|
| Document title | Software Testing Plan — HomeCare Mobile Application |
| Document version | 1.0 (for submission) |
| Prepared by | Student (name to be completed above) |
| Prepared for | Software Testing Techniques — lecturer review |
| Related documents | *Testing and Execution Procedures* (course workbook); HomeCare System Requirements; HomeCare API documentation |
| Plan period | 24 November 2026 – 12 December 2026 |
| Status | Awaiting review and approval before execution begins |

**Revision history**

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 24 Nov 2026 | Student | Initial testing plan prepared for submission |
|  |  |  |  |

---

## 1. Introduction

### 1.1 Purpose of this document

This document is the **test plan** for the HomeCare mobile application and its backend service. It defines what will be tested, how it will be tested, by whom, with which data, in which environment, on which dates, and how results, defects and evidence will be recorded.

The plan is written **before** execution, so that expected results exist before any test is run, as required by the course procedure. It follows the structure of the *Testing and Execution Procedures* workbook and is the basis for the **Final Software Testing Report** that will be produced after execution.

### 1.2 The software under test

HomeCare is a home-healthcare platform with three user roles and a cloud backend:

- **Patient mobile app** — registration with email OTP, login, doctor search and filtering, doctor profiles and availability, home-visit booking, live visit status tracking, consultation records and prescriptions, laboratory results, notifications, mobile-money payment for visits, profile management.
- **Doctor mobile app** — account registration with professional credentials, online/offline availability, weekly availability slots, incoming visit requests (accept, decline, propose alternative time), visit execution states (on the way, arrived, in consultation, completed), consultation publication (notes, diagnosis, prescription, lab sample request), patient list.
- **Administrator console** — doctor verification queue, approval/suspension of doctors, platform metrics, platform configuration view.
- **Backend service** — FastAPI REST API (~51 routes), PostgreSQL database, JWT authentication, email OTP delivery, mobile-money payment gateway integration (PawaPay, sandbox), deployed on Vercel.

### 1.3 Architecture overview (relevant to testing)

| Layer | Technology | Test relevance |
|---|---|---|
| Mobile client | React Native + Expo Router (TypeScript), iOS / Android / web build | UI, navigation, form validation, state management |
| API client layer | TypeScript service modules calling the REST API with a bearer token | Request/response mapping, error handling, session handling |
| Backend API | FastAPI (Python 3.12), Pydantic validation, JWT auth | Business rules, authorization, status transitions |
| Database | PostgreSQL (managed, Neon) | Data integrity, constraints, persistence |
| External services | SMTP (email OTP), PawaPay sandbox (mobile money) | Integration, failure handling, callbacks |
| Hosting | Vercel (serverless), local Uvicorn for testing | Deployment configuration, cold start, environment variables |

### 1.4 System under test identification

| Item | Value |
|---|---|
| Product name | HomeCare |
| Application version / build | Build identifier to be recorded at execution time (git commit + `app.json` version) |
| Initial build for execution | `main` branch build tagged **HC-TEST-1.0** at the start of Phase 2 |
| Repository components | `src/` (mobile app), `backend/` (API), `backend/tests/` (automated checks) |

---

## 2. Testing objectives

The objectives below define what this test effort must establish.

1. **O1 — Verify functional correctness.** Confirm that each functional requirement (Section 5) behaves as specified for valid, invalid, boundary and exceptional inputs.
2. **O2 — Verify the doctor lifecycle.** Prove that a doctor who registers is placed in the verification queue, cannot log in or be booked before verification, becomes visible to patients after administrator approval, can publish availability, and can carry a visit through to a published consultation.
3. **O3 — Verify integration between components.** Confirm the mobile client, API, database, email service and payment gateway exchange data correctly, including authentication context and error propagation.
4. **O4 — Verify authorization and data protection.** Confirm that each role can only reach its own data and actions, and that unauthenticated or cross-role requests are refused.
5. **O5 — Verify end-to-end clinical and payment workflows.** Confirm that a complete patient journey (search → book → pay → consult → record) and the corresponding doctor journey complete successfully on a single integrated build.
6. **O6 — Verify that defects found during development remain fixed.** Re-run the automated lifecycle checks and the defect-specific retests (Section 15).
7. **O7 — Produce credible evidence.** Record every result with reproducible steps, expected vs actual behaviour, and labelled evidence that can be audited by the lecturer.

**Explicit non-objective:** this plan does not attempt to prove the software is defect-free. Testing provides evidence of quality; it cannot establish absence of defects.

---

## 3. Scope

### 3.1 In scope

| Area | Included |
|---|---|
| Authentication & accounts | Patient registration, doctor registration, email OTP verification, login, logout, session expiry, forgot/reset password |
| Doctor management | Verification queue, approval, suspension, directory listing, specialty and district filtering, doctor profile detail |
| Availability | Slot creation, listing, deletion, online/offline toggle, slot booking state |
| Visits | Booking, fee calculation, request receipt, accept, decline, alternative proposal, execution status transitions, cancellation rules |
| Consultation | Notes, diagnosis, prescription items, lab sample request, publication, patient visibility |
| Patient records | Visit history, published consultation records, laboratory results |
| Payments | Initiation, provider redirect/USSD flow, callback handling, success/failure states, duplicate callback behaviour, amount consistency |
| Notifications | Creation on visit events, listing, read state |
| Administration | Metrics endpoint, doctor verification actions, access control |
| Non-functional (selected) | Usability of key flows, response-time targets for defined API calls, transport security, input validation, compatibility on Android/iOS/web build, recovery after failed requests |
| Regression | Automated lifecycle suite and all defect retests after each fix |

### 3.2 Out of scope and reasons

| Excluded | Reason |
|---|---|
| Penetration testing, load/stress testing at production scale | No dedicated security or performance laboratory; would require authorisation and tooling beyond the course scope |
| Real money transactions with live mobile-money accounts | Only the provider **sandbox** is authorised; live funds must not be used |
| Third-party provider internals (PawaPay, SMTP servers, Neon) | External systems; only their integration behaviour is tested |
| App store packaging, signing, release management | Not part of the implemented scope; the build is delivered through Expo |
| Native iOS device testing | No physical iOS device available; iOS behaviour is covered by Expo Go/web build and reported as a limitation |
| Accessibility conformance audit (WCAG certification) | Only basic usability and legibility checks are performed; formal audit is out of scope |
| Localization completeness beyond the implemented languages | Only the languages shipped in the build are checked |
| Load testing beyond 10 concurrent virtual users | Test environment cannot represent production workload credibly |

### 3.3 Assumptions

1. A test build can be produced from the repository at any time and installed on the test devices.
2. The managed PostgreSQL instance and the Vercel deployment remain available during the test window.
3. The PawaPay **sandbox** credentials remain valid for the test period.
4. Test accounts and test doctors may be created and deleted freely in the test database.
5. Email OTP delivery works through the configured SMTP account.

### 3.4 Constraints

1. Single tester: all phases are executed by the student, so phases are sequential rather than parallel.
2. Academic timetable limits execution to the dates in Section 4.
3. Email OTP depends on external mail delivery and may be delayed; a documented database-assisted verification path is used where delivery is not observable.
4. The mobile app currently uses a **local demonstration data store** for clinical features while authentication and payments use the live API. This is a known limitation (LIM-01, Section 12) and is treated as a **testing risk**, not a defect, in this plan.

---

## 4. Schedule (24 November 2026 onwards)

The current week is reserved for plan documentation only. Execution starts in the week beginning **Tuesday 24 November 2026**, which is the first class of the testing period.

| Phase | Activity | Start | End | Duration | Deliverable |
|---|---|---|---|---|---|
| **P0** | Plan review, environment acceptance, build tagging (`HC-TEST-1.0`), test data creation | Tue 24 Nov 2026 | Wed 25 Nov 2026 | 2 days | Signed-off environment record (Appendix C), test data catalogue (Appendix D) |
| **P1** | **Unit testing** (white-box) — backend units and client validation units | Thu 26 Nov 2026 | Sat 28 Nov 2026 | 3 days | Unit execution + coverage records (Section 6) |
| **P2** | **Functional testing** (black-box) — all functional requirements | Mon 30 Nov 2026 | Wed 2 Dec 2026 | 3 days | Functional execution worksheets (Section 7) |
| **P3** | **Integration testing** — client↔API, API↔database, API↔email, API↔payment gateway | Thu 3 Dec 2026 | Fri 4 Dec 2026 | 2 days | Integration worksheet (Section 8) |
| **P4** | **System testing** — end-to-end role journeys + selected non-functional tests | Sat 5 Dec 2026 | Tue 8 Dec 2026 | 4 days | System worksheet + non-functional evidence (Section 9) |
| **P5** | **Regression and retesting** — defect retests and affected-area regression | Wed 9 Dec 2026 | Thu 10 Dec 2026 | 2 days | Regression record + defect closure evidence (Section 10) |
| **P6** | Analysis, metrics, evidence pack, **Final Software Testing Report** | Fri 11 Dec 2026 | Sat 12 Dec 2026 | 2 days | Final report (Section 18) |

**Milestones**

| Milestone | Date | Criterion |
|---|---|---|
| M1 — Plan submitted | 24 Nov 2026 | This document delivered before class |
| M2 — Environment accepted | 25 Nov 2026 | Health check, build installed, accounts created, data seeded |
| M3 — Unit phase exit | 28 Nov 2026 | All unit tests executed, coverage measured, defects logged |
| M4 — Functional phase exit | 2 Dec 2026 | Every functional requirement has at least one executed test |
| M5 — Integration phase exit | 4 Dec 2026 | All interfaces exercised including failure paths |
| M6 — System phase exit | 8 Dec 2026 | End-to-end journeys complete; non-functional results recorded |
| M7 — Regression exit | 10 Dec 2026 | No open critical/major defect; all retests recorded |
| M8 — Final report submitted | 12 Dec 2026 | Report with evidence pack |

**Daily routine during execution (60–90 minutes per session)**

1. Confirm build identifier and environment.
2. Execute the planned test cases in ID order.
3. Record actual result immediately; never reconstruct results from memory.
4. Capture evidence for every FAIL and for at least one PASS per requirement.
5. Log defects the same day, with reproduction steps.
6. Update the execution summary counts (Section 17).

---

## 5. Requirements under test

Requirement identifiers are used by every test case and by the traceability matrix (Appendix B).

| ID | Requirement (summary) | Priority |
|---|---|---|
| REQ-01 | A patient can register with name, email, phone, country and password; the account is created unverified | High |
| REQ-02 | Registration sends a one-time code to the email address; the account becomes active only after correct code entry | High |
| REQ-03 | A user can log in with email and password and receives a role-appropriate session; wrong credentials are refused | Critical |
| REQ-04 | An unverified doctor cannot log in until the email is verified | High |
| REQ-05 | A user can request a password-reset code and set a new password with it; the old password stops working | High |
| REQ-06 | A doctor can register with specialty, licence number, experience, qualifications and coverage districts | Critical |
| REQ-07 | A newly registered doctor is created with status *pending* and cannot accept visits | Critical |
| REQ-08 | The administrator can list doctors by verification status and approve, reject or suspend a doctor | Critical |
| REQ-09 | Only approved doctors appear in the patient doctor directory | Critical |
| REQ-10 | The directory supports filtering by specialty and district and text search by name | Medium |
| REQ-11 | A doctor profile shows bio, fees, languages, rating, reviews and available slots | Medium |
| REQ-12 | A doctor can create, list and delete availability slots; overlapping or past slots are refused | High |
| REQ-13 | A doctor can set online/offline availability, reflected in the directory | Medium |
| REQ-14 | A patient can book an available slot; the visit fee is taken from the doctor profile, never from client input | High |
| REQ-15 | A booked slot becomes unavailable to other patients | High |
| REQ-16 | The doctor receives the visit request and can accept, decline or propose an alternative time | Critical |
| REQ-17 | Visit execution follows on_the_way → arrived → in_consultation → completed; invalid transitions are refused | High |
| REQ-18 | Only an approved doctor can accept a visit request | Critical |
| REQ-19 | A doctor can publish a consultation with notes, diagnosis and prescription; publication is idempotent | High |
| REQ-20 | A patient can see only their own published consultation records and prescriptions | Critical |
| REQ-21 | Notifications are created for visit events and can be listed and marked read | Medium |
| REQ-22 | A patient can pay for a visit through mobile money; the payment status is shown and reflected on the visit | High |
| REQ-23 | Payment callbacks are authenticated/idempotent: a repeated callback does not duplicate or reverse a completed payment | High |
| REQ-24 | Administrator metrics return platform counts and are restricted to administrators | Medium |
| REQ-25 | All protected endpoints reject missing/expired tokens with 401 and cross-role access with 403 | Critical |
| REQ-26 | The application recovers from network failure with a clear message and no data corruption | Medium |
| REQ-27 | Key screens are usable on a small (5") and a large (6.7") screen without clipped or unreachable controls | Medium |

---

## 6. Phase 1 — Unit testing (white-box), 26–28 November 2026

### 6.1 Objective

Verify that individual backend units (validation, serialization, fee calculation, status-transition rules, token handling) and client-side units (form validators, money and date formatters, request mappers) behave correctly in isolation.

### 6.2 Approach

White-box techniques applied at unit level:

- **Statement coverage** — every branch of the validators and transition guards executed at least once.
- **Branch/decision coverage** — both outcomes of each guard (allowed / refused) exercised.
- **Condition coverage** — each side of compound conditions (for example "doctor approved **and** slot free") exercised independently.
- **Path testing** — the login path, the booking path and the visit-status path, including their exception paths.
- **Exception-path testing** — invalid payloads, missing fields, wrong types, expired tokens, database unavailable.

Units and their locations:

| Unit | Location | Responsibility |
|---|---|---|
| `auth` registration validation | `backend/app/api/auth.py` | Email/phone/password/duplicate rules |
| JWT issue/verify | `backend/app/core/security.py` | Token creation, expiry, role claims |
| Doctor profile serializer | `backend/app/services/serializers.py` | DB model → API JSON (camelCase contract) |
| Visit fee resolution | `backend/app/api/patient.py` + doctor profile model | Fee source and currency |
| Visit status transition guard | `backend/app/api/doctor.py` | Allowed transitions only |
| Slot validation | `backend/app/api/doctor.py` | Past/overlapping slot rejection |
| Admin verification guard | `backend/app/api/admin.py` | Admin-only access, valid status values |
| PawaPay request builder | `backend/app/api/payments.py` | Payload fields, amount format, idempotency key |
| Payment callback verifier | `backend/app/api/payments.py` | Signature/identifier check, status mapping |
| Client form validators | `src/services/validation.ts` (and screen-level rules) | Required fields, email/phone format, password strength |
| Client money/date formatting | `src/utils/*` | RWF formatting, slot date/time display |
| Client request mapper | `src/services/api.ts` | API JSON → app model, error normalization |

### 6.3 Unit test cases (prepared before execution)

| ID | Unit | Input / condition | Expected result |
|---|---|---|---|
| UT-01 | Registration validation | Valid patient payload | Account created, unverified, OTP dispatched |
| UT-02 | Registration validation | Email already registered | 409/400 with message "email already registered"; no duplicate row |
| UT-03 | Registration validation | Password shorter than minimum | 422 validation error naming the field |
| UT-04 | Registration validation | Malformed email | 422 validation error; no account created |
| UT-05 | JWT verify | Valid token, correct role | Claims accepted, user resolved |
| UT-06 | JWT verify | Tampered signature | 401; no user resolved |
| UT-07 | JWT verify | Expired token | 401 with expiry reason |
| UT-08 | Serializer | Doctor model with all optional fields null | JSON with all contract keys present, nulls preserved, camelCase names |
| UT-09 | Fee resolution | Client sends a fee different from profile fee | Stored fee equals profile fee (client value ignored) |
| UT-10 | Transition guard | completed → in_consultation | Refused (409/400); state unchanged |
| UT-11 | Transition guard | in_consultation → completed | Accepted; timestamps recorded |
| UT-12 | Slot validation | Slot start in the past | Refused with validation message |
| UT-13 | Slot validation | Slot overlapping an existing slot | Refused; only one slot persisted |
| UT-14 | Slot validation | Valid future slot | Created and listed for the doctor |
| UT-15 | Admin guard | Non-admin token on `PATCH /admin/doctors/{id}/verification` | 403; status unchanged |
| UT-16 | Admin guard | Invalid status value (`"maybe"`) | 422; status unchanged |
| UT-17 | PawaPay builder | 5 000 RWF visit | Amount 5000, currency RWF, unique `depositId`, callback URL present |
| UT-18 | Callback verifier | Unknown deposit identifier | 200 acknowledged, no state change |
| UT-19 | Client validator | Phone with letters | Inline error; submit blocked |
| UT-20 | Client formatter | 5000 RWF | Displays "5,000 RWF" (no decimals) |

### 6.4 Coverage targets and measurement

- Statement coverage target: **≥ 80 %** of the units listed in 6.2.
- Branch coverage target: **≥ 75 %** for guards and validators.
- Measurement method: `coverage.py` for the backend units, run as `coverage run -m pytest` or over the automated lifecycle harness; results copied into the coverage record below.
- Coverage is reported as *evidence of thoroughness*, never as proof of correctness.

**White-box coverage record** (fill during execution)

| Unit group | Coverage type | Total items | Covered | Coverage % | Uncovered items / explanation |
|---|---|---|---|---|---|
| Auth & security | Statements |  |  |  |  |
| Auth & security | Branches |  |  |  |  |
| Visit & slot rules | Branches |  |  |  |  |
| Serializers | Statements |  |  |  |  |
| Payments | Branches |  |  |  |  |
| Client validators | Conditions |  |  |  |  |

---

## 7. Phase 2 — Functional testing (black-box), 30 November – 2 December 2026

### 7.1 Objective

Verify that each functional requirement in Section 5 is satisfied through the user-facing interfaces, using black-box design only (no reference to internal structure).

### 7.2 Techniques used and where

| Technique | Applied to |
|---|---|
| Equivalence partitioning | Registration fields, search terms, price ranges, status values |
| Boundary value analysis | Password length, experience years, slot start/end times, fee amount, OTP length and expiry |
| Decision tables | Login (verified × role × credentials), visit acceptance (approved × slot free × doctor owns request), payment (initiated × callback × already-completed) |
| State transition | Visit status chain, doctor verification status, payment status |
| Use-case / scenario | Booking journey, consultation publication, password reset |
| Error guessing | Double submission, back-navigation mid-flow, repeated OTP requests, whitespace in email, session expiry during booking |

### 7.3 Functional test cases

Each row is a full test case in the master template (Appendix A): the steps are the numbered actions, and the expected result is stated before execution.

**Group A — Accounts and authentication**

| ID | Req | Objective | Preconditions & data | Steps | Expected result |
|---|---|---|---|---|---|
| FT-01 | REQ-01 | Patient registers successfully | New email `test.patient.<ts>@example.rw`, valid phone | 1. Open app 2. Register as patient 3. Fill all fields 4. Submit | Account created, unverified; verification screen shown; no auto-login |
| FT-02 | REQ-01 | Duplicate email refused | Existing account email | Register again with same email | Clear error "email already registered"; form retained; no second account |
| FT-03 | REQ-01 | Invalid inputs refused | Email `ab@`, phone `+250abc`, password `123` | Submit each separately | Field-level errors; submission blocked; nothing saved |
| FT-04 | REQ-02 | OTP verification succeeds | Unverified account, valid code | Enter correct 6-digit code | Account verified; login allowed; code cannot be reused |
| FT-05 | REQ-02 | Wrong/expired OTP refused | Unverified account | Enter wrong code, then an expired code | Refused with remaining-attempts message; account stays unverified |
| FT-06 | REQ-03 | Login by each role | Verified patient, approved doctor, admin | Log in as each role | Correct home screen per role; session token stored; role menus only |
| FT-07 | REQ-03 | Wrong password refused | Verified account | Submit wrong password 1× | 401 message "invalid credentials"; no session; no user enumeration detail |
| FT-08 | REQ-04 | Unverified doctor blocked | Pending doctor account | Attempt login | Login refused with "verify your email" guidance |
| FT-09 | REQ-05 | Password reset | Verified account | Request reset → receive code → set new password → login old, then new | Old password rejected, new accepted; code single-use |
| FT-10 | REQ-05 | Reset with invalid code | Verified account | Submit 000000 | Refused; password unchanged |

**Group B — Doctor onboarding, verification and directory**

| ID | Req | Objective | Preconditions & data | Steps | Expected result |
|---|---|---|---|---|---|
| FT-11 | REQ-06 | Doctor registers | New doctor email, licence `RMB-2026-XXXX` | Complete doctor onboarding form | Account created *pending*; profile stores specialty, licence, experience, districts |
| FT-12 | REQ-06 | Missing licence refused | Doctor form without licence | Submit | Validation error; no account |
| FT-13 | REQ-07 | Pending doctor absent from directory | Newly registered doctor | Search directory as patient | Doctor not listed |
| FT-14 | REQ-08 | Admin sees pending doctor | Admin session | Open verification queue, filter *pending* | New doctor present with submitted credentials |
| FT-15 | REQ-08 | Admin approves doctor | Pending doctor | Approve | Status becomes *approved*; audit values recorded; no error |
| FT-16 | REQ-09 | Approved doctor appears | Approved doctor | Refresh patient directory | Doctor listed with specialty, fee, rating placeholder |
| FT-17 | REQ-08 | Admin suspends doctor | Approved doctor | Suspend, then refresh directory | Doctor disappears from directory; cannot accept visits |
| FT-18 | REQ-10 | Specialty filter | Directory with ≥ 2 specialties | Filter by "Cardiology" | Only cardiologists listed; count matches |
| FT-19 | REQ-10 | Filter with no matches | — | Filter by specialty with no doctors | Empty state message, no error |
| FT-20 | REQ-10 | Search by partial name | Doctor "Eric" | Search "eri" | Doctor found (case-insensitive) |
| FT-21 | REQ-11 | Doctor detail | Approved doctor with slots | Open profile | Bio, fees, languages, slots and reviews rendered; fee matches profile |

**Group C — Availability**

| ID | Req | Objective | Preconditions & data | Steps | Expected result |
|---|---|---|---|---|---|
| FT-22 | REQ-12 | Create slot | Approved, online doctor | Pick tomorrow 09:00–10:00, save | Slot listed once; visible to patients |
| FT-23 | REQ-12 | Past slot refused | Approved doctor | Create slot yesterday 09:00 | Refused with clear message |
| FT-24 | REQ-12 | Overlapping slot refused | Existing 09:00–10:00 slot | Create 09:30–10:30 | Refused; only original slot exists |
| FT-25 | REQ-12 | Delete slot | Existing unbooked slot | Delete, confirm | Slot removed from doctor and patient views |
| FT-26 | REQ-13 | Online toggle | Approved doctor, offline | Toggle online → refresh patient view; toggle offline | Online state reflected in directory; persists after app restart |
| FT-27 | REQ-12 | Booked slot cannot be deleted | Slot booked by patient | Attempt delete | Refused with explanation; visit unaffected |

**Group D — Booking and visit lifecycle**

| ID | Req | Objective | Preconditions & data | Steps | Expected result |
|---|---|---|---|---|---|
| FT-28 | REQ-14 | Book a slot | Patient session, doctor with free slot | Select slot, confirm | Visit created *pending*; fee equals doctor profile fee; confirmation shown |
| FT-29 | REQ-14 | Fee tampering ignored | Modified client request with fee 1 RWF | Submit booking | Stored fee equals profile fee; response states real fee |
| FT-30 | REQ-15 | Slot reservation | Two patients, one slot | Book from both accounts | First succeeds; second refused "slot no longer available" |
| FT-31 | REQ-16 | Doctor receives request | Pending visit | Open doctor requests | Request listed with patient name, slot, fee, address |
| FT-32 | REQ-16 | Doctor accepts | Pending visit, approved doctor | Accept | Visit *confirmed*; patient sees status change; notification created |
| FT-33 | REQ-16 | Doctor declines | Pending visit | Decline with reason | Visit *declined*; slot released; patient notified with reason |
| FT-34 | REQ-16 | Alternative time proposed | Pending visit | Propose new date/time + note | Visit *alternative_proposed*; patient sees proposal |
| FT-35 | REQ-18 | Unapproved doctor cannot accept | Pending doctor, direct API call | Call accept endpoint with pending doctor token | 403; visit remains pending |
| FT-36 | REQ-17 | Valid status chain | Confirmed visit | on_the_way → arrived → in_consultation → completed | Each step accepted; timestamps recorded; patient view updates |
| FT-37 | REQ-17 | Invalid transition refused | Completed visit | Request in_consultation | Refused; status remains completed |
| FT-38 | REQ-17 | Doctor cannot skip states | Confirmed visit | Request completed directly | Refused with allowed-next-state message |

**Group E — Consultation, records and notifications**

| ID | Req | Objective | Preconditions & data | Steps | Expected result |
|---|---|---|---|---|---|
| FT-39 | REQ-19 | Publish consultation | Visit in consultation | Enter notes, diagnosis, 2 prescription items, publish | Record published; items stored with dosage/quantity; doctor sees confirmation |
| FT-40 | REQ-19 | Empty consultation refused | In-consultation visit | Publish with empty notes | Validation error; nothing published |
| FT-41 | REQ-19 | Duplicate publish idempotent | Already published visit | Publish again | Either 409 "already published" or unchanged record; no duplicate |
| FT-42 | REQ-20 | Patient sees own record | Published consultation | Open records | Record and prescriptions visible with doctor name and date |
| FT-43 | REQ-20 | Cross-patient access refused | Two patients | Request other patient's record by ID | 403/404; no data leaked |
| FT-44 | REQ-21 | Notifications on events | Confirmed then completed visit | Open notifications | One notification per event, correct wording, newest first |
| FT-45 | REQ-21 | Mark as read | Unread notifications | Mark one read, reopen | Read state persists; unread counter decrements |

**Group F — Payments, administration and session**

| ID | Req | Objective | Preconditions & data | Steps | Expected result |
|---|---|---|---|---|---|
| FT-46 | REQ-22 | Initiate payment | Confirmed visit, sandbox amount 250 RWF | Pay → choose MTN/Airtel → approve in sandbox | Payment page shows pending then completed; visit payment status *paid* |
| FT-47 | REQ-22 | Failed payment | Sandbox number that rejects | Attempt payment | Status *failed* with reason code; visit remains unpaid; retry possible |
| FT-48 | REQ-23 | Duplicate callback | Completed deposit ID | Send same callback twice | Second call acknowledged; state unchanged; one transaction row |
| FT-49 | REQ-23 | Spoofed callback for failed payment | Failed deposit ID | Send *completed* callback with wrong token/signature | Rejected or ignored; payment stays failed |
| FT-50 | REQ-24 | Admin metrics | Admin session | Open admin dashboard | Counts of users, doctors, visits, revenue consistent with database |
| FT-51 | REQ-24 | Metrics forbidden to others | Patient token | Call metrics endpoint | 403 |
| FT-52 | REQ-25 | Missing token | — | Call protected endpoint without `Authorization` | 401; no data |
| FT-53 | REQ-25 | Expired token | Token past expiry | Call protected endpoint | 401 with re-login guidance; app returns to login |
| FT-54 | REQ-26 | Offline behaviour | Airplane mode | Open directory, attempt booking | Clear network message; no partial record; retry succeeds when online |
| FT-55 | REQ-03 | Logout | Any role | Logout, then use back navigation | Session cleared; protected screens redirect to login |

### 7.4 Design checklist compliance

Every case above was checked against the course design checklist: valid and invalid inputs (FT-01/02/03), minimum/maximum/boundary (FT-03 password length, FT-23/24 times, FT-46 amount), missing/optional/incorrectly formatted (FT-12, FT-03), rule combinations (FT-16/17/18, FT-35), normal/alternative/exception flows (FT-32/33/34, FT-47/54), and objectively verifiable expectations.

---

## 8. Phase 3 — Integration testing, 3–4 December 2026

### 8.1 Objective

Verify that connected components exchange data correctly: mobile client ↔ API, API ↔ database, API ↔ email service, API ↔ payment gateway, and app navigation ↔ state store.

### 8.2 Bottom-up integration order

1. Database access layer (already unit-verified) → API routers.
2. API routers → API gateway/middleware (auth, error handling).
3. API → email service (OTP and reset codes).
4. API → payment gateway (initiation, callback).
5. Client service layer → API (contract, tokens, error mapping).
6. Client screens → service layer → local state (navigation and refresh).

### 8.3 Integration test cases

| ID | Components / interface | Interaction tested | Test data | Expected interaction |
|---|---|---|---|---|
| IT-01 | Client `authService` ↔ `POST /auth/register/*` | Request mapping, response parsing | New patient, new doctor | Payload field names match API contract; success object mapped to app model |
| IT-02 | Client ↔ API error path | 4xx/5xx propagation | Duplicate email, invalid password | Error body parsed and shown verbatim; no crash, no silent success |
| IT-03 | API ↔ database | Persistence of registration + profile transaction | New doctor | User row + doctor profile row committed together; no orphan |
| IT-04 | API ↔ SMTP | OTP email dispatch | Valid email address | Message delivered with correct code and expiry wording; API returns `emailSent: true` |
| IT-05 | API middleware ↔ routers | Bearer token propagation across modules | Patient/doctor/admin tokens | Each router resolves the correct user; wrong-role token gets 403 |
| IT-06 | API ↔ payment gateway | Deposit creation request/response | 250 RWF, MTN RWA | Provider returns accepted status and identifier; stored transaction matches request |
| IT-07 | Gateway → API callback | Callback verification and state update | Completed and failed deposits | Matching identifier updates payment; unknown identifier ignored; response 2xx so provider stops retrying |
| IT-08 | Client ↔ API ↔ database | Booking writes slot state and visit atomically | Free slot, patient session | Exactly one visit; slot marked booked; list refresh reflects both |
| IT-09 | Serializer ↔ client mapper | Field contract (camelCase, numbers as numbers) | Doctor, visit, consultation payloads | No `undefined` fields; fees render without coercion errors |
| IT-10 | App navigation ↔ state | Screen-to-screen data handoff | Visit id passed to consultation screen | Correct visit loaded; back navigation preserves list state |
| IT-11 | Component unavailable | API stopped while app open | App open on directory | Friendly error; screens remain usable; retry recovers after API restart |
| IT-12 | Database unavailable | Invalid connection string (staging) | API request | 503 with generic message; no stack trace or credentials in response |

---

## 9. Phase 4 — Overall system testing, 5–8 December 2026

### 9.1 Objective

Evaluate the complete integrated system on a representative build, executing realistic end-to-end journeys for every role, and selected non-functional checks with defined conditions.

### 9.2 End-to-end scenarios

| ID | Scenario | Actors | Expected result |
|---|---|---|---|
| ST-01 | **Doctor onboarding to first booking** | Doctor, admin, patient | Register → verify email → admin approves → publish slot → patient finds doctor, books, pays → doctor accepts → visit completes → consultation published → patient sees record |
| ST-02 | **Full clinical visit** | Doctor, patient | Accepted visit runs through all four execution states; notes, diagnosis, prescription and lab request published; record visible to patient |
| ST-03 | **Payment failure and retry** | Patient | Failed attempt shows reason; retry succeeds; only one successful transaction recorded |
| ST-04 | **Decline and rebook** | Patient, doctor | Doctor declines with reason; slot released; patient books another doctor without data inconsistency |
| ST-05 | **Administrator control** | Admin | Suspending a doctor removes them from the directory and blocks acceptance immediately |
| ST-06 | **Multi-country configuration** | Patient | Registering in Kenya vs Rwanda shows correct currency, phone prefix and fees |
| ST-07 | **Session lifecycle** | Any | Login → use app → token expiry → re-login → data intact |

### 9.3 Non-functional tests (defined conditions)

Do not claim a standard was met without the stated method and evidence.

| ID | Quality area | Method / condition | Target |
|---|---|---|---|
| NFT-01 | Performance | 10 sequential requests to `GET /doctors` from a warm server, measured with `curl -w "%{time_total}"`; median recorded | Median ≤ 1.5 s excluding cold start |
| NFT-02 | Performance | Login round trip measured 5× | Median ≤ 2.0 s |
| NFT-03 | Performance | Cold start after 10 min idle | Measured and reported (no target; documentation only) |
| NFT-04 | Security | TLS on deployed origin; password/OTP never echoed in API responses or logs | HTTPS enforced; no secrets in payloads or logs |
| NFT-05 | Security | Role-based access across 5 representative endpoints (Section 7 Group F) | 100 % refusal of cross-role access |
| NFT-06 | Security | Password storage check in database | Passwords hashed (bcrypt/argon2), never plaintext |
| NFT-07 | Usability | 3 first-time users attempt booking with no instruction; observe | All 3 complete booking; no blocking confusion |
| NFT-08 | Usability | Message clarity review of 10 error messages | Every message states what happened and what to do next |
| NFT-09 | Compatibility | Android (Expo Go, 5" and 6.7" screens), iOS via Expo Go if available, web build in Chrome and Edge | Core journeys usable on each; differences documented |
| NFT-10 | Reliability | 30-minute session with 20 bookings/status changes | No crash; no duplicate records; memory stable |
| NFT-11 | Data integrity | After ST-01, compare API data with database rows for user, doctor, visit, payment, consultation | Counts and key fields match exactly |
| NFT-12 | Recovery | Kill API mid-booking; restart; retry | No half-created visit; retry succeeds |
| NFT-13 | Recovery | Interrupt payment callback (network drop), then provider retries | Final state consistent with provider; no double credit |
| NFT-14 | Accessibility (basic) | Contrast and font scaling on 5 key screens at 130 % text size | Text legible, no clipped labels |

### 9.4 System execution record

Each scenario is recorded on the system worksheet with: test ID, requirement, scenario, environment and data, expected, actual, status, evidence ID and defect ID.

---

## 10. Phase 5 — Regression and retesting, 9–10 December 2026

### 10.1 Objective

After every correction, confirm the specific defect is fixed (**retesting**) and that the change did not break existing behaviour (**regression**).

### 10.2 Regression suite (selected before execution)

| ID | Change / defect ref | Selected tests | Reason selected | Baseline |
|---|---|---|---|---|
| RT-01 | DEF-01 Router mounting | ST-01, FT-14, FT-16 | All doctor endpoints were unreachable | Previously failing |
| RT-02 | DEF-02 Missing approval endpoint | FT-14, FT-15, FT-16 | Approval is the gate to the directory | Previously failing |
| RT-03 | DEF-03 Session identity mismatch | FT-06, FT-42, FT-44, ST-07 | Affects every user-scoped read | Previously failing |
| RT-04 | DEF-04 Doctor not created in client store | FT-11, FT-13, FT-14 | Registration path and queue visibility | Previously failing |
| RT-05 | Automated lifecycle suite | `backend/tests/e2e_flow.py` (26 checks) | Broad coverage of auth, directory, booking, status, consultation, notifications | Last run 26/26 PASS |
| RT-06 | Any fixed defect | Original failing test + 2 neighbouring tests | Retest + side effects | Per defect record |

### 10.3 Procedure

1. Record the updated build identifier before executing.
2. Run the original failing test first (retest) and record PASS/FAIL.
3. Run the neighbouring and shared-component tests listed above.
4. Compare with the baseline result captured in the previous phase.
5. Distinguish **new** failures from the original defect in the record.
6. Close the defect only when retest and regression both pass; otherwise reopen with new evidence.

### 10.4 Regression exit criteria

- No open critical or major defect.
- All RT tests executed with recorded status.
- Any remaining minor defect documented with an agreed workaround.
- Execution summary and pass rate computed with a stated denominator.

---

## 11. Test environment and configuration

### 11.1 Environment record

| Item | Details |
|---|---|
| Purpose | Functional, integration, system and regression testing (test environment, not production) |
| Hardware — workstation | Laptop/desktop, Windows 11, 16 GB RAM (record exact model at execution) |
| Mobile devices | Android phone (Expo Go) — record model and Android version; second device or emulator for the 5" check |
| Browser | Chrome (latest) and Edge (latest) for the Expo web build |
| Runtime | Node.js + Expo SDK (record `npx expo --version`), Python 3.12 in `backend/venv` |
| Application build | `HC-TEST-1.0` — record git commit hash and app version |
| API endpoint (local) | `http://127.0.0.1:8035/api/v1` via `uvicorn app.main:app` |
| API endpoint (deployed) | `https://home-care-be-teal.vercel.app/api/v1` |
| Database | Managed PostgreSQL (Neon), test database, schema created by `ensure_schema()` |
| External services | SMTP account for OTP; PawaPay **sandbox** (Rwanda: MTN, Airtel) |
| Network | Campus/home broadband; airplane mode used deliberately for FT-54, IT-11 |
| Accounts / roles | Patient, doctor (approved), doctor (pending), administrator — see Appendix D (passwords never recorded) |
| Known limitations | LIM-01 (client uses local demonstration data for clinical features), LIM-02 (iOS testing limited to Expo Go), LIM-03 (sandbox payments only) |

### 11.2 Environment acceptance (entry check for P0)

- [ ] `GET /health` returns 200 with expected environment value.
- [ ] Database reachable; schema present; seeded accounts can log in.
- [ ] Mobile build installs and reaches the API base URL.
- [ ] Test data created and listed in Appendix D.
- [ ] Evidence folder structure created (Section 13).

---

## 12. Known risks, constraints and limitations

| ID | Risk / limitation | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Managed database cold start delays first request (~20–30 s) | High | Medium | Warm the API before timed tests; record cold starts as NFT-03 only |
| R-02 | Email OTP delayed or filtered by the mail provider | Medium | High | Use a second mailbox; if undeliverable, verify via documented database update and mark the test BLOCKED with reason |
| R-03 | Payment sandbox number unavailable or provider maintenance | Medium | High | Use alternate sandbox MSISDN; if unavailable, record BLOCKED and execute on the retry date |
| R-04 | Single tester limits parallel execution | High | Medium | Sequential phase schedule with buffer days (P6) |
| R-05 | Flaky network during mobile tests | Medium | Medium | Repeat the failed case once to distinguish defect from environment |
| R-06 | Time-boxed academic schedule | Medium | High | Priority order: critical requirements first (REQ-03, 06–09, 14–20, 22–25) |
| R-07 | Test data pollution from repeated runs | Medium | Medium | Generated identifiers, cleanup step after each system scenario |
| LIM-01 | Clinical features in the client read a local demonstration data store; only authentication and payments call the live API | Certain | High | Declared limitation; plan tests client behaviour against the demo store AND verifies the live API separately (Section 15 baseline). Report states clearly which layer each result covers |
| LIM-02 | No physical iOS device | Certain | Low | Cover iOS behaviour through Expo Go where available; otherwise report as not tested |
| LIM-03 | Payments restricted to sandbox | Certain | Medium | Use sandbox only; do not claim production payment verification |

Each limitation is restated in the final report's "Limitations" section; no requirement is marked PASS on the basis of a different layer than the one under test.

---

## 13. Test data preparation

### 13.1 Data catalogue

| TD ID | Data | Purpose | Notes |
|---|---|---|---|
| TD-01 | Patient account A (verified) | Login, booking, records | Seeded; password known to tester only |
| TD-02 | Patient account B (verified, different country) | Isolation tests, currency checks | Seeded |
| TD-03 | Doctor account A (approved, verified) | Directory, slots, visits | Seeded |
| TD-04 | Doctor account B (newly registered, pending) | Verification queue, FT-13 | Created per run with unique email |
| TD-05 | Administrator account | Approval, metrics | Seeded |
| TD-06 | Unverified account (no OTP entered) | FT-08 | Created per run |
| TD-07 | Invalid input set | FT-03, UT-02..04 | Documented values in Appendix D |
| TD-08 | Slot set: tomorrow 09:00–10:00, 09:30–10:30, yesterday 09:00 | Slot boundaries | Created per run |
| TD-09 | Sandbox MSISDN (approving) | Payment success | Provided by provider sandbox documentation |
| TD-10 | Sandbox MSISDN (rejecting) | Payment failure | Provided by provider sandbox documentation |
| TD-11 | Consultation content: notes, diagnosis, 2 prescriptions | FT-39, FT-42 | Fixed text for comparability |
| TD-12 | Boundary values: password 7/8/64 chars, experience 0/1/50 years, fee 1/250/999999 RWF | Boundary analysis | Values recorded in test data log |

### 13.2 Data rules

1. Every generated record uses a unique suffix (timestamp or UUID) so runs do not collide.
2. Test records are deleted after each system scenario; the deletion is part of the evidence.
3. No real personal data is used; names and phone numbers are fictitious.
4. Passwords appear only in the tester's private notes, never in evidence screenshots or the report.
5. Sensitive values (tokens, API keys) are masked in every screenshot.

---

## 14. Roles and responsibilities

| Role | Person | Responsibilities |
|---|---|---|
| Test lead / planner | Student | Owns this plan, schedule, environment, data, execution, defect log, evidence, final report |
| Tester | Student | Executes cases, records actual results, captures evidence |
| Developer (fixes) | Student | Fixes defects, supplies build references, performs retests request |
| Reviewer / approver | Lecturer | Reviews plan, approves scope and schedule, evaluates report |
| Environment owner | Student | Keeps database, deployment and sandbox credentials available |

Separation of duties: the tester records results from the built artefact, not from the code's intention, and a defect is closed only when a retest executed on a new build passes.

---

## 15. Preliminary baseline (already executed during development)

A development-time lifecycle harness exists at `backend/tests/e2e_flow.py`. It registers a doctor, verifies the email at database level, approves through the admin API, confirms directory listing and filtering, creates and reads a slot, books a visit as a patient, accepts it, walks all four execution states, publishes a consultation and prescription, checks patient visibility and notifications, then deletes its own data.

**Baseline result (24 Nov 2026, local build): 26 of 26 checks PASS, exit code 0, test data removed.**

This is recorded as a **baseline**, not as formal evidence for Phase 2–5: formal execution repeats equivalent checks with recorded evidence, screenshots and defect linkage. Its value here is (a) proving the environment is testable during P0 and (b) providing a regression reference for RT-05.

Defects found and corrected during this development testing (all retested):

| Defect ID | Title | Severity | Priority | Status |
|---|---|---|---|---|
| DEF-01 | Most API routers were not mounted, so doctor, patient, availability, records and admin endpoints returned 404 | Critical | High | Fixed; retest PASS (RT-01) |
| DEF-02 | No administrator endpoint existed to approve a doctor, so a registered doctor could never be listed | Critical | High | Fixed; retest PASS (RT-02) |
| DEF-03 | After login the app looked up local data with a different user identifier than the one the backend returned, leaving visits, records and notifications empty | Major | High | Fixed; retest PASS (RT-03) |
| DEF-04 | A doctor who registered did not appear in the in-app verification queue or directory | Major | High | Fixed; retest PASS (RT-04) |

---

## 16. Defect management

### 16.1 Workflow

1. Confirm the observed behaviour truly differs from the expected result.
2. Check reproducibility (run twice; note whether it is consistent).
3. Assign the next defect ID (`DEF-nn`) and capture evidence.
4. Record build, environment, preconditions, data and numbered reproduction steps.
5. State expected and actual results factually — no assumptions about the cause.
6. Assign severity and priority (16.2), then status: New → Assigned → Fixed → Retest → Closed / Reopened.
7. After correction, retest the original failing case, then run the regression selection (Section 10).

### 16.2 Severity and priority criteria

| Severity | Meaning | Example |
|---|---|---|
| Critical | Core journey blocked or data/security compromised | Cannot log in; doctor cannot be approved; payment credited twice |
| Major | Important function wrong, workaround exists | Slot overlap accepted; wrong fee stored |
| Moderate | Noticeable incorrect behaviour, limited impact | Wrong sort order; stale counter |
| Minor | Cosmetic or low-impact | Truncated label; inconsistent spacing |

| Priority | Meaning |
|---|---|
| High | Fix before the next execution session |
| Medium | Fix within the phase |
| Low | Fix if time allows; document workaround |

### 16.3 Defect report form (Appendix E)

Every defect is recorded with: ID and title, date and reporter, build, environment, related test case, preconditions, steps to reproduce, expected result, actual result, severity and priority, evidence reference, assignee and status, resolution reference, retest result and date, regression result.

### 16.4 Metrics reported

- Defects by severity and by phase discovered.
- Defect density per requirement area.
- Retest pass rate and average time to fix.
- Open defects at exit, with accepted-workaround justification.

---

## 17. Evidence management and progress reporting

### 17.1 Evidence naming convention

`EV-<phase>-<test-id>-<nn>.<ext>` — for example `EV-P2-FT-16-01.png`.

| Phase prefix | Meaning |
|---|---|
| P1 | Unit / coverage output |
| P2 | Functional |
| P3 | Integration |
| P4 | System and non-functional |
| P5 | Regression |

Evidence folder layout:

```
evidence/
  P1-unit/          coverage reports, console logs
  P2-functional/    screenshots per test id, API responses
  P3-integration/   request/response captures, callback payloads
  P4-system/        journey screenshots, timing outputs, device notes
  P5-regression/    retest output, before/after comparisons
  defects/          one folder per DEF id
```

### 17.2 Rules

1. One evidence item per executed FAIL, and at least one per requirement for PASS.
2. Screenshots must show the build identifier or timestamp where possible.
3. API evidence uses redacted requests (token replaced with `<token>`).
4. Evidence is linked from the test record and the defect record.
5. No passwords, OTPs, tokens or personal data in any evidence item.

### 17.3 Test execution summary (to complete during execution)

| Activity | Planned | Passed | Failed | Blocked | Not run |
|---|---|---|---|---|---|
| Unit testing (UT) | 20 |  |  |  |  |
| Functional testing (FT) | 55 |  |  |  |  |
| Integration testing (IT) | 12 |  |  |  |  |
| Overall system testing (ST + NFT) | 21 |  |  |  |  |
| Regression testing (RT) | 6 |  |  |  |  |
| **TOTAL** | **114** |  |  |  |  |

**Pass rate (%) = Passed ÷ (Passed + Failed) × 100.** Blocked and not-run tests are reported separately and excluded from the denominator, with the denominator stated explicitly.

### 17.4 Phase status reporting

At the end of each phase, record: build identifier, tests planned/executed, pass rate, defects raised (by severity), tests blocked with reasons, deviations from this plan, and the decision to proceed or repeat the phase.

---

## 18. Deliverables and submission roadmap

### 18.1 What is submitted now (before the next class)

1. **This testing plan** (PDF/Word), containing scope, requirements, all five phases, schedule from 24 November 2026, environment, data, roles, risks, entry/exit criteria, defect and evidence processes, and the traceability matrix.

### 18.2 What is produced during the testing weeks

2. Completed execution worksheets for every phase (unit, functional, integration, system, regression) with actual results and statuses.
3. White-box coverage record with measured percentages.
4. Defect register with retest and regression outcomes.
5. Evidence pack per the naming convention.
6. Execution summary with pass rate and stated denominator.

### 18.3 What is submitted as the final report (12 December 2026)

7. **Final Software Testing Report** containing: introduction and software description, test strategy summary, environment, executed test counts, pass/fail/blocked analysis, coverage evidence, defect analysis (severity, density, trends, root-cause categories), regression outcome, limitations, conclusion on requirement satisfaction, and appendices (traceability matrix, defect forms, evidence index, execution worksheets).

---

## 19. Entry and exit criteria

### 19.1 Entry criteria (each phase)

- A testable build is available and its identifier recorded.
- The requirements for that phase are available and reviewed.
- Environment and test data are prepared (Section 11, Appendix D).
- Test cases for the phase are written and reviewed (this document).
- The previous phase's exit criteria are met, or deviations are documented.

### 19.2 Exit criteria (each phase)

- All planned tests have a recorded status (PASS / FAIL / BLOCKED / NOT RUN).
- Every failure is linked to a defect record.
- Critical defects are resolved or formally accepted with justification.
- Evidence is captured, labelled and indexed.
- Coverage is measured and limitations documented.
- The execution summary for the phase is complete.

### 19.3 Overall exit criteria (before the final report)

- Every requirement in Section 5 has at least one executed test and a status.
- No open critical defect.
- Regression suite executed on the final build.
- Pass rate computed and reported with its denominator.
- Limitations (LIM-01 to LIM-03) stated explicitly, with the layer each result applies to.

---

## Appendix A — Master test case template

| Field | Record |
|---|---|
| Test case ID |  |
| Title / objective |  |
| Requirement reference |  |
| Testing level / technique |  |
| Preconditions |  |
| Test data |  |
| Steps (1, 2, 3 …) |  |
| Expected result |  |
| Actual result |  |
| Status |  |
| Evidence reference |  |
| Defect reference |  |
| Tester / date |  |

---

## Appendix B — Test traceability matrix

| Requirement | Summary | Test cases | Level(s) | Status | Defect(s) |
|---|---|---|---|---|---|
| REQ-01 | Patient registration | FT-01, FT-02, FT-03, UT-01–UT-04 | Unit, Functional |  |  |
| REQ-02 | Email OTP verification | FT-04, FT-05, IT-04 | Functional, Integration |  |  |
| REQ-03 | Login and session per role | FT-06, FT-07, FT-55, UT-05–UT-07 | Unit, Functional |  |  |
| REQ-04 | Unverified doctor blocked | FT-08 | Functional |  |  |
| REQ-05 | Password reset | FT-09, FT-10 | Functional |  |  |
| REQ-06 | Doctor registration | FT-11, FT-12, UT-01 | Unit, Functional |  |  |
| REQ-07 | New doctor is pending | FT-13, IT-03 | Functional, Integration |  |  |
| REQ-08 | Admin verification actions | FT-14, FT-15, FT-17, UT-15, UT-16 | Unit, Functional |  |  |
| REQ-09 | Only approved doctors listed | FT-16, ST-01 | Functional, System |  |  |
| REQ-10 | Search and filtering | FT-18, FT-19, FT-20 | Functional |  |  |
| REQ-11 | Doctor profile detail | FT-21, UT-08, IT-09 | Unit, Functional, Integration |  |  |
| REQ-12 | Availability slots | FT-22–FT-25, FT-27, UT-12–UT-14 | Unit, Functional |  |  |
| REQ-13 | Online/offline toggle | FT-26 | Functional |  |  |
| REQ-14 | Booking and fee source | FT-28, FT-29, UT-09, IT-08 | Unit, Functional, Integration |  |  |
| REQ-15 | Slot reservation | FT-30, IT-08 | Functional, Integration |  |  |
| REQ-16 | Accept/decline/alternative | FT-31–FT-34 | Functional |  |  |
| REQ-17 | Status transitions | FT-36–FT-38, UT-10, UT-11, ST-02 | Unit, Functional, System |  |  |
| REQ-18 | Only approved doctor accepts | FT-35 | Functional |  |  |
| REQ-19 | Publish consultation | FT-39–FT-41, ST-02 | Functional, System |  |  |
| REQ-20 | Patient sees own records only | FT-42, FT-43 | Functional |  |  |
| REQ-21 | Notifications | FT-44, FT-45 | Functional |  |  |
| REQ-22 | Mobile money payment | FT-46, FT-47, IT-06 | Functional, Integration |  |  |
| REQ-23 | Callback integrity | FT-48, FT-49, IT-07, UT-17, UT-18 | Unit, Functional, Integration |  |  |
| REQ-24 | Admin metrics | FT-50, FT-51 | Functional |  |  |
| REQ-25 | Authentication and authorization | FT-52, FT-53, IT-05, IT-12 | Functional, Integration |  |  |
| REQ-26 | Network failure handling | FT-54, IT-11, NFT-12 | Functional, Integration, System |  |  |
| REQ-27 | Usability on small and large screens | NFT-07, NFT-08, NFT-09, NFT-14 | System |  |  |

---

## Appendix C — Test environment record

| Item | Details |
|---|---|
| Environment / purpose | Test (local API + Expo client + managed test database) |
| Hardware / device |  |
| Operating system / version |  |
| Browser / runtime / platform |  |
| Application build / version |  |
| Database / data configuration |  |
| Network conditions |  |
| Accounts / roles (no passwords) |  |
| Configuration notes | API base URL, `PAWAPAY_ENVIRONMENT=sandbox`, SMTP enabled |
| Known limitations | LIM-01, LIM-02, LIM-03 |

---

## Appendix D — Test data log

| TD ID | Value / identifier | Created | Used by | Deleted | Notes |
|---|---|---|---|---|---|
| TD-01 |  |  |  |  |  |
| TD-02 |  |  |  |  |  |
| TD-03 |  |  |  |  |  |
| TD-04 |  |  |  |  | Unique per run |
| TD-05 |  |  |  |  |  |
| TD-06 |  |  |  |  |  |
| TD-08 |  |  |  |  | Three slots |
| TD-09 |  |  |  |  | Sandbox MSISDN |
| TD-10 |  |  |  |  | Sandbox MSISDN |

---

## Appendix E — Defect report form

| Field | Details |
|---|---|
| Defect ID and title |  |
| Date reported / reporter |  |
| Build / version |  |
| Environment |  |
| Related test case ID |  |
| Preconditions |  |
| Steps to reproduce |  |
| Expected result |  |
| Actual result |  |
| Severity / priority |  |
| Evidence location |  |
| Assigned to / status |  |
| Resolution / fix reference |  |
| Retest result and date |  |
| Regression result |  |

---

## Appendix F — Execution worksheets

### F.1 Unit execution record

| Test ID | Unit / component | Input / condition | Expected | Actual | Status | Evidence / defect |
|---|---|---|---|---|---|---|
| UT-01 |  |  |  |  |  |  |
| UT-02 |  |  |  |  |  |  |
| … |  |  |  |  |  |  |

### F.2 Functional execution worksheet

| Test ID | Req | Scenario | Expected | Actual | Status | Evidence / defect |
|---|---|---|---|---|---|---|
| FT-01 | REQ-01 |  |  |  |  |  |
| … |  |  |  |  |  |  |

### F.3 Integration execution worksheet

| Test ID | Components / interface | Interaction tested | Expected | Actual | Status | Defect |
|---|---|---|---|---|---|---|
| IT-01 |  |  |  |  |  |  |
| … |  |  |  |  |  |  |

### F.4 System execution worksheet

| Test ID | Requirement / quality area | Scenario | Environment / data | Expected | Actual | Status | Evidence |
|---|---|---|---|---|---|---|---|
| ST-01 | REQ-09 |  |  |  |  |  |  |
| … |  |  |  |  |  |  |  |

### F.5 Regression execution record

| Regression ID | Change / defect ref | Selected tests | Reason | Baseline | Current | Status | Notes |
|---|---|---|---|---|---|---|---|
| RT-01 | DEF-01 | ST-01, FT-14, FT-16 |  | Fail |  |  |  |
| RT-02 | DEF-02 | FT-14, FT-15, FT-16 |  | Fail |  |  |  |
| RT-03 | DEF-03 | FT-06, FT-42, FT-44, ST-07 |  | Fail |  |  |  |
| RT-04 | DEF-04 | FT-11, FT-13, FT-14 |  | Fail |  |  |  |
| RT-05 | Automated suite | `e2e_flow.py` |  | 26/26 |  |  |  |

---

## Appendix G — Glossary

| Term | Meaning |
|---|---|
| Test condition | An aspect of the software that should be verified |
| Test case | Preconditions, inputs, actions and expected results for a test |
| Expected result | Behaviour required by the specification, defined before execution |
| Actual result | Behaviour observed during execution |
| Defect | A flaw that may cause incorrect behaviour |
| Retesting | Repeating a failed test to verify a specific correction |
| Regression testing | Running selected existing tests after a change to detect side effects |
| PASS / FAIL / BLOCKED / NOT RUN | Statuses defined in the course procedure (Section 17.3 and Appendix F) |
| OTP | One-time password sent by email |
| Sandbox | Provider test environment that simulates payments without real money |
| Idempotent | Repeating the same operation produces no additional effect |
