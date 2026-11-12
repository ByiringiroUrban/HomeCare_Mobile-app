from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_patient
from app.db.session import get_db
from app.models.domain import AvailabilitySlot, ConsultationRecord, ResultDocument, Review, Visit
from app.models.user import DoctorVerificationStatus, PatientProfile, User, utcnow
from app.schemas.requests import (
    PatientProfileUpdate,
    ReasonRequest,
    RescheduleRequest,
    ReviewCreateRequest,
    VisitCreateRequest,
)
from app.services.doctors import get_doctor_profile
from app.services.domain_ops import (
    audit,
    ensure_doctor_free,
    expire_stale_visits,
    load_visit,
    notify,
    release_slot,
    reload_visit,
    result_query,
    today_str,
    visit_query,
)
from app.services.platform import get_platform_config
from app.services.serializers import consultation_out, patient_profile_out, result_out, review_out, visit_out

router = APIRouter()

PATIENT_MUTABLE_STATUSES = ("pending", "alternative_proposed", "confirmed")


async def own_visit(db: AsyncSession, visit_id: str, patient: User) -> Visit:
    visit = await load_visit(db, visit_id)
    if visit.patient_id != patient.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    return visit


# ---------- Profile ----------
@router.get("/profile")
async def get_profile(patient: User = Depends(get_patient)):
    return patient_profile_out(patient, patient.patient_profile)


@router.put("/profile")
async def update_profile(
    payload: PatientProfileUpdate,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    profile = patient.patient_profile
    if profile is None:
        profile = PatientProfile(user_id=patient.id, allergies=[], known_conditions=[], current_medication=[])
        db.add(profile)
        patient.patient_profile = profile

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        patient.name = data["name"].strip()
    if "phone" in data and data["phone"]:
        clash = await db.execute(select(User.id).where(User.phone == data["phone"], User.id != patient.id).limit(1))
        if clash.scalar():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use.")
        patient.phone = data["phone"]
    if "avatar_url" in data:
        patient.avatar_url = data["avatar_url"]

    for field in (
        "age", "gender", "residence_address", "city", "country", "district", "sector",
        "allergies", "known_conditions", "current_medication",
    ):
        if field in data:
            setattr(profile, field, data[field])
    if "coordinates" in data:
        coords = data["coordinates"]
        profile.latitude = coords["latitude"] if coords else None
        profile.longitude = coords["longitude"] if coords else None
    if "emergency_contact" in data and data["emergency_contact"] is not None:
        ec = data["emergency_contact"]
        profile.emergency_contact_name = ec.get("name")
        profile.emergency_contact_relationship = ec.get("relationship")
        profile.emergency_contact_phone = ec.get("phone")
    if "consent_given" in data and data["consent_given"] is not None:
        if data["consent_given"] and not profile.consent_given:
            profile.consent_timestamp = utcnow()
        profile.consent_given = data["consent_given"]

    await db.flush()
    audit(db, patient, "UPDATE", "patient_profile", profile.id, patient.id, "Patient updated personal/medical profile")
    await db.commit()
    return patient_profile_out(patient, profile)


# ---------- Visits ----------
@router.post("/visits", status_code=status.HTTP_201_CREATED)
async def create_visit(
    payload: VisitCreateRequest,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    doctor_profile = await get_doctor_profile(db, payload.doctor_id)
    if (
        not doctor_profile
        or doctor_profile.verification_status != DoctorVerificationStatus.APPROVED
        or doctor_profile.user.is_active is False
    ):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This doctor is not available for bookings.")
    if payload.scheduled_date < today_str():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please choose a date in the future.")

    slot = None
    if payload.slot_id:
        slot = await db.get(AvailabilitySlot, payload.slot_id)
        if not slot or slot.doctor_id != payload.doctor_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Selected time slot does not exist.")
        if slot.is_booked or slot.is_blocked:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected time slot is no longer available.")
        if slot.date != payload.scheduled_date or slot.start_time != payload.scheduled_time:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot does not match the requested time.")
    await ensure_doctor_free(db, payload.doctor_id, payload.scheduled_date, payload.scheduled_time)

    # Fees always come from the doctor's profile / platform config, never from the client
    config = await get_platform_config(db)
    consultation_fee = doctor_profile.consultation_fee_rwf
    if consultation_fee is None:
        consultation_fee = int(config.get("defaultConsultationFee") or 0)
    travel_fee = doctor_profile.travel_fee_rwf
    if travel_fee is None:
        travel_fee = int(config.get("baseTravelFee") or 0)

    visit = Visit(
        patient_id=patient.id,
        doctor_id=payload.doctor_id,
        slot_id=slot.id if slot else None,
        scheduled_date=payload.scheduled_date,
        scheduled_time=payload.scheduled_time,
        status="pending",
        condition_description=payload.condition_description.strip(),
        common_symptoms=payload.common_symptoms,
        attachment_urls=payload.attachment_urls,
        visit_address=payload.visit_address.strip(),
        district=payload.district,
        access_instructions=payload.access_instructions,
        latitude=payload.coordinates.latitude if payload.coordinates else None,
        longitude=payload.coordinates.longitude if payload.coordinates else None,
        consultation_fee=consultation_fee,
        travel_fee=travel_fee,
        total_fee=consultation_fee + travel_fee,
        currency=doctor_profile.currency or config.get("defaultCurrency") or "RWF",
        payment_method=payload.payment_method,
        payment_status="pending",
    )
    db.add(visit)
    if slot:
        slot.is_booked = True
    await db.flush()
    notify(
        db,
        payload.doctor_id,
        "New Visit Request Received",
        f"{patient.name} requested a consultation on {payload.scheduled_date} at {payload.scheduled_time}.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.get("/visits")
async def list_visits(patient: User = Depends(get_patient), db: AsyncSession = Depends(get_db)):
    await expire_stale_visits(db, patient.id)
    visits = (
        await db.execute(visit_query().where(Visit.patient_id == patient.id).order_by(Visit.created_at.desc()))
    ).scalars().all()
    return [visit_out(v) for v in visits]


@router.post("/visits/{visit_id}/cancel")
async def cancel_visit(
    visit_id: str,
    payload: ReasonRequest,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    visit = await own_visit(db, visit_id, patient)
    if visit.status not in PATIENT_MUTABLE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a visit after the doctor has started traveling, arrived or finished.",
        )
    visit.status = "cancelled"
    visit.cancellation_reason = payload.reason or "Cancelled by patient"
    await release_slot(db, visit.slot_id)
    notify(
        db,
        visit.doctor_id,
        "Visit Cancelled",
        f"{patient.name} cancelled the visit on {visit.scheduled_date} at {visit.scheduled_time}."
        + (f" Reason: {payload.reason}" if payload.reason else ""),
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.post("/visits/{visit_id}/reschedule")
async def reschedule_visit(
    visit_id: str,
    payload: RescheduleRequest,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    visit = await own_visit(db, visit_id, patient)
    if visit.status not in PATIENT_MUTABLE_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reschedule after the doctor has departed.")
    if payload.new_date < today_str():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please choose a date in the future.")
    await ensure_doctor_free(db, visit.doctor_id, payload.new_date, payload.new_time, exclude_visit_id=visit.id)

    await release_slot(db, visit.slot_id)
    visit.slot_id = None
    visit.scheduled_date = payload.new_date
    visit.scheduled_time = payload.new_time
    visit.alternative_date = None
    visit.alternative_time = None
    visit.alternative_note = None
    visit.status = "pending"  # requires doctor re-confirmation
    notify(
        db,
        visit.doctor_id,
        "Visit Rescheduled",
        f"{patient.name} asked to move the visit to {payload.new_date} at {payload.new_time}. Please confirm.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.post("/visits/{visit_id}/accept-alternative")
async def accept_alternative(visit_id: str, patient: User = Depends(get_patient), db: AsyncSession = Depends(get_db)):
    visit = await own_visit(db, visit_id, patient)
    if visit.status != "alternative_proposed" or not visit.alternative_date or not visit.alternative_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No alternative time proposed to accept.")
    await ensure_doctor_free(db, visit.doctor_id, visit.alternative_date, visit.alternative_time, exclude_visit_id=visit.id)

    await release_slot(db, visit.slot_id)
    visit.slot_id = None
    visit.scheduled_date = visit.alternative_date
    visit.scheduled_time = visit.alternative_time
    visit.alternative_date = None
    visit.alternative_time = None
    visit.alternative_note = None
    visit.status = "confirmed"
    notify(
        db,
        visit.doctor_id,
        "Alternative Time Accepted",
        f"{patient.name} accepted your proposed time: {visit.scheduled_date} at {visit.scheduled_time}.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.post("/visits/{visit_id}/reject-alternative")
async def reject_alternative(
    visit_id: str,
    payload: ReasonRequest,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    visit = await own_visit(db, visit_id, patient)
    if visit.status != "alternative_proposed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No alternative time proposed to reject.")
    visit.status = "cancelled"
    visit.cancellation_reason = payload.reason or "Alternative time rejected by patient"
    await release_slot(db, visit.slot_id)
    notify(
        db,
        visit.doctor_id,
        "Alternative Time Rejected",
        f"{patient.name} did not accept the proposed time and the request was closed.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


# ---------- Records ----------
@router.get("/records")
async def get_records(patient: User = Depends(get_patient), db: AsyncSession = Depends(get_db)):
    consultations = (
        await db.execute(
            select(ConsultationRecord)
            .where(ConsultationRecord.patient_id == patient.id, ConsultationRecord.is_draft.is_(False))
            .order_by(ConsultationRecord.published_at.desc())
        )
    ).scalars().all()
    results = (
        await db.execute(
            result_query()
            .where(ResultDocument.patient_id == patient.id)
            .order_by(ResultDocument.published_at.desc())
        )
    ).scalars().all()
    return {
        "consultations": [consultation_out(c) for c in consultations],
        "results": [result_out(r) for r in results],
    }


@router.get("/results/{result_id}")
async def get_result(result_id: str, patient: User = Depends(get_patient), db: AsyncSession = Depends(get_db)):
    result = (await db.execute(result_query().where(ResultDocument.id == result_id))).scalars().first()
    if not result or result.patient_id != patient.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result document not found.")
    if not result.is_viewed_by_patient:
        result.is_viewed_by_patient = True
    audit(db, patient, "READ", "result_document", result.id, patient.id, f"Patient opened result: {result.title}")
    await db.commit()
    return result_out(result)


# ---------- Reviews ----------
@router.get("/reviews")
async def my_reviews(patient: User = Depends(get_patient), db: AsyncSession = Depends(get_db)):
    reviews = (
        await db.execute(select(Review).options(selectinload(Review.patient)).where(Review.patient_id == patient.id))
    ).scalars().all()
    return [review_out(r) for r in reviews]


@router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def submit_review(
    payload: ReviewCreateRequest,
    patient: User = Depends(get_patient),
    db: AsyncSession = Depends(get_db),
):
    visit = await own_visit(db, payload.visit_id, patient)
    if visit.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can only review completed visits.")
    exists = await db.execute(select(Review.id).where(Review.visit_id == visit.id).limit(1))
    if exists.scalar():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already reviewed this visit.")
    review = Review(
        visit_id=visit.id,
        patient_id=patient.id,
        doctor_id=visit.doctor_id,
        rating=payload.rating,
        comment=payload.comment.strip(),
    )
    db.add(review)
    notify(
        db,
        visit.doctor_id,
        "New Patient Review",
        f"{patient.name} rated your visit {payload.rating}/5.",
        type_="system",
        reference_id=visit.id,
    )
    await db.commit()
    review.patient = patient
    return review_out(review)
