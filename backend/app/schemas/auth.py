from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    ADMIN = "admin"


class DoctorVerificationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SUSPENDED = "suspended"


# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    phone: str
    avatar_url: Optional[str] = None


class PatientRegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str = Field(..., min_length=6)
    age: Optional[int] = None
    gender: Optional[str] = None
    residence_address: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None


class DoctorRegisterRequest(BaseModel):
    name: str
    email: str
    phone: str
    password: str = Field(..., min_length=6)
    specialty: str
    license_number: str
    experience_years: int = 0
    qualifications: List[str] = []
    coverage_districts: List[str] = []



class LoginRequest(BaseModel):
    identifier: str  # Can be email or phone
    password: str
    demo_role: Optional[str] = None  # For backward-compatible demo login


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class PatientProfileResponse(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    residence_address: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    allergies: List[str] = []
    known_conditions: List[str] = []
    current_medication: List[str] = []

    class Config:
        from_attributes = True


class DoctorProfileResponse(BaseModel):
    specialty: str
    license_number: str
    experience_years: int
    qualifications: List[str] = []
    coverage_districts: List[str] = []
    bio: Optional[str] = None
    languages: List[str] = []
    consultation_fee_rwf: int = 25000
    travel_fee_rwf: int = 5000
    rating: int = 5
    review_count: int = 0
    verification_status: DoctorVerificationStatus

    class Config:
        from_attributes = True



class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: UserRole
    avatar_url: Optional[str] = None
    created_at: datetime
    patient_profile: Optional[PatientProfileResponse] = None
    doctor_profile: Optional[DoctorProfileResponse] = None

    class Config:
        from_attributes = True


class OtpVerifyRequest(BaseModel):
    code: str
    user_id: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    email: str

