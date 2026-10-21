# HomeCare: Home-Visit Medical Consultation Platform
## SRS Architecture, Screen Inventory & Frontend Blueprint

### 1. Executive Summary & Product Scope
**HomeCare** is a mobile-first digital healthcare platform designed for residential medical consultations in Rwanda (default location: Kigali, prices in RWF). The platform connects patients with verified medical specialists who travel to the patient's home, conduct physical examinations, order/collect laboratory samples, and securely deliver medical records and lab results.

---

### 2. User Roles & Primary Journeys

1. **Patient Journey**:
   - Welcome & Onboarding -> Consent to Health Data Processing -> Registration/Login & OTP Verification.
   - Profile setup (demographics, emergency contact, allergies, chronic conditions, medications).
   - Specialist Discovery (specialty catalog, search, multi-factor filters: fee, rating, language, distance, availability).
   - 9-Step Booking Request Flow (specialist & slot selection, symptoms/condition description, photo/doc attachments, GPS pin or manual Kigali address + gate/landmark instructions, fee breakdown preview).
   - Visit lifecycle monitoring (Pending -> Confirmed / Alternative Proposed -> On the Way -> Arrived -> In Consultation -> Completed).
   - Post-visit records access: Consultation notes, diagnosis, prescriptions, sample tracking status, PDF result download & offline storage, doctor rating & complaints.

2. **Doctor Journey**:
   - Registration with credentials (license number, qualifications, years of experience, coverage districts).
   - Administrator verification gate (Pending -> Approved -> Suspended states).
   - Availability Manager (weekly hours, time slots, buffer times, online/offline quick toggle).
   - Request Management (incoming patient bookings, condition & address review, accept, decline with reason, or propose alternative slot).
   - Visit Execution (status timeline transitions, external navigation launch to patient residence).
   - Consultation Workspace (clinical notes, ICD-10 diagnosis, electronic prescriptions, lab test orders, specimen sample collection logs, follow-up scheduling, result upload/publishing).

3. **Administrator Journey (Web Console)**:
   - Verification of doctor licenses and approval/rejection/suspension.
   - Platform catalog management (specialties, consultation fees, travel zone fees, cancellation policies).
   - Quality assurance & complaints handling.
   - Financial, response time, and visit analytics dashboards.
   - Immutable medical record access audit log viewer.

---

### 3. Screen Inventory & Route Map

| Category | Route / Screen | Purpose & SRS Mapping |
|---|---|---|
| **Auth** | `src/app/(auth)/welcome.tsx` | App introduction, emergency warning, demo profile selector (FR-1.1, NFR-9.1) |
| | `src/app/(auth)/login.tsx` | Login with email/phone & password, demo credentials quick-fill (FR-1.3) |
| | `src/app/(auth)/register-patient.tsx` | Patient signup + Terms & Health data consent checkboxes (FR-1.1, FR-1.5) |
| | `src/app/(auth)/register-doctor.tsx` | Doctor registration with license & coverage area (FR-1.6) |
| | `src/app/(auth)/otp-verification.tsx` | Simulated 6-digit OTP code verification (FR-1.2) |
| | `src/app/(auth)/forgot-password.tsx` | Password reset simulation with OTP (FR-1.3) |
| **Patient Tabs** | `src/app/(patient)/index.tsx` (Home) | Greeting, Kigali address banner, specialty shortcuts, upcoming visit card, recent results, emergency disclaimer (FR-2.1, FR-7.2, NFR-9.1) |
| | `src/app/(patient)/doctors.tsx` (Find Doctor) | Specialty chips, doctor search, rating/fee/language/availability filter sheet, verified doctor cards (FR-2.2, FR-2.4, FR-2.5) |
| | `src/app/(patient)/visits.tsx` (Visits) | Upcoming, pending, completed, and cancelled visits tabs with live state indicators (FR-3.6, FR-4.6) |
| | `src/app/(patient)/records.tsx` (Records) | Chronological consultation summaries, electronic prescriptions, lab samples & PDF result documents (FR-6.4, FR-7.2, FR-7.3, FR-7.4) |
| | `src/app/(patient)/profile.tsx` (Profile) | Medical profile editor (allergies, conditions, medications, emergency contact), data export, theme, demo reset (FR-1.4, NFR-3.2) |
| **Patient Sub-flows** | `src/app/(patient)/doctor/[id].tsx` | Doctor detailed profile, credentials, reviews, available slots (FR-2.2, FR-2.5) |
| | `src/app/(patient)/book/[doctorId].tsx` | Comprehensive 9-step booking flow with fees, symptoms, photos, GPS/manual address (FR-3.1, FR-3.2, FR-3.3, FR-3.4, FR-8.1) |
| | `src/app/(patient)/visit/[id].tsx` | Detailed visit timeline, doctor status, reschedule/cancel, accept alternative time, rate visit, report issue (FR-3.6, FR-4.3, FR-9.1, FR-9.2) |
| | `src/app/(patient)/notifications.tsx` | Push notification simulation center with direct deep-links (FR-5.1, FR-5.2, FR-5.4) |
| | `src/app/(patient)/result/[id].tsx` | Lab result details, traceability metadata, fictional PDF viewer, share & offline cache status (FR-7.3, NFR-8.2, NFR-9.2) |
| **Doctor Tabs** | `src/app/(doctor)/index.tsx` (Dashboard) | Today's appointments, pending visit request alerts, online/offline status switch, quick metrics (FR-4.1, FR-4.2) |
| | `src/app/(doctor)/requests.tsx` (Requests) | Incoming patient requests, patient condition review, accept, decline modal, propose alternative slot (FR-4.2, FR-4.3) |
| | `src/app/(doctor)/schedule.tsx` (Schedule) | Availability schedule builder, working days, slots manager, unavailable buffer blocking (FR-4.1) |
| | `src/app/(doctor)/patients.tsx` (Patients) | Assigned patient directory, medical history access (FR-4.5, NFR-2.3) |
| | `src/app/(doctor)/profile.tsx` (Profile) | Verification status badge (approved/pending/suspended), license details, coverage districts, logout (FR-1.6, FR-10.1) |
| **Doctor Sub-flows** | `src/app/(doctor)/visit/[id].tsx` | Visit execution cockpit: On the way -> Arrived -> In consultation -> Complete, navigation launcher (FR-4.6, FR-4.7) |
| | `src/app/(doctor)/consultation/[visitId].tsx` | Clinical workspace: notes, diagnosis, Rx prescription, lab tests required, specimen collection, follow-up, result publication (FR-6.1, FR-6.2, FR-6.3, FR-6.5, FR-7.1) |
| **Admin Console (Web/Responsive)** | `src/app/(admin)/index.tsx` | Platform overview: active visits, gross revenue, response times, rating averages, pending doctor verifications (FR-10.3) |
| | `src/app/(admin)/doctors.tsx` | Doctor credential verification: approve, suspend, remove (FR-10.1) |
| | `src/app/(admin)/config.tsx` | Service configuration: specialties, baseline fees, travel zone rates, cancellation policies (FR-10.2) |
| | `src/app/(admin)/complaints.tsx` | Patient & doctor dispute and complaint resolution (FR-10.4) |
| | `src/app/(admin)/audit.tsx` | Immutable access audit log for health record compliance (FR-10.5) |
