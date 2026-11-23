"""End-to-end API check for the HomeCare backend.

Exercises the full doctor lifecycle - register -> admin approval -> public
listing -> availability slots -> patient booking -> doctor acceptance ->
visit status flow -> consultation publish -> patient records - against a
running server and the configured database, then deletes everything it created.

Usage (server must be running):
    backend/venv/Scripts/python.exe tests/e2e_flow.py --base http://127.0.0.1:8030/api/v1
"""
import argparse
import asyncio
import sys
import uuid
from datetime import date, timedelta
from pathlib import Path

# Allow running as `python tests/e2e_flow.py` from the backend directory
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from sqlalchemy import delete, select, update

from app.db.session import AsyncSessionLocal, engine
from app.models.domain import AvailabilitySlot, ConsultationRecord, Notification, Visit
from app.models.user import DoctorProfile, User

PATIENT = ("diane.uwase@example.rw", "Password123!")
ADMIN = ("admin@homecare.rw", "AdminHomeCare2026!")
PASSWORD = "Password123!"

results: list[tuple[bool, str, str]] = []


def check(name: str, passed: bool, detail: str = "") -> bool:
    results.append((passed, name, detail))
    print(f"{'PASS' if passed else 'FAIL'}  {name}" + (f"  [{detail}]" if detail and not passed else ""))
    return passed


def login(client: httpx.Client, base: str, identifier: str, password: str):
    r = client.post(f"{base}/auth/login", json={"identifier": identifier, "password": password})
    token = r.json().get("accessToken") if r.status_code == 200 else None
    return token, r


async def mark_verified(email: str) -> None:
    """Test harness only: skip the emailed OTP so the flow can run unattended."""
    async with AsyncSessionLocal() as db:
        await db.execute(update(User).where(User.email == email).values(is_verified=True))
        await db.commit()
    # Each asyncio.run() gets a fresh loop, so release the pool before it closes
    await engine.dispose()


async def cleanup(email: str) -> None:
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalars().first()
        if not user:
            return
        visits = (await db.execute(select(Visit.id).where(Visit.doctor_id == user.id))).scalars().all()
        if visits:
            await db.execute(delete(ConsultationRecord).where(ConsultationRecord.visit_id.in_(visits)))
            await db.execute(delete(Notification).where(Notification.reference_id.in_(visits)))
            await db.execute(delete(Visit).where(Visit.id.in_(visits)))
        await db.execute(delete(AvailabilitySlot).where(AvailabilitySlot.doctor_id == user.id))
        await db.execute(delete(Notification).where(Notification.recipient_user_id == user.id))
        await db.execute(delete(DoctorProfile).where(DoctorProfile.user_id == user.id))
        await db.execute(delete(User).where(User.id == user.id))
        await db.commit()
    await engine.dispose()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8030/api/v1")
    args = parser.parse_args()
    base = args.base.rstrip("/")

    suffix = uuid.uuid4().hex[:8]
    email = f"e2e.doctor.{suffix}@homecare.test"
    license_number = f"E2E/{suffix}"

    with httpx.Client(timeout=60) as client:
        # ---------- logins ----------
        admin_token, admin_res = login(client, base, *ADMIN)
        check("admin login", bool(admin_token), f"HTTP {admin_res.status_code} {admin_res.text[:120]}")
        patient_token, patient_res = login(client, base, *PATIENT)
        check("patient login", bool(patient_token), f"HTTP {patient_res.status_code}")
        if not admin_token or not patient_token:
            print("\nCannot continue without admin + patient accounts.")
            return 1

        AH = {"Authorization": f"Bearer {admin_token}"}
        PH = {"Authorization": f"Bearer {patient_token}"}

        # ---------- doctor registration ----------
        reg = client.post(
            f"{base}/auth/register/doctor",
            json={
                "name": f"Dr. E2E {suffix}",
                "email": email,
                "phone": f"+25078{suffix[:7].replace('a', '1').replace('b', '2')}",
                "password": PASSWORD,
                "specialty": "General Medicine",
                "licenseNumber": license_number,
                "experienceYears": 6,
                "qualifications": ["MBChB (E2E)"],
                "coverageDistricts": ["Gasabo", "Kicukiro"],
                "country": "RW",
            },
        )
        registered = reg.status_code == 201
        check("doctor registers", registered, f"HTTP {reg.status_code} {reg.text[:160]}")
        if not registered:
            return 1
        doctor = reg.json()["user"]
        doctor_id = doctor["id"]
        print(f"      registered doctor {doctor_id}")

        # Unverified doctor must not be able to log in yet
        early_token, early_res = login(client, base, email, PASSWORD)
        check("unverified doctor login is blocked", early_res.status_code == 403 and not early_token,
              f"HTTP {early_res.status_code}")

        asyncio.run(mark_verified(email))
        doctor_token, doctor_res = login(client, base, email, PASSWORD)
        check("doctor login after verification", bool(doctor_token), f"HTTP {doctor_res.status_code} {doctor_res.text[:120]}")
        if not doctor_token:
            asyncio.run(cleanup(email))
            return 1
        DH = {"Authorization": f"Bearer {doctor_token}"}

        # ---------- not visible before approval ----------
        listing = client.get(f"{base}/doctors", headers=PH).json()
        check("pending doctor hidden from patients",
              all(d["userId"] != doctor_id for d in listing), f"{len(listing)} doctors listed")

        # ---------- admin approval ----------
        queue = client.get(f"{base}/admin/doctors", headers=AH)
        check("admin verification queue reachable", queue.status_code == 200, f"HTTP {queue.status_code}")
        pending = [d for d in queue.json() if d["verificationStatus"] == "pending"]
        check("new doctor appears in admin queue", any(d["userId"] == doctor_id for d in pending),
              f"{len(pending)} pending")

        approve = client.patch(
            f"{base}/admin/doctors/{doctor_id}/verification", headers=AH, json={"status": "approved"}
        )
        check("admin approves doctor",
              approve.status_code == 200 and approve.json().get("verificationStatus") == "approved",
              f"HTTP {approve.status_code} {approve.text[:120]}")

        # ---------- doctor visible to patients ----------
        listing = client.get(f"{base}/doctors", headers=PH).json()
        found = next((d for d in listing if d["userId"] == doctor_id), None)
        check("approved doctor appears in patient directory", found is not None, f"{len(listing)} listed")
        check("specialty filter works",
              any(d["userId"] == doctor_id for d in client.get(
                  f"{base}/doctors", headers=PH, params={"specialty": "General Medicine"}).json()))

        # ---------- availability ----------
        slot_date = (date.today() + timedelta(days=3)).isoformat()
        slot_res = client.post(
            f"{base}/doctor/slots", headers=DH,
            json={"date": slot_date, "startTime": "09:00", "endTime": "09:30"},
        )
        check("doctor creates availability slot", slot_res.status_code == 201,
              f"HTTP {slot_res.status_code} {slot_res.text[:120]}")
        slot = slot_res.json() if slot_res.status_code == 201 else {}
        slots = client.get(f"{base}/doctor/slots", headers=DH).json()
        check("doctor lists own slots", any(s["id"] == slot.get("id") for s in slots), f"{len(slots)} slots")

        details = client.get(f"{base}/doctors/{doctor_id}", headers=PH).json()
        check("patient sees doctor with bookable slot",
              any(s["id"] == slot.get("id") for s in details.get("slots", [])),
              f"{len(details.get('slots', []))} slots")

        # ---------- booking ----------
        visit_res = client.post(
            f"{base}/patient/visits", headers=PH,
            json={
                "doctorId": doctor_id,
                "slotId": slot.get("id"),
                "scheduledDate": slot_date,
                "scheduledTime": "09:00",
                "conditionDescription": "E2E test: persistent cough for three days",
                "commonSymptoms": ["Persistent Cough"],
                "visitAddress": "KG 11 Ave, House 7",
                "district": "Gasabo",
                "paymentMethod": "momo",
            },
        )
        check("patient books visit", visit_res.status_code == 201,
              f"HTTP {visit_res.status_code} {visit_res.text[:160]}")
        visit = visit_res.json() if visit_res.status_code == 201 else {}
        visit_id = visit.get("id", "")
        check("visit fee captured from doctor profile", visit.get("totalFeeRwf", 0) > 0,
              f"total={visit.get('totalFeeRwf')}")

        # ---------- doctor side ----------
        requests_list = client.get(f"{base}/doctor/visits", headers=DH).json()
        check("doctor receives the visit request", any(v["id"] == visit_id for v in requests_list),
              f"{len(requests_list)} visits")

        accept = client.post(f"{base}/doctor/visits/{visit_id}/accept", headers=DH)
        check("doctor accepts visit", accept.status_code == 200 and accept.json().get("status") == "confirmed",
              f"HTTP {accept.status_code} {accept.text[:120]}")

        for next_status in ("on_the_way", "arrived", "in_consultation", "completed"):
            r = client.post(f"{base}/doctor/visits/{visit_id}/status",
                            headers=DH, json={"status": next_status})
            check(f"status -> {next_status}", r.status_code == 200 and r.json().get("status") == next_status,
                  f"HTTP {r.status_code} {r.text[:120]}")

        # ---------- consultation ----------
        consult = client.put(
            f"{base}/doctor/visits/{visit_id}/consultation", headers=DH,
            json={
                "consultationNotes": "E2E: chest clear, mild pharyngitis.",
                "physicalExamination": "Temp 37.4C, chest clear",
                "diagnosis": "Acute pharyngitis",
                "prescriptions": [{
                    "medicationName": "Amoxicillin",
                    "dosage": "500mg",
                    "frequency": "Three times daily",
                    "durationDays": 5,
                    "instructions": "Take after meals",
                }],
                "recommendations": ["Warm fluids", "Rest"],
                "publish": True,
            },
        )
        check("doctor publishes consultation", consult.status_code == 200 and consult.json().get("isDraft") is False,
              f"HTTP {consult.status_code} {consult.text[:160]}")

        # ---------- patient side ----------
        records = client.get(f"{base}/patient/records", headers=PH).json()
        record = next((c for c in records.get("consultations", []) if c["visitId"] == visit_id), None)
        check("patient sees published record", record is not None,
              f"{len(records.get('consultations', []))} records")
        check("prescription visible to patient",
              bool(record and record.get("prescriptions") and
                   record["prescriptions"][0].get("medicationName") == "Amoxicillin"))

        notifications = client.get(f"{base}/notifications", headers=PH).json()
        check("patient received visit notifications", len(notifications) > 0, f"{len(notifications)} notifications")

        # ---------- cleanup ----------
    asyncio.run(cleanup(email))
    print("      test data removed")

    failed = [r for r in results if not r[0]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
