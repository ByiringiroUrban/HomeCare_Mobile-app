from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import Complaint, Notification, Visit
from app.models.user import User, UserRole
from app.schemas.requests import ComplaintCreateRequest
from app.services.domain_ops import load_visit, notify
from app.services.serializers import complaint_out, enum_value, notification_out, visit_out

visits_router = APIRouter()
notifications_router = APIRouter()
complaints_router = APIRouter()


@visits_router.get("/{visit_id}")
async def get_visit(visit_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    visit = await load_visit(db, visit_id)
    if user.role != UserRole.ADMIN and user.id not in (visit.patient_id, visit.doctor_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    return visit_out(visit)


@notifications_router.get("")
async def list_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Notification)
            .where(Notification.recipient_user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(200)
        )
    ).scalars().all()
    return [notification_out(n) for n in rows]


@notifications_router.post("/read-all")
async def mark_all_read(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await db.execute(
        update(Notification)
        .where(Notification.recipient_user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}


@notifications_router.post("/{notification_id}/read")
async def mark_read(notification_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    n = await db.get(Notification, notification_id)
    if not n or n.recipient_user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    n.is_read = True
    await db.commit()
    return notification_out(n)


@complaints_router.post("", status_code=status.HTTP_201_CREATED)
async def submit_complaint(
    payload: ComplaintCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.visit_id:
        visit = await db.get(Visit, payload.visit_id)
        if not visit or user.id not in (visit.patient_id, visit.doctor_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    complaint = Complaint(
        visit_id=payload.visit_id,
        reporter_user_id=user.id,
        reporter_role=enum_value(user.role),
        subject=payload.subject.strip(),
        details=payload.details.strip(),
        status="submitted",
    )
    db.add(complaint)
    await db.flush()
    admins = (await db.execute(select(User.id).where(User.role == UserRole.ADMIN))).scalars().all()
    for admin_id in admins:
        notify(db, admin_id, "New Complaint Submitted", f"{user.name}: {complaint.subject}", type_="system",
               reference_id=complaint.id)
    await db.commit()
    return complaint_out(complaint, user.name)


@complaints_router.get("/mine")
async def my_complaints(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Complaint).where(Complaint.reporter_user_id == user.id).order_by(Complaint.created_at.desc())
        )
    ).scalars().all()
    return [complaint_out(c, user.name) for c in rows]
