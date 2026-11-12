import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_doctor
from app.db.session import get_db
from app.models.domain import AvailabilitySlot, ConsultationRecord, LabSample, ResultDocument, Visit
from app.models.user import DoctorVerificationStatus, User, utcnow
from app.schemas.requests import (
    AlternativeProposalRequest,
    ConsultationUpsertRequest,
    DoctorProfileUpdate,
    OnlineToggleRequest,
    ReasonRequest,
    ResultPublishRequest,
    SampleCreateRequest,
    SlotCreateRequest,
    VisitStatusUpdateRequest,
)
from app.services.doctors import doctor_out
from app.services.domain_ops import (
    EXECUTION_FLOW,
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
from app.services.serializers import (
    consultation_out,
    patient_profile_out,
    result_out,
    sample_out,
    slot_out,
    visit_out,
)

router = APIRouter()

CLINICAL_STATUSES = ("confirmed", "on_the_way", "arrived", "in_consultation", "completed")
STATUS_MESSAGES = {
    "on_the_way": ("Doctor is on the way!", "{doctor} has started traveling to your residence{district}."),
    "arrived": ("Doctor has arrived", "{doctor} has arrived at your gate / residence."),
    "in_consultation": ("Consultation started", "{doctor} has started your consultation."),
    "completed": (
        "Consultation Completed",
        "Your home visit with {doctor} has finished. Consultation notes are being prepared.",
    ),
}


def require_approved(doctor: User) -> None:
    profile = doctor.doctor_profile
    if not profile or profile.verification_status != DoctorVerificationStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unverified or suspended doctors cannot perform this action.",
        )


async def assigned_visit(db: AsyncSession, visit_id: str, doctor: User) -> Visit:
    visit = await load_visit(db, visit_id)
    if visit.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    return visit


# ---------- Profile ----------
@router.get("/profile")
async def get_profile(doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    if not doctor.doctor_profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found.")
    doctor.doctor_profile.user = doctor
    return await doctor_out(db, doctor.doctor_profile)


@router.put("/profile")
async def update_profile(
    payload: DoctorProfileUpdate,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    profile = doctor.doctor_profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("name"):
        doctor.name = data["name"].strip()
    if data.get("phone"):
        clash = await db.execute(select(User.id).where(User.phone == data["phone"], User.id != doctor.id).limit(1))
        if clash.scalar():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone number already in use.")
        doctor.phone = data["phone"]
    if "avatar_url" in data:
        doctor.avatar_url = data["avatar_url"]
    for field in (
        "specialty", "qualifications", "experience_years", "coverage_districts", "city", "country",
        "currency", "bio", "languages", "consultation_fee_rwf", "travel_fee_rwf", "working_days",
    ):
        if field in data and data[field] is not None:
            setattr(profile, field, data[field])
    if data.get("working_hours"):
        profile.working_hours_start = data["working_hours"]["start"]
        profile.working_hours_end = data["working_hours"]["end"]
    await db.commit()
    profile.user = doctor
    return await doctor_out(db, profile)


@router.put("/online")
async def toggle_online(
    payload: OnlineToggleRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    if payload.is_online:
        require_approved(doctor)
    doctor.doctor_profile.is_online = payload.is_online
    await db.commit()
    doctor.doctor_profile.user = doctor
    return await doctor_out(db, doctor.doctor_profile)


# ---------- Visits ----------
@router.get("/visits")
async def list_visits(doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    await expire_stale_visits(db, doctor.id)
    visits = (
        await db.execute(
            visit_query()
            .where(Visit.doctor_id == doctor.id)
            .order_by(Visit.scheduled_date.desc(), Visit.scheduled_time.desc())
        )
    ).scalars().all()
    return [visit_out(v) for v in visits]


@router.post("/visits/{visit_id}/accept")
async def accept_visit(visit_id: str, doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    require_approved(doctor)
    visit = await assigned_visit(db, visit_id, doctor)
    if visit.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot accept a visit that is {visit.status}.")
    await ensure_doctor_free(db, doctor.id, visit.scheduled_date, visit.scheduled_time, exclude_visit_id=visit.id)
    visit.status = "confirmed"
    notify(
        db,
        visit.patient_id,
        "Visit Request Confirmed!",
        f"{doctor.name} accepted your appointment for {visit.scheduled_date} at {visit.scheduled_time}.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.post("/visits/{visit_id}/decline")
async def decline_visit(
    visit_id: str,
    payload: ReasonRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    visit = await assigned_visit(db, visit_id, doctor)
    if visit.status not in ("pending", "alternative_proposed", "confirmed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot decline a visit that is {visit.status}.")
    visit.status = "declined"
    visit.decline_reason = payload.reason or None
    await release_slot(db, visit.slot_id)
    notify(
        db,
        visit.patient_id,
        "Visit Request Declined",
        f"{doctor.name} is unavailable: {payload.reason or 'No reason provided'}.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.post("/visits/{visit_id}/propose")
async def propose_alternative(
    visit_id: str,
    payload: AlternativeProposalRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    require_approved(doctor)
    visit = await assigned_visit(db, visit_id, doctor)
    if visit.status not in ("pending", "alternative_proposed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot reschedule a visit that is {visit.status}.")
    if payload.alternative_date < today_str():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please propose a date in the future.")
    await ensure_doctor_free(db, doctor.id, payload.alternative_date, payload.alternative_time, exclude_visit_id=visit.id)
    visit.status = "alternative_proposed"
    visit.alternative_date = payload.alternative_date
    visit.alternative_time = payload.alternative_time
    visit.alternative_note = payload.note
    notify(
        db,
        visit.patient_id,
        "Alternative Time Proposed",
        f"{doctor.name} proposed a new appointment slot: {payload.alternative_date} at {payload.alternative_time}.",
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


@router.post("/visits/{visit_id}/status")
async def update_execution_status(
    visit_id: str,
    payload: VisitStatusUpdateRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    require_approved(doctor)
    visit = await assigned_visit(db, visit_id, doctor)
    if visit.status not in EXECUTION_FLOW or EXECUTION_FLOW.index(payload.status) <= EXECUTION_FLOW.index(visit.status):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from {visit.status} to {payload.status}.",
        )
    visit.status = payload.status
    if payload.status == "completed" and visit.payment_method == "cash_on_visit":
        visit.payment_status = "completed"
    title, body = STATUS_MESSAGES[payload.status]
    notify(
        db,
        visit.patient_id,
        title,
        body.format(doctor=doctor.name, district=f" in {visit.district}" if visit.district else ""),
        reference_id=visit.id,
    )
    await db.commit()
    return visit_out(await reload_visit(db, visit.id))


# ---------- Availability ----------
@router.get("/slots")
async def list_slots(doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    slots = (
        await db.execute(
            select(AvailabilitySlot)
            .where(AvailabilitySlot.doctor_id == doctor.id, AvailabilitySlot.date >= today_str())
            .order_by(AvailabilitySlot.date, AvailabilitySlot.start_time)
        )
    ).scalars().all()
    return [slot_out(s) for s in slots]


@router.post("/slots", status_code=status.HTTP_201_CREATED)
async def add_slot(payload: SlotCreateRequest, doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    if payload.date < today_str():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot add availability in the past.")
    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="End time must be after start time.")
    overlap = await db.execute(
        select(AvailabilitySlot.id)
        .where(
            AvailabilitySlot.doctor_id == doctor.id,
            AvailabilitySlot.date == payload.date,
            AvailabilitySlot.start_time < payload.end_time,
            AvailabilitySlot.end_time > payload.start_time,
        )
        .limit(1)
    )
    if overlap.scalar():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This slot overlaps an existing slot.")
    slot = AvailabilitySlot(
        doctor_id=doctor.id, date=payload.date, start_time=payload.start_time, end_time=payload.end_time
    )
    db.add(slot)
    await db.commit()
    return slot_out(slot)


@router.delete("/slots/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_slot(slot_id: str, doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    slot = await db.get(AvailabilitySlot, slot_id)
    if not slot or slot.doctor_id != doctor.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
    if slot.is_booked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove a booked slot.")
    await db.delete(slot)
    await db.commit()


# ---------- Patients (only those with a visit with this doctor) ----------
@router.get("/patients")
async def list_patients(doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Visit.patient_id, func.count(Visit.id), func.max(Visit.scheduled_date))
            .where(Visit.doctor_id == doctor.id)
            .group_by(Visit.patient_id)
        )
    ).all()
    if not rows:
        return []
    stats = {pid: (count, last) for pid, count, last in rows}
    patients = (
        await db.execute(
            select(User).options(selectinload(User.patient_profile)).where(User.id.in_(list(stats.keys())))
        )
    ).scalars().all()
    out = []
    for p in patients:
        count, last = stats[p.id]
        out.append({**patient_profile_out(p, p.patient_profile), "visitCount": count, "lastVisitDate": last})
    out.sort(key=lambda x: x["lastVisitDate"] or "", reverse=True)
    return out


@router.get("/patients/{patient_id}")
async def get_assigned_patient(patient_id: str, doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    linked = await db.execute(
        select(Visit.id).where(Visit.doctor_id == doctor.id, Visit.patient_id == patient_id).limit(1)
    )
    if not linked.scalar():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    patient = (
        await db.execute(select(User).options(selectinload(User.patient_profile)).where(User.id == patient_id))
    ).scalars().first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    if patient.patient_profile:
        audit(db, doctor, "READ", "patient_profile", patient.patient_profile.id, patient.id, "Doctor viewed patient profile")
        await db.commit()
    return patient_profile_out(patient, patient.patient_profile)


# ---------- Consultation records ----------
@router.get("/visits/{visit_id}/consultation")
async def get_consultation(visit_id: str, doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    await assigned_visit(db, visit_id, doctor)
    record = (
        await db.execute(select(ConsultationRecord).where(ConsultationRecord.visit_id == visit_id))
    ).scalars().first()
    return consultation_out(record) if record else None


@router.put("/visits/{visit_id}/consultation")
async def upsert_consultation(
    visit_id: str,
    payload: ConsultationUpsertRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    require_approved(doctor)
    visit = await assigned_visit(db, visit_id, doctor)
    if visit.status not in CLINICAL_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Consultation notes require a confirmed visit.")
    if payload.publish and not payload.diagnosis.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Diagnosis is required to publish the record.")

    record = (
        await db.execute(select(ConsultationRecord).where(ConsultationRecord.visit_id == visit_id))
    ).scalars().first()
    if record and not record.is_draft:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This consultation record is already published.")
    is_new = record is None
    if is_new:
        record = ConsultationRecord(visit_id=visit.id, patient_id=visit.patient_id, doctor_id=doctor.id)
        db.add(record)

    record.consultation_notes = payload.consultation_notes.strip()
    record.physical_examination = payload.physical_examination.strip()
    record.diagnosis = payload.diagnosis.strip()
    record.icd_code = (payload.icd_code or "").strip() or None
    record.prescriptions = [
        {**p.model_dump(by_alias=True), "id": p.id or f"rx-{secrets.token_hex(4)}"} for p in payload.prescriptions
    ]
    record.recommendations = [r.strip() for r in payload.recommendations if r.strip()]
    record.is_lab_required = payload.is_lab_required
    record.required_lab_tests = [t.strip() for t in payload.required_lab_tests if t.strip()]
    if payload.sample_id:
        record.sample_id = payload.sample_id
    record.follow_up_recommended = payload.follow_up_recommended
    record.follow_up_date = payload.follow_up_date if payload.follow_up_recommended else None
    record.follow_up_notes = payload.follow_up_notes if payload.follow_up_recommended else None
    record.is_draft = not payload.publish
    if payload.publish:
        record.published_at = utcnow()
    await db.flush()

    if payload.publish:
        audit(db, doctor, "PUBLISH", "consultation_record", record.id, visit.patient_id,
              "Published medical consultation record & Rx to patient")
        notify(
            db,
            visit.patient_id,
            "Consultation Report Available",
            f"{doctor.name} published your consultation notes and prescriptions.",
            type_="result_ready",
            reference_id=visit.id,
        )
    else:
        audit(db, doctor, "CREATE" if is_new else "UPDATE", "consultation_record", record.id, visit.patient_id,
              "Drafted consultation record notes")
    await db.commit()
    return consultation_out(record)


# ---------- Lab samples & results ----------
@router.get("/visits/{visit_id}/samples")
async def list_samples(visit_id: str, doctor: User = Depends(get_doctor), db: AsyncSession = Depends(get_db)):
    await assigned_visit(db, visit_id, doctor)
    samples = (
        await db.execute(select(LabSample).where(LabSample.visit_id == visit_id).order_by(LabSample.collection_time))
    ).scalars().all()
    return [sample_out(s) for s in samples]


@router.post("/visits/{visit_id}/samples", status_code=status.HTTP_201_CREATED)
async def create_sample(
    visit_id: str,
    payload: SampleCreateRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    require_approved(doctor)
    visit = await assigned_visit(db, visit_id, doctor)
    if visit.status not in CLINICAL_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Samples require a confirmed visit.")
    code = f"SMP-{datetime.now(timezone.utc):%y%m%d}-{secrets.token_hex(3).upper()}"
    sample = LabSample(
        sample_code=code,
        visit_id=visit.id,
        patient_id=visit.patient_id,
        doctor_id=doctor.id,
        test_names=[t.strip() for t in payload.test_names if t.strip()],
        destination_lab=payload.destination_lab.strip(),
        notes=payload.notes,
        status="collected",
    )
    db.add(sample)
    await db.flush()
    record = (
        await db.execute(select(ConsultationRecord).where(ConsultationRecord.visit_id == visit.id))
    ).scalars().first()
    if record and not record.sample_id:
        record.sample_id = sample.id
    await db.commit()
    return sample_out(sample)


@router.post("/results", status_code=status.HTTP_201_CREATED)
async def publish_result(
    payload: ResultPublishRequest,
    doctor: User = Depends(get_doctor),
    db: AsyncSession = Depends(get_db),
):
    require_approved(doctor)
    visit = await assigned_visit(db, payload.visit_id, doctor)
    sample = None
    if payload.sample_id:
        sample = await db.get(LabSample, payload.sample_id)
        if not sample or sample.visit_id != visit.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sample does not belong to this visit.")
        sample.status = "completed"
    result = ResultDocument(
        visit_id=visit.id,
        patient_id=visit.patient_id,
        doctor_id=doctor.id,
        sample_id=sample.id if sample else None,
        title=payload.title.strip(),
        category=payload.category,
        summary_findings=payload.summary_findings.strip(),
        status="available",
        pdf_url=payload.pdf_url,
        pdf_file_name=payload.pdf_file_name,
        file_size_bytes=payload.file_size_bytes,
    )
    db.add(result)
    await db.flush()
    notify(
        db,
        visit.patient_id,
        "New Medical Result Available",
        f"{result.title} has been published by {doctor.name}. Tap to view.",
        type_="result_ready",
        reference_id=result.id,
    )
    audit(db, doctor, "PUBLISH", "result_document", result.id, visit.patient_id,
          f"Published laboratory/examination document: {result.title}")
    await db.commit()
    result = (
        await db.execute(
            result_query().where(ResultDocument.id == result.id).execution_options(populate_existing=True)
        )
    ).scalars().first()
    return result_out(result)
