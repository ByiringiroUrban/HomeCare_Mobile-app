from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import AvailabilitySlot, Review
from app.models.user import DoctorProfile, DoctorVerificationStatus, User
from app.services.doctors import doctor_out, doctor_query, doctors_out, get_doctor_profile, is_user_active
from app.services.domain_ops import today_str
from app.services.serializers import review_out, slot_out

router = APIRouter()


@router.get("")
async def search_doctors(
    query: Optional[str] = None,
    specialty: Optional[str] = None,
    district: Optional[str] = None,
    language: Optional[str] = None,
    max_fee: Optional[int] = Query(None, alias="maxFee"),
    min_rating: Optional[float] = Query(None, alias="minRating"),
    available_now: bool = Query(False, alias="availableNow"),
    sort: Optional[str] = None,
    limit: Optional[int] = Query(None, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    profiles = (
        await db.execute(doctor_query().where(DoctorProfile.verification_status == DoctorVerificationStatus.APPROVED))
    ).scalars().all()
    profiles = [p for p in profiles if p.user and is_user_active(p.user)]
    doctors = await doctors_out(db, profiles)

    if query:
        q = query.lower()
        doctors = [
            d for d in doctors
            if q in d["name"].lower() or q in d["specialty"].lower() or q in (d["bio"] or "").lower()
        ]
    if specialty and specialty != "All":
        doctors = [d for d in doctors if d["specialty"].lower() == specialty.lower()]
    if district and district != "All":
        doctors = [d for d in doctors if district in d["coverageDistricts"]]
    if language and language != "All":
        doctors = [d for d in doctors if language in d["languages"]]
    if max_fee:
        doctors = [d for d in doctors if d["consultationFeeRwf"] <= max_fee]
    if min_rating:
        doctors = [d for d in doctors if d["rating"] >= min_rating]
    if available_now:
        doctors = [d for d in doctors if d["isOnline"]]

    if sort == "rating":
        doctors.sort(key=lambda d: (d["rating"], d["reviewCount"]), reverse=True)
    else:
        doctors.sort(key=lambda d: (not d["isOnline"], -d["rating"], d["name"]))
    return doctors[:limit] if limit else doctors


@router.get("/{doctor_id}")
async def get_doctor_details(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = await get_doctor_profile(db, doctor_id)
    is_admin = getattr(current_user.role, "value", current_user.role) == "admin"
    if not profile or (profile.verification_status != DoctorVerificationStatus.APPROVED and not is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

    slots = (
        await db.execute(
            select(AvailabilitySlot)
            .where(
                AvailabilitySlot.doctor_id == doctor_id,
                AvailabilitySlot.date >= today_str(),
                AvailabilitySlot.is_blocked.is_(False),
            )
            .order_by(AvailabilitySlot.date, AvailabilitySlot.start_time)
        )
    ).scalars().all()
    reviews = (
        await db.execute(
            select(Review)
            .options(selectinload(Review.patient))
            .where(Review.doctor_id == doctor_id)
            .order_by(Review.created_at.desc())
        )
    ).scalars().all()
    return {
        "doctor": await doctor_out(db, profile),
        "slots": [slot_out(s) for s in slots],
        "reviews": [review_out(r) for r in reviews],
    }
