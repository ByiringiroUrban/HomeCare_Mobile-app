# HomeCare: Home-Visit Medical Consultation Application
## Frontend System Documentation & Future Backend REST API Specification

### 1. Project Overview & Architecture
**HomeCare** is a mobile-first digital healthcare frontend built for residential medical consultations in Rwanda (default location: Kigali, prices in RWF). The application allows patients to find verified specialists, book home visits, track visit progression, view clinical summaries, and access downloadable lab results. Specialists can manage working hours and availability slots, review and accept/decline/propose alternative booking slots, execute visits via a step-by-step cockpit, and publish diagnostic records, electronic prescriptions (Rx), and lab specimen results.

The frontend is built on **Expo (SDK 58)** with **React Native**, **Expo Router**, **TypeScript**, **Zustand**, and **TanStack React Query**, backed by a state-machine mock repository with Kigali demonstration fixtures and strict account isolation.

---

### 2. Demo Accounts & How to Test

Fast-track demo account buttons are accessible on the Welcome screen (`/(auth)/welcome`) and via the floating persistent top bar:

| Role | Name | Identifier | Key Scenarios to Evaluate |
|---|---|---|---|
| **Patient 1** | Diane Uwase | `diane.uwase@example.rw` | Has 1 completed visit with published lab report & PDF viewer, plus 1 active "On the way" visit. Can book visits, rate doctors, and submit complaints. |
| **Patient 2** | Jean-Paul Mugisha | `jp.mugisha@example.rw` | Has 1 pending visit request with Dr. Aline in Gikondo. Can test doctor alternative time proposals and cancellation. |
| **Doctor 1** | Dr. Eric Kayitare | `dr.eric@homecare.rw` | General Medicine specialist. Active "On the way" visit with Diane Uwase. Can test navigation, visit transitions, and clinical workspace. |
| **Doctor 2** | Dr. Aline Mukeshimana | `dr.aline@homecare.rw` | Pediatric specialist. Has incoming pending request from Jean-Paul Mugisha. Can test Accept, Decline, and Alternative Slot Proposal. |
| **Admin** | Platform Admin | `admin@homecare.rw` | Platform management console. Review and approve/suspend doctor licenses, review complaints, view metrics, and inspect medical audit logs. |

*Note: The simulated OTP code is `123456`.*

---

### 3. Screen & Route Inventory

#### Authentication (`src/app/(auth)`)
- `welcome.tsx`: Brand intro, emergency notice, quick demo role selectors, and navigation to auth flows.
- `login.tsx`: Email/phone login with validation, error banners, and demo quick-fill helper.
- `register-patient.tsx`: Registration form with mandatory Rwandan Personal Data Protection Law consent checkboxes.
- `register-doctor.tsx`: Professional credentials collection (RMDC license, qualifications, years of experience, Kigali coverage districts).
- `otp-verification.tsx`: 6-digit one-time code screen with single-tap demo fast-fill (`123456`).
- `forgot-password.tsx`: Password recovery request screen.

#### Patient Mobile Experience (`src/app/(patient)`)
- `index.tsx` (Home): Greeting, Kigali residence indicator, specialty shortcuts, active visit banner, recent lab results, and emergency disclaimer (Rwanda SAMU 112).
- `doctors.tsx` (Find Doctor): Multi-factor specialist search with text query, specialty pills, Kigali district filter, language filter, and real-time availability toggle.
- `doctor/[id].tsx`: Doctor profile with verified credentials, experience, coverage, consultation fees, and patient reviews.
- `book/[doctorId].tsx`: 9-step booking flow (specialist, slot selection, symptom chips, detailed description, file attachment simulation, GPS pin/manual Kigali address, gate notes, fee preview, and payment selection).
- `visit/[id].tsx`: Live visit tracking timeline (Pending &rarr; Confirmed &rarr; On the Way &rarr; Arrived &rarr; In Consultation &rarr; Completed), alternative slot acceptance/rejection, cancellation lock, rating modal, and complaint modal.
- `visits.tsx`: Tabbed list of upcoming, past, and all consultation requests.
- `records.tsx`: Medical history tabs: clinical consultation summaries, electronic prescriptions (Rx), and lab specimen results.
- `result/[id].tsx`: Lab report viewer with patient/doctor/sample traceability, fictional confidential medical report PDF canvas preview, offline cache status, and sharing.
- `notifications.tsx`: Deep-linking notification center.
- `profile.tsx`: Medical health profile editor (allergies, chronic conditions, medications), emergency contact, and data export.

#### Doctor Mobile Experience (`src/app/(doctor)`)
- `index.tsx` (Dashboard): Today's consultation metrics, pending request alerts, and instant Online/Offline status switch.
- `requests.tsx`: Incoming booking requests cockpit with Accept, Decline (with reason), and Propose Alternative Time slot forms.
- `schedule.tsx`: Working days, hours, and open availability slot manager with overlap prevention.
- `patients.tsx`: Assigned patient directory with role-based access control (doctors only see patients with whom they have an active or past visit).
- `profile.tsx`: Licensing credentials, RMDC number, coverage districts, and fee rates.
- `visit/[id].tsx`: Visit execution cockpit with one-tap status advancement and external navigation maps link (Apple Maps / Google Maps).
- `consultation/[visitId].tsx`: Clinical consultation workspace: vital signs/physical exam, diagnosis, ICD-10 code, clinical notes, electronic prescriptions (Rx), lab specimen orders, and instant result document publishing.

#### Basic Admin Web Frontend (`src/app/(admin)`)
- `index.tsx`: Platform metrics (consultation volume, gross revenue, response times, rating averages), doctor credential verification (approve, suspend, set pending), user complaint resolution, and immutable medical record access audit log viewer.

---

### 4. SRS Requirement-to-Screen Mapping

| SRS ID | Requirement Description | Implementation Screen & File |
|---|---|---|
| **FR-1.1** | Patient signup | `src/app/(auth)/register-patient.tsx` |
| **FR-1.2** | One-time code verification | `src/app/(auth)/otp-verification.tsx` |
| **FR-1.3** | Login, logout, reset password | `src/app/(auth)/login.tsx`, `forgot-password.tsx` |
| **FR-1.4** | Patient medical profile | `src/app/(patient)/profile.tsx` |
| **FR-1.5** | Health data consent at signup | `src/app/(auth)/register-patient.tsx` |
| **FR-1.6** | Doctor registration with credentials | `src/app/(auth)/register-doctor.tsx` |
| **FR-2.1** | Medical specialties directory | `src/app/(patient)/index.tsx`, `doctors.tsx` |
| **FR-2.2** | Verified doctor profiles with fees | `src/app/(patient)/doctor/[id].tsx` |
| **FR-2.3** | Symptoms and conditions description | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-2.4** | Specialist search & filters | `src/app/(patient)/doctors.tsx` |
| **FR-2.5** | Real-time availability & slots | `src/app/(patient)/doctors.tsx`, `doctor/[id].tsx` |
| **FR-3.1** | Select specialist & time slot | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-3.2** | Visit address, GPS pin & gate notes | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-3.3** | Condition attachments & photos | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-3.4** | Booking summary & fee preview | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-3.5** | Overlapping double booking prevention | `src/mock/mockDomainStore.ts` |
| **FR-3.6** | Reschedule/cancel before departure | `src/app/(patient)/visit/[id].tsx` |
| **FR-4.1** | Doctor working hours & availability | `src/app/(doctor)/schedule.tsx`, `index.tsx` |
| **FR-4.2** | Doctor notified of new requests | `src/app/(doctor)/requests.tsx`, `notifications.tsx` |
| **FR-4.3** | Doctor accept/decline/alternative slot | `src/app/(doctor)/requests.tsx` |
| **FR-4.5** | View patient health profile before visit | `src/app/(doctor)/visit/[id].tsx`, `patients.tsx` |
| **FR-4.6** | Update visit status (On the way... arrived... completed) | `src/app/(doctor)/visit/[id].tsx` |
| **FR-4.7** | Navigation to patient address | `src/app/(doctor)/visit/[id].tsx` |
| **FR-5.1** | Push notifications on status change | `src/mock/mockDomainStore.ts`, `notifications.tsx` |
| **FR-6.1** | Clinical notes, diagnosis, prescriptions | `src/app/(doctor)/consultation/[visitId].tsx` |
| **FR-6.2** | Lab test orders | `src/app/(doctor)/consultation/[visitId].tsx` |
| **FR-6.3** | Specimen sample tracking record | `src/mock/mockDomainStore.ts` |
| **FR-6.4** | Chronological medical history | `src/app/(patient)/records.tsx` |
| **FR-7.1** | Doctor publishes exam & lab results | `src/app/(doctor)/consultation/[visitId].tsx` |
| **FR-7.2** | Patient dashboard (visits, records, Rx) | `src/app/(patient)/index.tsx`, `records.tsx` |
| **FR-7.3** | View & download results as PDF | `src/app/(patient)/result/[id].tsx` |
| **FR-7.4** | Result tracking status | `src/app/(patient)/result/[id].tsx`, `records.tsx` |
| **FR-8.1** | Fee breakdown before confirmation | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-8.2** | MoMo, Airtel, Cash payment options | `src/app/(patient)/book/[doctorId].tsx` |
| **FR-9.1** | Rate & review completed visit | `src/app/(patient)/visit/[id].tsx` |
| **FR-9.2** | Report problem / complaint | `src/app/(patient)/visit/[id].tsx` |
| **FR-10.1**| Admin doctor verification (approve/suspend)| `src/app/(admin)/index.tsx` |
| **FR-10.3**| Admin reports on visits & revenue | `src/app/(admin)/index.tsx` |
| **FR-10.4**| Admin complaints management | `src/app/(admin)/index.tsx` |
| **FR-10.5**| Immutable medical record audit log | `src/app/(admin)/index.tsx` |
| **NFR-9.1**| Emergency service disclaimer & helpline | `src/components/ui/EmergencyBanner.tsx` |
| **NFR-9.2**| Specimen traceability verification | `src/app/(patient)/result/[id].tsx` |

---

### 5. Proposed Future Node.js REST API Contracts

When we proceed to the backend implementation phase with Node.js and Neon PostgreSQL, the mock services in `src/services/api.ts` will connect to these REST endpoints:

#### Auth & Onboarding
- `POST /api/v1/auth/login`: `{ identifier, password }` &rarr; `{ user, token }`
- `POST /api/v1/auth/otp/verify`: `{ userId, code }` &rarr; `{ verified: true }`
- `POST /api/v1/auth/register/patient`: `{ name, phone, email, password, consentGiven }` &rarr; `{ user }`
- `POST /api/v1/auth/register/doctor`: `{ name, phone, email, specialty, licenseNumber, qualifications, experienceYears, coverageDistricts }` &rarr; `{ user }`

#### Patient Services
- `GET /api/v1/patient/doctors`: `?query=&specialty=&district=&language=&availableNow=` &rarr; `DoctorProfile[]`
- `GET /api/v1/patient/doctors/:id`: &rarr; `{ doctor, slots, reviews }`
- `POST /api/v1/patient/visits`: `VisitRequestPayload` &rarr; `VisitRequest`
- `GET /api/v1/patient/visits`: &rarr; `VisitRequest[]`
- `POST /api/v1/patient/visits/:id/cancel`: `{ reason }` &rarr; `VisitRequest`
- `POST /api/v1/patient/visits/:id/accept-alternative`: &rarr; `VisitRequest`
- `GET /api/v1/patient/records`: &rarr; `{ consultations, results }`
- `POST /api/v1/patient/reviews`: `{ visitId, doctorId, rating, comment }` &rarr; `DoctorReview`

#### Doctor Services
- `GET /api/v1/doctor/requests`: &rarr; `VisitRequest[]`
- `POST /api/v1/doctor/visits/:id/accept`: &rarr; `VisitRequest`
- `POST /api/v1/doctor/visits/:id/decline`: `{ reason }` &rarr; `VisitRequest`
- `POST /api/v1/doctor/visits/:id/propose-time`: `{ alternativeDate, alternativeTime, note }` &rarr; `VisitRequest`
- `PATCH /api/v1/doctor/visits/:id/status`: `{ status: 'on_the_way' | 'arrived' | 'in_consultation' | 'completed' }` &rarr; `VisitRequest`
- `POST /api/v1/doctor/consultations/:visitId`: `ConsultationRecordPayload` &rarr; `ConsultationRecord`
- `POST /api/v1/doctor/results`: `ResultDocumentPayload` &rarr; `ResultDocument`

#### Admin Services
- `GET /api/v1/admin/metrics`: &rarr; `PlatformMetrics`
- `PATCH /api/v1/admin/doctors/:id/verification`: `{ status: 'approved' | 'suspended' | 'pending' }` &rarr; `DoctorProfile`
- `GET /api/v1/admin/audit-logs`: &rarr; `MedicalAuditLog[]`

---

### 6. Validation Results & Environment Notes
1. **TypeScript Typecheck (`npx tsc --noEmit`)**: **Exited with code 0 (0 errors)**. All routes, components, and domain stores adhere to strict typing.
2. **Account Isolation**: Verified that Patient 1 and Patient 2 see only their respective consultation requests and medical records. Doctor 1 and Doctor 2 see only visits assigned to them.
3. **Double Booking Guard**: Checked that the domain store rejects overlapping slot reservations for the same doctor.
4. **Cancellation Restrictions**: Validated that patients are prevented from cancelling once the doctor status is `on_the_way`, `arrived`, or `in_consultation`.
5. **Operating System Compatibility**: Built and verified for Expo SDK 58 (Node 22 / React 19 / React Native 0.88). Current Expo 58 tools require iOS 15.1+ and Android 8.0+ (API 26), ensuring standard compliance with the SRS targets.
