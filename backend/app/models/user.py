import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, JSON, Integer, ForeignKey, Boolean, Float
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base


class UserRole(str, enum.Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class DoctorVerificationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.PATIENT, nullable=False)
    avatar_url = Column(String, nullable=True)
    # NULL is treated as verified/active so accounts created before these columns existed keep working
    is_verified = Column(Boolean, nullable=True)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)
    residence_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    district = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    emergency_contact_name = Column(String, nullable=True)
    emergency_contact_relationship = Column(String, nullable=True)
    emergency_contact_phone = Column(String, nullable=True)
    allergies = Column(JSON, default=list)
    known_conditions = Column(JSON, default=list)
    current_medication = Column(JSON, default=list)
    consent_given = Column(Boolean, nullable=True)
    consent_timestamp = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="patient_profile")


class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    specialty = Column(String, nullable=False)
    license_number = Column(String, unique=True, nullable=False)
    experience_years = Column(Integer, default=0)
    qualifications = Column(JSON, default=list)
    coverage_districts = Column(JSON, default=list)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    currency = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    languages = Column(JSON, default=list)
    consultation_fee_rwf = Column(Integer, nullable=True)
    travel_fee_rwf = Column(Integer, nullable=True)
    # Legacy columns; the live rating is aggregated from the reviews table
    rating = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    verification_status = Column(SQLEnum(DoctorVerificationStatus), default=DoctorVerificationStatus.PENDING, nullable=False)
    is_online = Column(Boolean, nullable=True)
    working_days = Column(JSON, nullable=True)
    working_hours_start = Column(String, nullable=True)
    working_hours_end = Column(String, nullable=True)

    user = relationship("User", back_populates="doctor_profile")
