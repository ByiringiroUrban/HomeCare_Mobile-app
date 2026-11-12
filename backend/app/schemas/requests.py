"""Request bodies. Fields are snake_case in Python and accepted as camelCase (or snake_case) in JSON."""
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

DATE_PATTERN = r"^\d{4}-\d{2}-\d{2}$"
TIME_PATTERN = r"^\d{2}:\d{2}$"


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


# ---------- Auth ----------
class PatientRegisterRequest(CamelModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=3)
    phone: str = Field(..., min_length=6)
    password: str = Field(..., min_length=8)
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = None
    residence_address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    consent_given: bool = False


class DoctorRegisterRequest(CamelModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=3)
    phone: str = Field(..., min_length=6)
    password: str = Field(..., min_length=8)
    specialty: str
    license_number: str = Field(..., min_length=3)
    experience_years: int = Field(0, ge=0, le=70)
    qualifications: List[str] = []
    coverage_districts: List[str] = []
    city: Optional[str] = None
    country: Optional[str] = None


class LoginRequest(CamelModel):
    identifier: str
    password: str


class OtpVerifyRequest(CamelModel):
    user_id: str
    code: str = Field(..., min_length=4, max_length=8)


class ResendOtpRequest(CamelModel):
    user_id: str


class ForgotPasswordRequest(CamelModel):
    identifier: str


class ResetPasswordRequest(CamelModel):
    identifier: str
    code: str = Field(..., min_length=4, max_length=8)
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(CamelModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


# ---------- Profiles ----------
class Coordinates(CamelModel):
    latitude: float
    longitude: float


class EmergencyContact(CamelModel):
    name: str = ""
    relationship: str = ""
    phone: str = ""


class PatientProfileUpdate(CamelModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=130)
    gender: Optional[str] = None
    residence_address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    district: Optional[str] = None
    sector: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    emergency_contact: Optional[EmergencyContact] = None
    allergies: Optional[List[str]] = None
    known_conditions: Optional[List[str]] = None
    current_medication: Optional[List[str]] = None
    consent_given: Optional[bool] = None


class WorkingHours(CamelModel):
    start: str = Field(..., pattern=TIME_PATTERN)
    end: str = Field(..., pattern=TIME_PATTERN)


class DoctorProfileUpdate(CamelModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    specialty: Optional[str] = None
    qualifications: Optional[List[str]] = None
    experience_years: Optional[int] = Field(None, ge=0, le=70)
    coverage_districts: Optional[List[str]] = None
    city: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    bio: Optional[str] = None
    languages: Optional[List[str]] = None
    consultation_fee_rwf: Optional[int] = Field(None, ge=0)
    travel_fee_rwf: Optional[int] = Field(None, ge=0)
    working_days: Optional[List[int]] = None
    working_hours: Optional[WorkingHours] = None

    @field_validator("working_days")
    @classmethod
    def _valid_days(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None and any(d < 0 or d > 6 for d in v):
            raise ValueError("working days must be between 0 (Sunday) and 6 (Saturday)")
        return v


class OnlineToggleRequest(CamelModel):
    is_online: bool


# ---------- Scheduling ----------
class SlotCreateRequest(CamelModel):
    date: str = Field(..., pattern=DATE_PATTERN)
    start_time: str = Field(..., pattern=TIME_PATTERN)
    end_time: str = Field(..., pattern=TIME_PATTERN)


PaymentMethod = Literal["momo", "mpesa", "tigopesa", "airtel", "card", "cash_on_visit"]


class VisitCreateRequest(CamelModel):
    doctor_id: str
    slot_id: Optional[str] = None
    scheduled_date: str = Field(..., pattern=DATE_PATTERN)
    scheduled_time: str = Field(..., pattern=TIME_PATTERN)
    condition_description: str = Field(..., min_length=3)
    common_symptoms: List[str] = []
    attachment_urls: List[str] = []
    visit_address: str = Field(..., min_length=3)
    district: str = ""
    access_instructions: Optional[str] = None
    coordinates: Optional[Coordinates] = None
    payment_method: PaymentMethod


class ReasonRequest(CamelModel):
    reason: str = ""


class RescheduleRequest(CamelModel):
    new_date: str = Field(..., pattern=DATE_PATTERN)
    new_time: str = Field(..., pattern=TIME_PATTERN)


class AlternativeProposalRequest(CamelModel):
    alternative_date: str = Field(..., pattern=DATE_PATTERN)
    alternative_time: str = Field(..., pattern=TIME_PATTERN)
    note: Optional[str] = None


class VisitStatusUpdateRequest(CamelModel):
    status: Literal["on_the_way", "arrived", "in_consultation", "completed"]


# ---------- Clinical ----------
class PrescriptionItemIn(CamelModel):
    id: Optional[str] = None
    medication_name: str
    dosage: str = ""
    frequency: str = ""
    duration_days: int = 0
    instructions: str = ""


class ConsultationUpsertRequest(CamelModel):
    consultation_notes: str = ""
    physical_examination: str = ""
    diagnosis: str = ""
    icd_code: Optional[str] = None
    prescriptions: List[PrescriptionItemIn] = []
    recommendations: List[str] = []
    is_lab_required: bool = False
    required_lab_tests: List[str] = []
    sample_id: Optional[str] = None
    follow_up_recommended: bool = False
    follow_up_date: Optional[str] = None
    follow_up_notes: Optional[str] = None
    publish: bool = False


class SampleCreateRequest(CamelModel):
    test_names: List[str] = Field(..., min_length=1)
    destination_lab: str = Field(..., min_length=2)
    notes: Optional[str] = None


class ResultPublishRequest(CamelModel):
    visit_id: str
    sample_id: Optional[str] = None
    title: str = Field(..., min_length=2)
    category: Literal["laboratory", "examination_summary", "imaging"]
    summary_findings: str = ""
    pdf_url: Optional[str] = None
    pdf_file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None


# ---------- Feedback ----------
class ReviewCreateRequest(CamelModel):
    visit_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: str = ""


class ComplaintCreateRequest(CamelModel):
    visit_id: Optional[str] = None
    subject: str = Field(..., min_length=3)
    details: str = Field(..., min_length=3)


# ---------- Admin ----------
class VerificationUpdateRequest(CamelModel):
    status: Literal["pending", "approved", "suspended"]
    note: Optional[str] = None


class ComplaintResolveRequest(CamelModel):
    resolution_notes: str = Field(..., min_length=3)


class ComplaintStatusRequest(CamelModel):
    status: Literal["submitted", "under_review", "resolved"]


class SpecialtyCreateRequest(CamelModel):
    name: str = Field(..., min_length=2)
    description: str = ""
    icon_name: Optional[str] = None
