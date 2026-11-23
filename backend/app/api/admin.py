"""Administrator operations: credential review, complaints, audit trail and platform metrics."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_admin
from app.db.session import get_db
from app.models.domain import AuditLog, Complaint, Review, Visit
from app.models.user import DoctorProfile, DoctorVerificationStatus, User
from app.schemas.requests import ComplaintResolveRequest, VerificationUpdateRequest
from app.services.doctors import doctor_out, doctor_query
from app.services.domain_ops import notify, visit_query
from app.services.serializers import audit_out, complaint_out, visit_out

router = APIRouter()

STATUS_BY_NAME = {
    "pending": DoctorVerificationStatus.PENDING,
    "approved": DoctorVerificationStatus.APPROVED,
    "suspended": DoctorVerificationStatus.SUSPENDED,
}

ACTIVE_VISIT_STATUSES = ("confirmed", "on_the_way", "arrived", "in_consultation")


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
    admin: User = Depends(get_admin),
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


@router.get("/visits")
async def list_all_visits(_: User = Depends(get_admin), db: AsyncSession = Depends(get_db)):
    """Every visit on the platform, newest first, for operations oversight."""
    visits = (
        await db.execute(visit_query().order_by(Visit.created_at.desc()))
    ).scalars().all()
    return [visit_out(v) for v in visits]


@router.get("/complaints")
async def list_complaints(_: User = Depends(get_admin), db: AsyncSession = Depends(get_db)):
    complaints = (
        await db.execute(select(Complaint).order_by(Complaint.created_at.desc()))
    ).scalars().all()
    reporters = (
        dict(
            (
                await db.execute(
                    select(User.id, User.name).where(
                        User.id.in_([c.reporter_user_id for c in complaints])
                    )
                )
            ).all()
        )
        if complaints
        else {}
    )
    return [complaint_out(c, reporters.get(c.reporter_user_id)) for c in complaints]


@router.post("/complaints/{complaint_id}/resolve")
async def resolve_complaint(
    complaint_id: str,
    payload: ComplaintResolveRequest,
    admin: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    complaint = await db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Complaint not found.")

    complaint.status = "resolved"
    complaint.resolution_notes = payload.resolution_notes.strip()
    complaint.resolved_by = admin.id
    await db.flush()
    notify(
        db,
        complaint.reporter_user_id,
        "Complaint resolved",
        f'Your complaint "{complaint.subject}" has been reviewed and resolved.',
        type_="system",
        reference_id=complaint.id,
    )
    await db.commit()

    reporter = await db.get(User, complaint.reporter_user_id)
    return complaint_out(complaint, reporter.name if reporter else None)


@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = Query(200, ge=1, le=500),
    _: User = Depends(get_admin),
    db: AsyncSession = Depends(get_db),
):
    logs = (
        await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit))
    ).scalars().all()
    return [audit_out(log) for log in logs]


@router.get("/metrics")
async def platform_metrics(_: User = Depends(get_admin), db: AsyncSession = Depends(get_db)):
    """Headline numbers for the admin console: doctors, visits, fees and ratings."""
    profiles = (await db.execute(select(DoctorProfile))).scalars().all()
    counts = {"pending": 0, "approved": 0, "suspended": 0}
    for profile in profiles:
        key = getattr(profile.verification_status, "value", profile.verification_status)
        if key in counts:
            counts[key] += 1

    visits = (await db.execute(select(Visit))).scalars().all()
    completed = [v for v in visits if v.status == "completed"]
    active = [v for v in visits if v.status in ACTIVE_VISIT_STATUSES]
    revenue: dict[str, int] = {}
    for visit in completed:
        currency = visit.currency or "RWF"
        revenue[currency] = revenue.get(currency, 0) + int(visit.total_fee or 0)

    avg_rating = (await db.execute(select(func.avg(Review.rating)))).scalar()

    return {
        "totalDoctors": len(profiles),
        "pendingVerifications": counts["pending"],
        "approvedDoctors": counts["approved"],
        "suspendedDoctors": counts["suspended"],
        "totalVisits": len(visits),
        "completedVisits": len(completed),
        "activeVisits": len(active),
        "grossRevenueRwf": revenue.get("RWF", 0),
        "revenueByCurrency": revenue,
        "markets": len({p.country for p in profiles if p.country}),
        "avgRating": round(float(avg_rating or 0), 2),
    }
