from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.domain import Specialty
from app.models.user import DoctorProfile, DoctorVerificationStatus
from app.services.platform import get_platform_config

router = APIRouter()


async def list_specialties(db: AsyncSession, include_inactive: bool = False) -> list[dict]:
    query = select(Specialty).order_by(Specialty.name)
    if not include_inactive:
        query = query.where(Specialty.is_active.is_(True))
    specialties = (await db.execute(query)).scalars().all()
    counts = dict(
        (
            await db.execute(
                select(DoctorProfile.specialty, func.count(DoctorProfile.id))
                .where(DoctorProfile.verification_status == DoctorVerificationStatus.APPROVED)
                .group_by(DoctorProfile.specialty)
            )
        ).all()
    )
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description or "",
            "iconName": s.icon_name or "stethoscope",
            "isActive": bool(s.is_active),
            "doctorCount": int(counts.get(s.name, 0)),
        }
        for s in specialties
    ]


@router.get("/specialties")
async def get_specialties(db: AsyncSession = Depends(get_db)):
    return await list_specialties(db)


@router.get("/config")
async def get_config(db: AsyncSession = Depends(get_db)):
    return await get_platform_config(db)
