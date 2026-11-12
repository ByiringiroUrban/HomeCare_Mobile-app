"""Startup bootstrap: reference data and the initial administrator account.

No demo patients, doctors or visits are created — all operational data comes from real usage.
"""
import logging

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.domain import Specialty
from app.models.user import User, UserRole
from app.services.platform import ensure_platform_defaults

logger = logging.getLogger("homecare.bootstrap")

DEFAULT_SPECIALTIES = [
    ("general_medicine", "General Medicine", "Primary healthcare, routine adult checkups, chronic disease management", "stethoscope"),
    ("pediatrics", "Pediatrics", "Child health, neonatal checks, developmental assessments, childhood illnesses", "baby"),
    ("cardiology", "Cardiology", "Heart conditions, hypertension monitoring, ECG reviews, cardiovascular risk", "heart-pulse"),
    ("dermatology", "Dermatology", "Skin rash diagnosis, eczema, allergies, pediatric skin conditions", "sparkles"),
    ("gynecology", "Obstetrics & Gynecology", "Antenatal home monitoring, post-partum checkups, women health", "shield-plus"),
    ("geriatrics", "Geriatric Medicine", "Elderly care, mobility limitations, polypharmacy evaluation", "user-check"),
]


async def ensure_specialties(db: AsyncSession) -> None:
    count = (await db.execute(select(func.count(Specialty.id)))).scalar() or 0
    if count:
        return
    for slug, name, description, icon in DEFAULT_SPECIALTIES:
        db.add(Specialty(id=slug, name=name, description=description, icon_name=icon))
    await db.commit()


async def ensure_admin(db: AsyncSession) -> None:
    existing = (await db.execute(select(User.id).where(User.role == UserRole.ADMIN).limit(1))).scalar()
    if existing:
        return
    if not (settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD and settings.ADMIN_PHONE):
        logger.warning(
            "No administrator account exists. Set ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD "
            "(and optionally ADMIN_NAME) in backend/.env and restart to create one."
        )
        return
    clash = (
        await db.execute(
            select(User).where((User.email == settings.ADMIN_EMAIL) | (User.phone == settings.ADMIN_PHONE))
        )
    ).scalars().first()
    if clash:
        logger.warning("Cannot create admin: email or phone %s is already used by another account.", settings.ADMIN_EMAIL)
        return
    db.add(
        User(
            name=settings.ADMIN_NAME or "Platform Administrator",
            email=settings.ADMIN_EMAIL,
            phone=settings.ADMIN_PHONE,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True,
        )
    )
    await db.commit()
    logger.info("Created administrator account %s", settings.ADMIN_EMAIL)


async def run_bootstrap(db: AsyncSession) -> None:
    await ensure_platform_defaults(db)
    await ensure_specialties(db)
    await ensure_admin(db)
