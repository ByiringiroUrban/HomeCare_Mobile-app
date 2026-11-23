"""Administrator operations: review and verify doctor credentials."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_admin
from app.db.session import get_db
from app.models.user import DoctorProfile, DoctorVerificationStatus, User
from app.schemas.requests import VerificationUpdateRequest
from app.services.doctors import doctor_out, doctor_query
from app.services.domain_ops import notify

router = APIRouter()

STATUS_BY_NAME = {
    "pending": DoctorVerificationStatus.PENDING,
    "approved": DoctorVerificationStatus.APPROVED,
    "suspended": DoctorVerificationStatus.SUSPENDED,
}


@router.get("/doctors")
async def list_doctors_for_review(
    verification_status: Optional[str] = Query(None, alias="status"),
    _: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Every doctor profile, newest pending first, for the verification queue."""
    profiles = (await db.execute(doctor_query())).scalars().all()
    out = []
    for profile in profiles:
        if not profile.user:
            continue
        record = await doctor_out(db, profile)
        if verification_status and record["verificationStatus"] != verification_status:
            continue
        out.append(record)
    out.sort(key=lambda d: (d["verificationStatus"] != "pending", d["name"]))
    return out


@router.patch("/doctors/{doctor_id}/verification")
async def set_doctor_verification(
    doctor_id: str,
    payload: VerificationUpdateRequest,
    _: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve, suspend or reset a doctor's practice privileges."""
    profile = (
        await db.execute(doctor_query().where(DoctorProfile.user_id == doctor_id))
    ).scalars().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found.")

    profile.verification_status = STATUS_BY_NAME[payload.status]
    await db.commit()

    notify(
        db,
        doctor_id,
        "Credential review updated",
        f"Your professional credentials are now {payload.status}."
        + (f" {payload.note}" if payload.note else ""),
        type_="verification",
        reference_id=doctor_id,
    )
    await db.commit()

    refreshed = (
        await db.execute(doctor_query().where(DoctorProfile.user_id == doctor_id))
    ).scalars().first()
    return await doctor_out(db, refreshed)


@router.get("/metrics")
async def platform_metrics(
    _: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    """Counts used by the admin console header."""
    profiles = (await db.execute(select(DoctorProfile))).scalars().all()
    counts = {"pending": 0, "approved": 0, "suspended": 0}
    for profile in profiles:
        counts[getattr(profile.verification_status, "value", profile.verification_status)] += 1
    return {
        "totalDoctors": len(profiles),
        "pendingVerifications": counts["pending"],
        "approvedDoctors": counts["approved"],
        "suspendedDoctors": counts["suspended"],
    }
