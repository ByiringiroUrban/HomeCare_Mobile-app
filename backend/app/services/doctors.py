from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.user import DoctorProfile, User
from app.services.domain_ops import doctor_ratings
from app.services.platform import get_platform_config
from app.services.serializers import doctor_profile_out


def doctor_query():
    return select(DoctorProfile).options(selectinload(DoctorProfile.user))


async def doctors_out(db: AsyncSession, profiles: list[DoctorProfile], config: Optional[dict] = None) -> list[dict]:
    config = config if config is not None else await get_platform_config(db)
    ratings = await doctor_ratings(db, [p.user_id for p in profiles])
    out = []
    for p in profiles:
        rating, count = ratings.get(p.user_id, (0.0, 0))
        out.append(doctor_profile_out(p.user, p, rating, count, config))
    return out


async def doctor_out(db: AsyncSession, profile: DoctorProfile) -> dict:
    return (await doctors_out(db, [profile]))[0]


async def get_doctor_profile(db: AsyncSession, doctor_user_id: str) -> Optional[DoctorProfile]:
    return (await db.execute(doctor_query().where(DoctorProfile.user_id == doctor_user_id))).scalars().first()


def is_user_active(user: User) -> bool:
    return user.is_active is not False
