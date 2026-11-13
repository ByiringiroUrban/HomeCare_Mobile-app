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
from app.services.mailer import otp_email, send_email

logger = logging.getLogger("homecare.otp")


def _as_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def mask_email(email: str | None) -> str | None:
    """diane.uwase@example.rw -> d***e@example.rw (enough to recognise, not to reuse)."""
    if not email or "@" not in email:
        return None
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked = local[:1] + "***"
    else:
        masked = f"{local[0]}***{local[-1]}"
    return f"{masked}@{domain}"


async def deliver_otp(user: User, code: str, purpose: str) -> bool:
    """Email the code to the account's address. Returns True when accepted by SMTP."""
    label = "verification" if purpose == "verify" else "password reset"

    subject, text, html = otp_email(code, purpose)
    delivered = await send_email(user.email, subject, text, html)

    # Console logging is opt-in; it also acts as the offline fallback so local
    # development is never locked out when SMTP is unreachable.
    if not delivered or settings.OTP_LOG_TO_CONSOLE:
        logger.warning("[OTP] %s code for %s (%s): %s", label, user.email, user.phone, code)
        print(f"[HomeCare OTP] {label} code for {user.email} / {user.phone}: {code}")

    return delivered


async def issue_otp(db: AsyncSession, user: User, purpose: str) -> bool:
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
    return await deliver_otp(user, code, purpose)


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
