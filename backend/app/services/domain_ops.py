"""Shared domain helpers used by several routers."""
from datetime import datetime, timezone
from typing import Iterable, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.domain import AuditLog, AvailabilitySlot, Notification, ResultDocument, Review, Visit
from app.models.user import User

ACTIVE_VISIT_STATUSES = ("pending", "alternative_proposed", "confirmed", "on_the_way", "arrived", "in_consultation")
RELEASING_STATUSES = ("cancelled", "declined", "expired")
EXECUTION_FLOW = ["confirmed", "on_the_way", "arrived", "in_consultation", "completed"]


def visit_query():
    return select(Visit).options(
        selectinload(Visit.patient),
        selectinload(Visit.doctor).selectinload(User.doctor_profile),
    )


def result_query():
    return select(ResultDocument).options(
        selectinload(ResultDocument.patient),
        selectinload(ResultDocument.doctor),
        selectinload(ResultDocument.sample),
    )


async def load_visit(db: AsyncSession, visit_id: str) -> Visit:
    visit = (await db.execute(visit_query().where(Visit.id == visit_id))).scalars().first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    return visit


async def reload_visit(db: AsyncSession, visit_id: str) -> Visit:
    db.expire_all()
    return await load_visit(db, visit_id)


def notify(
    db: AsyncSession,
    recipient_id: str,
    title: str,
    body: str,
    type_: str = "visit_status",
    reference_id: Optional[str] = None,
) -> None:
    db.add(Notification(recipient_user_id=recipient_id, title=title, body=body, type=type_, reference_id=reference_id))


def audit(
    db: AsyncSession,
    actor: User,
    action: str,
    entity_type: str,
    entity_id: str,
    patient_id: str,
    details: str,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor.id,
            actor_name=actor.name,
            actor_role=getattr(actor.role, "value", actor.role),
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            patient_id=patient_id,
            details=details,
        )
    )


async def doctor_ratings(db: AsyncSession, doctor_ids: Iterable[str]) -> dict[str, tuple[float, int]]:
    ids = list(doctor_ids)
    if not ids:
        return {}
    rows = await db.execute(
        select(Review.doctor_id, func.avg(Review.rating), func.count(Review.id))
        .where(Review.doctor_id.in_(ids))
        .group_by(Review.doctor_id)
    )
    return {doctor_id: (float(avg or 0), int(count or 0)) for doctor_id, avg, count in rows.all()}


async def release_slot(db: AsyncSession, slot_id: Optional[str]) -> None:
    if not slot_id:
        return
    slot = await db.get(AvailabilitySlot, slot_id)
    if slot:
        slot.is_booked = False


async def ensure_doctor_free(
    db: AsyncSession, doctor_id: str, date: str, time: str, exclude_visit_id: Optional[str] = None
) -> None:
    query = select(Visit.id).where(
        Visit.doctor_id == doctor_id,
        Visit.scheduled_date == date,
        Visit.scheduled_time == time,
        Visit.status.in_(ACTIVE_VISIT_STATUSES),
    )
    if exclude_visit_id:
        query = query.where(Visit.id != exclude_visit_id)
    if (await db.execute(query.limit(1))).scalar():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This doctor is already reserved for the selected date and time.",
        )


def today_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def expire_stale_visits(db: AsyncSession, user_id: Optional[str] = None) -> None:
    """Automatically expire requests that were never confirmed before their scheduled day passed."""
    today = today_str()
    query = visit_query().where(
        or_(
            and_(Visit.status == "pending", Visit.scheduled_date < today),
            and_(
                Visit.status == "alternative_proposed",
                func.coalesce(Visit.alternative_date, Visit.scheduled_date) < today,
            ),
        )
    )
    if user_id:
        query = query.where(or_(Visit.patient_id == user_id, Visit.doctor_id == user_id))
    stale = (await db.execute(query)).scalars().all()
    if not stale:
        return
    for visit in stale:
        visit.status = "expired"
        await release_slot(db, visit.slot_id)
        notify(
            db,
            visit.patient_id,
            "Visit Request Expired",
            f"Your request with {visit.doctor.name if visit.doctor else 'the doctor'} for {visit.scheduled_date} "
            "expired without confirmation. Please book a new time.",
            reference_id=visit.id,
        )
    await db.commit()
