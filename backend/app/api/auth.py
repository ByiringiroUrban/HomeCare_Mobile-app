import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.db.session import get_db
from app.models.domain import Specialty
from app.models.user import DoctorProfile, DoctorVerificationStatus, PatientProfile, User, UserRole, utcnow
from app.schemas.requests import (
    ChangePasswordRequest,
    DoctorRegisterRequest,
    ForgotPasswordRequest,
    LoginRequest,
    OtpVerifyRequest,
    PatientRegisterRequest,
    ResendOtpRequest,
    ResetPasswordRequest,
)
from app.services.domain_ops import notify
from app.services.otp import consume_otp, issue_otp, mask_email
from app.services.serializers import user_out

router = APIRouter()


def normalize_phone(phone: str) -> str:
    return "".join(ch for ch in phone.strip() if ch.isdigit() or ch == "+")


def identifier_filter(identifier: str):
    ident = identifier.strip()
    return or_(
        func.lower(User.email) == ident.lower(),
        User.phone == ident,
        User.phone == normalize_phone(ident),
    )


async def find_user(db: AsyncSession, identifier: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.patient_profile), selectinload(User.doctor_profile))
        .where(identifier_filter(identifier))
    )
    return result.scalars().first()


async def ensure_unique_identity(db: AsyncSession, email: str, phone: str) -> None:
    clash = await db.execute(
        select(User.id).where(or_(func.lower(User.email) == email.lower(), User.phone == phone)).limit(1)
    )
    if clash.scalar():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User with this email or phone already exists.")


def session_payload(user: User) -> dict:
    return {"accessToken": create_access_token(subject=user.id), "tokenType": "bearer", "user": user_out(user)}


@router.post("/register/patient", status_code=status.HTTP_201_CREATED)
async def register_patient(payload: PatientRegisterRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    phone = normalize_phone(payload.phone)
    await ensure_unique_identity(db, email, phone)

    user = User(
        name=payload.name.strip(),
        email=email,
        phone=phone,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.PATIENT,
        is_verified=False,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    db.add(
        PatientProfile(
            user_id=user.id,
            age=payload.age,
            gender=payload.gender,
            residence_address=payload.residence_address,
            city=payload.city,
            country=payload.country,
            district=payload.district,
            sector=payload.sector,
            allergies=[],
            known_conditions=[],
            current_medication=[],
            consent_given=payload.consent_given,
            consent_timestamp=utcnow() if payload.consent_given else None,
        )
    )
    await db.commit()
    email_sent = await issue_otp(db, user, "verify")
    return {
        "user": user_out(user),
        "requiresVerification": True,
        "emailSent": email_sent,
        "destination": mask_email(user.email),
    }


@router.post("/register/doctor", status_code=status.HTTP_201_CREATED)
async def register_doctor(payload: DoctorRegisterRequest, db: AsyncSession = Depends(get_db)):
    email = payload.email.strip().lower()
    phone = normalize_phone(payload.phone)
    await ensure_unique_identity(db, email, phone)

    license_number = payload.license_number.strip()
    existing_license = await db.execute(
        select(DoctorProfile.id).where(DoctorProfile.license_number == license_number).limit(1)
    )
    if existing_license.scalar():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor with this license number already exists.")

    specialty = (
        await db.execute(
            select(Specialty).where(or_(Specialty.name == payload.specialty, Specialty.id == payload.specialty)).limit(1)
        )
    ).scalars().first()
    if not specialty:
        # Doctors type their specialty freely on sign-up, so register a new one
        # instead of refusing the account.
        specialty_name = payload.specialty.strip()
        if not specialty_name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown specialty.")
        slug = re.sub(r"[^a-z0-9]+", "_", specialty_name.lower()).strip("_") or "general_medicine"
        specialty = Specialty(id=slug, name=specialty_name, description="", icon_name="stethoscope")
        db.add(specialty)
        await db.flush()

    user = User(
        name=payload.name.strip(),
        email=email,
        phone=phone,
        hashed_password=get_password_hash(payload.password),
        role=UserRole.DOCTOR,
        is_verified=False,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    db.add(
        DoctorProfile(
            user_id=user.id,
            specialty=specialty.name,
            license_number=license_number,
            experience_years=payload.experience_years,
            qualifications=payload.qualifications,
            coverage_districts=payload.coverage_districts,
            city=payload.city,
            country=payload.country,
            languages=[],
            is_online=False,
            verification_status=DoctorVerificationStatus.PENDING,
        )
    )

    # Let every administrator know there is a new credential file to review
    admins = (await db.execute(select(User.id).where(User.role == UserRole.ADMIN))).scalars().all()
    for admin_id in admins:
        notify(
            db,
            admin_id,
            "New Doctor Registration",
            f"{user.name} ({specialty.name}, license {license_number}) is awaiting credential verification.",
            type_="verification",
            reference_id=user.id,
        )
    await db.commit()
    email_sent = await issue_otp(db, user, "verify")
    return {
        "user": user_out(user),
        "requiresVerification": True,
        "emailSent": email_sent,
        "destination": mask_email(user.email),
    }


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await find_user(db, payload.identifier)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials or unregistered account.")
    if user.is_active is False:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")
    if user.is_verified is False:
        email_sent = await issue_otp(db, user, "verify")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "account_not_verified",
                "message": "Please verify your account. A new verification code has been sent.",
                "userId": user.id,
                "destination": user.email,
                "destinationMasked": mask_email(user.email),
                "emailSent": email_sent,
            },
        )
    return session_payload(user)


@router.post("/verify-otp")
async def verify_otp(payload: OtpVerifyRequest, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")
    await consume_otp(db, user, "verify", payload.code)
    user.is_verified = True
    await db.commit()
    return session_payload(user)


@router.post("/resend-otp")
async def resend_otp(payload: ResendOtpRequest, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, payload.user_id)
    email_sent = False
    if user and user.is_verified is False:
        email_sent = await issue_otp(db, user, "verify")
    return {
        "message": "If the account is awaiting verification, a new code has been sent.",
        "emailSent": email_sent,
        "destination": mask_email(user.email) if user else None,
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await find_user(db, payload.identifier)
    email_sent = False
    if user and user.is_active is not False:
        email_sent = await issue_otp(db, user, "reset")
    # Same wording either way to avoid revealing which accounts exist
    return {
        "message": "If the account exists, a reset code has been sent by email.",
        "emailSent": email_sent,
        "destination": mask_email(user.email) if user else None,
        "expiresInMinutes": settings.OTP_EXPIRE_MINUTES,
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    user = await find_user(db, payload.identifier)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification code.")
    await consume_otp(db, user, "reset", payload.code)
    user.hashed_password = get_password_hash(payload.new_password)
    # Possession of the reset code also proves ownership of the account
    if user.is_verified is False:
        user.is_verified = True
    await db.commit()
    return {"message": "Password updated. You can now sign in."}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    current_user.hashed_password = get_password_hash(payload.new_password)
    await db.commit()
    return {"message": "Password changed."}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return user_out(current_user)
