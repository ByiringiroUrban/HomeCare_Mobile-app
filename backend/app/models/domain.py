"""Clinical & operational domain tables.

Status columns are plain strings (validated at the API layer) so new states can be
added without Postgres enum migrations.
"""
from sqlalchemy import Column, String, DateTime, JSON, Integer, ForeignKey, Boolean, Float, Text
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.user import generate_uuid, utcnow


class Specialty(Base):
    __tablename__ = "specialties"

    id = Column(String, primary_key=True)  # slug, e.g. "general_medicine"
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    icon_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class PlatformSetting(Base):
    __tablename__ = "platform_settings"

    key = Column(String, primary_key=True)
    value = Column(JSON, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id = Column(String, primary_key=True, default=generate_uuid)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    date = Column(String(10), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(5), nullable=False)  # HH:mm
    end_time = Column(String(5), nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False)
    is_blocked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class Visit(Base):
    __tablename__ = "visits"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    slot_id = Column(String, ForeignKey("availability_slots.id", ondelete="SET NULL"), nullable=True)
    scheduled_date = Column(String(10), nullable=False)
    scheduled_time = Column(String(5), nullable=False)
    alternative_date = Column(String(10), nullable=True)
    alternative_time = Column(String(5), nullable=True)
    alternative_note = Column(Text, nullable=True)
    status = Column(String, default="pending", index=True, nullable=False)
    condition_description = Column(Text, nullable=False)
    common_symptoms = Column(JSON, default=list)
    attachment_urls = Column(JSON, default=list)
    visit_address = Column(String, nullable=False)
    district = Column(String, nullable=True)
    access_instructions = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    consultation_fee = Column(Integer, nullable=False, default=0)
    travel_fee = Column(Integer, nullable=False, default=0)
    lab_fee = Column(Integer, nullable=True)
    total_fee = Column(Integer, nullable=False, default=0)
    currency = Column(String, nullable=True)
    payment_method = Column(String, nullable=False)
    payment_status = Column(String, default="pending", nullable=False)
    cancellation_reason = Column(Text, nullable=True)
    decline_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])


class ConsultationRecord(Base):
    __tablename__ = "consultation_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    visit_id = Column(String, ForeignKey("visits.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    consultation_notes = Column(Text, default="")
    physical_examination = Column(Text, default="")
    diagnosis = Column(Text, default="")
    icd_code = Column(String, nullable=True)
    prescriptions = Column(JSON, default=list)
    recommendations = Column(JSON, default=list)
    is_lab_required = Column(Boolean, default=False, nullable=False)
    required_lab_tests = Column(JSON, default=list)
    sample_id = Column(String, nullable=True)
    follow_up_recommended = Column(Boolean, default=False, nullable=False)
    follow_up_date = Column(String(10), nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    is_draft = Column(Boolean, default=True, nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class LabSample(Base):
    __tablename__ = "lab_samples"

    id = Column(String, primary_key=True, default=generate_uuid)
    sample_code = Column(String, unique=True, nullable=False)
    visit_id = Column(String, ForeignKey("visits.id", ondelete="CASCADE"), index=True, nullable=False)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    test_names = Column(JSON, default=list)
    collection_time = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    destination_lab = Column(String, nullable=False)
    status = Column(String, default="collected", nullable=False)
    notes = Column(Text, nullable=True)


class ResultDocument(Base):
    __tablename__ = "result_documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    visit_id = Column(String, ForeignKey("visits.id", ondelete="CASCADE"), index=True, nullable=False)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    sample_id = Column(String, ForeignKey("lab_samples.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False)
    summary_findings = Column(Text, default="")
    status = Column(String, default="available", nullable=False)
    pdf_url = Column(String, nullable=True)
    pdf_file_name = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    published_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    is_viewed_by_patient = Column(Boolean, default=False, nullable=False)

    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    sample = relationship("LabSample", foreign_keys=[sample_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    recipient_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    type = Column(String, nullable=False)
    reference_id = Column(String, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=generate_uuid)
    visit_id = Column(String, ForeignKey("visits.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    patient = relationship("User", foreign_keys=[patient_id])


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=generate_uuid)
    visit_id = Column(String, ForeignKey("visits.id", ondelete="SET NULL"), nullable=True)
    reporter_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reporter_role = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    details = Column(Text, nullable=False)
    status = Column(String, default="submitted", nullable=False)
    resolution_notes = Column(Text, nullable=True)
    resolved_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime(timezone=True), default=utcnow, index=True, nullable=False)
    actor_user_id = Column(String, nullable=False)
    actor_name = Column(String, nullable=False)
    actor_role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    patient_id = Column(String, nullable=False)
    details = Column(Text, default="")


class Payment(Base):
    """A PawaPay mobile money deposit.

    The row is written *before* calling PawaPay so the depositId always exists,
    which is what makes reconciliation possible after a network failure.
    """

    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)  # sent as depositId
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    reference = Column(String, nullable=True, index=True)  # e.g. the visit id
    amount = Column(Integer, nullable=False)
    currency = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    status = Column(String, default="CREATED", index=True, nullable=False)
    failure_code = Column(String, nullable=True)
    failure_message = Column(Text, nullable=True)
    provider_transaction_id = Column(String, nullable=True)
    environment = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    purpose = Column(String, nullable=False)  # "verify" | "reset"
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
