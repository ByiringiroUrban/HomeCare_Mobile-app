"""One-time codes for account verification and password reset."""
import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.domain import OtpCode
from app.models.user import User

logger = logging.getLogger("homecare.otp")


def _as_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def deliver_otp(user: User, code: str, purpose: str) -> None:
    """Delivery hook. Replace with an SMS/email provider (e.g. Africa's Talking, Twilio, SMTP)."""
    if settings.OTP_LOG_TO_CONSOLE:
        label = "verification" if purpose == "verify" else "password reset"
        logger.warning("[OTP] %s code for %s (%s): %s", label, user.email, user.phone, code)
        print(f"[HomeCare OTP] {label} code for {user.email} / {user.phone}: {code}")


async def issue_otp(db: AsyncSession, user: User, purpose: str) -> None:
    await db.execute(
        update(OtpCode)
        .where(OtpCode.user_id == user.id, OtpCode.purpose == purpose, OtpCode.consumed.is_(False))
        .values(consumed=True)
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        OtpCode(
            user_id=user.id,
            purpose=purpose,
            code_hash=get_password_hash(code),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        )
    )
    await db.commit()
    deliver_otp(user, code, purpose)


async def consume_otp(db: AsyncSession, user: User, purpose: str, code: str) -> None:
    invalid = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")
    otp = (
        await db.execute(
            select(OtpCode)
            .where(OtpCode.user_id == user.id, OtpCode.purpose == purpose, OtpCode.consumed.is_(False))
            .order_by(OtpCode.created_at.desc())
            .limit(1)
        )
    ).scalars().first()
    if not otp or _as_aware(otp.expires_at) < datetime.now(timezone.utc):
        raise invalid
    if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp.consumed = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Request a new code.",
        )
    if not verify_password(code.strip(), otp.code_hash):
        otp.attempts += 1
        await db.commit()
        raise invalid
    otp.consumed = True
