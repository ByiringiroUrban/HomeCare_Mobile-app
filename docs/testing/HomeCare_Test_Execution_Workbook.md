# TEST EXECUTION WORKBOOK

**HomeCare — Home Healthcare Mobile Application**

Companion to the Software Testing Plan. Prepared for the testing period 24 November – 12 December 2026.

Institution: ______________________________________________

Student name(s): ______________________________________________

Student ID(s): ______________________________________________

Build identifier under test: ______________________________________________

---

## How to use this workbook

1. Record the build identifier and environment once, before the first test.
2. Execute rows in ID order; write the actual result immediately.
3. Set Status to PASS, FAIL, BLOCKED or NOT RUN - never leave it blank.
4. Every FAIL gets a defect ID (DEF-nn) and an evidence ID (EV-...).
5. Copy the counts into the execution summary at the end after each session.
6. Do not change an expected result after execution; if it was wrong, note it in the notes column and log a plan defect.

---

## 1. Unit testing execution record (26–28 Nov 2026)

| Test ID | Unit | Input / condition | Expected result | Actual result | Status | Evidence / defect |
|---|---|---|---|---|---|---|
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
| UT-15 | Admin guard | Non-admin token on PATCH /admin/doctors/{id}/verification | 403; status unchanged |
| UT-16 | Admin guard | Invalid status value ("maybe") | 422; status unchanged |
| UT-17 | PawaPay builder | 5 000 RWF visit | Amount 5000, currency RWF, unique depositId, callback URL present |
| UT-18 | Callback verifier | Unknown deposit identifier | 200 acknowledged, no state change |
| UT-19 | Client validator | Phone with letters | Inline error; submit blocked |
| UT-20 | Client formatter | 5000 RWF | Displays "5,000 RWF" (no decimals) |

## 2. Functional testing execution worksheet (30 Nov – 2 Dec 2026)

| Test ID | Req | Objective | Expected result | Actual result | Status | Evidence / defect |
|---|---|---|---|---|---|---|
| FT-01 | REQ-01 | Patient registers successfully | Account created, unverified; verification screen shown; no auto-login |
| FT-02 | REQ-01 | Duplicate email refused | Clear error "email already registered"; form retained; no second account |
| FT-03 | REQ-01 | Invalid inputs refused | Field-level errors; submission blocked; nothing saved |
| FT-04 | REQ-02 | OTP verification succeeds | Account verified; login allowed; code cannot be reused |
| FT-05 | REQ-02 | Wrong/expired OTP refused | Refused with remaining-attempts message; account stays unverified |
| FT-06 | REQ-03 | Login by each role | Correct home screen per role; session token stored; role menus only |
| FT-07 | REQ-03 | Wrong password refused | 401 message "invalid credentials"; no session; no user enumeration detail |
| FT-08 | REQ-04 | Unverified doctor blocked | Login refused with "verify your email" guidance |
| FT-09 | REQ-05 | Password reset | Old password rejected, new accepted; code single-use |
| FT-10 | REQ-05 | Reset with invalid code | Refused; password unchanged |
| FT-11 | REQ-06 | Doctor registers | Account created *pending*; profile stores specialty, licence, experience, districts |
| FT-12 | REQ-06 | Missing licence refused | Validation error; no account |
| FT-13 | REQ-07 | Pending doctor absent from directory | Doctor not listed |
| FT-14 | REQ-08 | Admin sees pending doctor | New doctor present with submitted credentials |
| FT-15 | REQ-08 | Admin approves doctor | Status becomes *approved*; audit values recorded; no error |
| FT-16 | REQ-09 | Approved doctor appears | Doctor listed with specialty, fee, rating placeholder |
| FT-17 | REQ-08 | Admin suspends doctor | Doctor disappears from directory; cannot accept visits |
| FT-18 | REQ-10 | Specialty filter | Only cardiologists listed; count matches |
| FT-19 | REQ-10 | Filter with no matches | Empty state message, no error |
| FT-20 | REQ-10 | Search by partial name | Doctor found (case-insensitive) |
| FT-21 | REQ-11 | Doctor detail | Bio, fees, languages, slots and reviews rendered; fee matches profile |
| FT-22 | REQ-12 | Create slot | Slot listed once; visible to patients |
| FT-23 | REQ-12 | Past slot refused | Refused with clear message |
| FT-24 | REQ-12 | Overlapping slot refused | Refused; only original slot exists |
| FT-25 | REQ-12 | Delete slot | Slot removed from doctor and patient views |
| FT-26 | REQ-13 | Online toggle | Online state reflected in directory; persists after app restart |
| FT-27 | REQ-12 | Booked slot cannot be deleted | Refused with explanation; visit unaffected |
| FT-28 | REQ-14 | Book a slot | Visit created *pending*; fee equals doctor profile fee; confirmation shown |
| FT-29 | REQ-14 | Fee tampering ignored | Stored fee equals profile fee; response states real fee |
| FT-30 | REQ-15 | Slot reservation | First succeeds; second refused "slot no longer available" |
| FT-31 | REQ-16 | Doctor receives request | Request listed with patient name, slot, fee, address |
| FT-32 | REQ-16 | Doctor accepts | Visit *confirmed*; patient sees status change; notification created |
| FT-33 | REQ-16 | Doctor declines | Visit *declined*; slot released; patient notified with reason |
| FT-34 | REQ-16 | Alternative time proposed | Visit *alternative_proposed*; patient sees proposal |
| FT-35 | REQ-18 | Unapproved doctor cannot accept | 403; visit remains pending |
| FT-36 | REQ-17 | Valid status chain | Each step accepted; timestamps recorded; patient view updates |
| FT-37 | REQ-17 | Invalid transition refused | Refused; status remains completed |
| FT-38 | REQ-17 | Doctor cannot skip states | Refused with allowed-next-state message |
| FT-39 | REQ-19 | Publish consultation | Record published; items stored with dosage/quantity; doctor sees confirmation |
| FT-40 | REQ-19 | Empty consultation refused | Validation error; nothing published |
| FT-41 | REQ-19 | Duplicate publish idempotent | Either 409 "already published" or unchanged record; no duplicate |
| FT-42 | REQ-20 | Patient sees own record | Record and prescriptions visible with doctor name and date |
| FT-43 | REQ-20 | Cross-patient access refused | 403/404; no data leaked |
| FT-44 | REQ-21 | Notifications on events | One notification per event, correct wording, newest first |
| FT-45 | REQ-21 | Mark as read | Read state persists; unread counter decrements |
| FT-46 | REQ-22 | Initiate payment | Payment page shows pending then completed; visit payment status *paid* |
| FT-47 | REQ-22 | Failed payment | Status *failed* with reason code; visit remains unpaid; retry possible |
| FT-48 | REQ-23 | Duplicate callback | Second call acknowledged; state unchanged; one transaction row |
| FT-49 | REQ-23 | Spoofed callback for failed payment | Rejected or ignored; payment stays failed |
| FT-50 | REQ-24 | Admin metrics | Counts of users, doctors, visits, revenue consistent with database |
| FT-51 | REQ-24 | Metrics forbidden to others | 403 |
| FT-52 | REQ-25 | Missing token | 401; no data |
| FT-53 | REQ-25 | Expired token | 401 with re-login guidance; app returns to login |
| FT-54 | REQ-26 | Offline behaviour | Clear network message; no partial record; retry succeeds when online |
| FT-55 | REQ-03 | Logout | Session cleared; protected screens redirect to login |

## 3. Integration testing execution worksheet (3–4 Dec 2026)

| Test ID | Components / interface | Interaction tested | Expected interaction | Actual interaction | Status | Defect |
|---|---|---|---|---|---|---|
| IT-01 | Client authService ↔ POST /auth/register/* | Request mapping, response parsing | Payload field names match API contract; success object mapped to app model |
| IT-02 | Client ↔ API error path | 4xx/5xx propagation | Error body parsed and shown verbatim; no crash, no silent success |
| IT-03 | API ↔ database | Persistence of registration + profile transaction | User row + doctor profile row committed together; no orphan |
| IT-04 | API ↔ SMTP | OTP email dispatch | Message delivered with correct code and expiry wording; API returns emailSent: true |
| IT-05 | API middleware ↔ routers | Bearer token propagation across modules | Each router resolves the correct user; wrong-role token gets 403 |
| IT-06 | API ↔ payment gateway | Deposit creation request/response | Provider returns accepted status and identifier; stored transaction matches request |
| IT-07 | Gateway → API callback | Callback verification and state update | Matching identifier updates payment; unknown identifier ignored; response 2xx so provider stops retrying |
| IT-08 | Client ↔ API ↔ database | Booking writes slot state and visit atomically | Exactly one visit; slot marked booked; list refresh reflects both |
| IT-09 | Serializer ↔ client mapper | Field contract (camelCase, numbers as numbers) | No undefined fields; fees render without coercion errors |
| IT-10 | App navigation ↔ state | Screen-to-screen data handoff | Correct visit loaded; back navigation preserves list state |
| IT-11 | Component unavailable | API stopped while app open | Friendly error; screens remain usable; retry recovers after API restart |
| IT-12 | Database unavailable | Invalid connection string (staging) | 503 with generic message; no stack trace or credentials in response |

## 4. System testing execution worksheet (5–8 Dec 2026)

| Test ID | Requirement / scenario | Actors | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| ST-01 | Doctor onboarding to first booking | Doctor, admin, patient | Register → verify email → admin approves → publish slot → patient finds doctor, books, pays → doctor accepts → visit completes → consultation published → patient sees record |
| ST-02 | Full clinical visit | Doctor, patient | Accepted visit runs through all four execution states; notes, diagnosis, prescription and lab request published; record visible to patient |
| ST-03 | Payment failure and retry | Patient | Failed attempt shows reason; retry succeeds; only one successful transaction recorded |
| ST-04 | Decline and rebook | Patient, doctor | Doctor declines with reason; slot released; patient books another doctor without data inconsistency |
| ST-05 | Administrator control | Admin | Suspending a doctor removes them from the directory and blocks acceptance immediately |
| ST-06 | Multi-country configuration | Patient | Registering in Kenya vs Rwanda shows correct currency, phone prefix and fees |
| ST-07 | Session lifecycle | Any | Login → use app → token expiry → re-login → data intact |

## 5. Non-functional testing record (5–8 Dec 2026)

| Test ID | Quality area | Method / condition | Target | Measured / observed | Status | Evidence |
|---|---|---|---|---|---|---|
| NFT-01 | Performance | 10 sequential requests to GET /doctors from a warm server, measured with curl -w "%{time_total}"; median recorded | Median ≤ 1.5 s excluding cold start |
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

## 6. Regression and retest record (9–10 Dec 2026)

| Regression ID | Change / defect ref | Selected tests | Baseline | Current result | Status | Notes |
|---|---|---|---|---|---|---|
| RT-01 | DEF-01 Router mounting | ST-01, FT-14, FT-16 | Previously failing |
| RT-02 | DEF-02 Missing approval endpoint | FT-14, FT-15, FT-16 | Previously failing |
| RT-03 | DEF-03 Session identity mismatch | FT-06, FT-42, FT-44, ST-07 | Previously failing |
| RT-04 | DEF-04 Doctor not created in client store | FT-11, FT-13, FT-14 | Previously failing |
| RT-05 | Automated lifecycle suite | backend/tests/e2e_flow.py (26 checks) | Last run 26/26 PASS |
| RT-06 | Any fixed defect | Original failing test + 2 neighbouring tests | Per defect record |

## 7. White-box coverage record

| Unit group | Coverage type | Total items | Covered | Coverage % | Uncovered items / explanation |
|---|---|---|---|---|---|
| Auth & security | Statements |  |  |  |  |
| Auth & security | Branches |  |  |  |  |
| Visit & slot rules | Branches |  |  |  |  |
| Serializers | Statements |  |  |  |  |
| Payments | Branches |  |  |  |  |
| Client validators | Conditions |  |  |  |  |

Coverage (%) = (applicable items executed / total applicable items) x 100.

## 8. Defect log

| Defect ID | Title | Test case | Severity | Priority | Status | Fix reference | Retest date | Regression |
|---|---|---|---|---|---|---|---|---|
| DEF-01 | API routers not mounted; doctor/patient/admin endpoints returned 404 | ST-01, FT-14, FT-16 | Critical | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-01 |
| DEF-02 | No admin approval endpoint, so registered doctors could never be listed | FT-14, FT-15, FT-16 | Critical | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-02 |
| DEF-03 | Client looked up session data with an identifier different from the backend user id | FT-06, FT-42, FT-44 | Major | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-03 |
| DEF-04 | Registered doctor did not appear in the in-app verification queue or directory | FT-11, FT-13, FT-14 | Major | High | Fixed / retested PASS |  | 24 Nov 2026 | RT-04 |
|  |  |  |  |  |  |  |  |  |

Add one row per new defect. Copy the full description into the defect report form (Appendix E of the plan).

## 9. Evidence index

| Evidence ID | Related test / defect | Type | Description | File name | Date |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## 10. Test execution summary

| Activity | Planned | Passed | Failed | Blocked | Not run |
|---|---|---|---|---|---|
| Unit testing | 20 |  |  |  |  |
| Functional testing | 55 |  |  |  |  |
| Integration testing | 12 |  |  |  |  |
| System + non-functional | 21 |  |  |  |  |
| Regression testing | 6 |  |  |  |  |
| **TOTAL** | **114** |  |  |  |  |

Pass rate (%) = Passed / (Passed + Failed) x 100. State the denominator. Blocked and not-run tests are reported separately.

## 11. Session log

| Date | Phase | Build | Tests executed | Passed | Failed | Blocked | Notes / deviations |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## 12. Sign-off

Tester: ______________________  Date: ____________

Reviewed by (lecturer): ______________________  Date: ____________
