"""Convert ORM rows into the camelCase JSON shapes defined in the mobile app's `src/types/domain.ts`."""
from datetime import datetime, timezone
from typing import Any, Optional

from app.models.domain import (
    AuditLog,
    AvailabilitySlot,
    Complaint,
    ConsultationRecord,
    LabSample,
    Notification,
    ResultDocument,
    Review,
    Visit,
)
from app.models.user import DoctorProfile, PatientProfile, User


def iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        # SQLite drops tz info; all timestamps are written in UTC
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def enum_value(value: Any) -> Any:
    return getattr(value, "value", value)


def user_out(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": enum_value(user.role),
        "avatarUrl": user.avatar_url,
        "isVerified": user.is_verified is not False,
        "isActive": user.is_active is not False,
        "createdAt": iso(user.created_at),
    }


def patient_profile_out(user: User, profile: Optional[PatientProfile]) -> dict:
    p = profile
    coordinates = None
    if p is not None and p.latitude is not None and p.longitude is not None:
        coordinates = {"latitude": p.latitude, "longitude": p.longitude}
    return {
        "userId": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "age": p.age if p else None,
        "gender": p.gender if p else None,
        "residenceAddress": (p.residence_address if p else None) or "",
        "city": (p.city if p else None) or "",
        "country": (p.country if p else None) or "",
        "district": (p.district if p else None) or "",
        "sector": p.sector if p else None,
        "coordinates": coordinates,
        "emergencyContact": {
            "name": (p.emergency_contact_name if p else None) or "",
            "relationship": (p.emergency_contact_relationship if p else None) or "",
            "phone": (p.emergency_contact_phone if p else None) or "",
        },
        "allergies": (p.allergies if p else None) or [],
        "knownConditions": (p.known_conditions if p else None) or [],
        "currentMedication": (p.current_medication if p else None) or [],
        "consentGiven": bool(p.consent_given) if p else False,
        "consentTimestamp": iso(p.consent_timestamp) if p else None,
    }


def doctor_profile_out(
    user: User,
    profile: DoctorProfile,
    rating: float = 0.0,
    review_count: int = 0,
    config: Optional[dict] = None,
) -> dict:
    config = config or {}
    consultation_fee = profile.consultation_fee_rwf
    if consultation_fee is None:
        consultation_fee = int(config.get("defaultConsultationFee") or 0)
    travel_fee = profile.travel_fee_rwf
    if travel_fee is None:
        travel_fee = int(config.get("baseTravelFee") or 0)
    return {
        "userId": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "avatarUrl": user.avatar_url,
        "specialty": profile.specialty,
        "licenseNumber": profile.license_number,
        "qualifications": profile.qualifications or [],
        "experienceYears": profile.experience_years or 0,
        "coverageDistricts": profile.coverage_districts or [],
        "city": profile.city or "",
        "country": profile.country or "",
        "bio": profile.bio or "",
        "languages": profile.languages or [],
        "consultationFeeRwf": consultation_fee,
        "travelFeeRwf": travel_fee,
        "currency": profile.currency or config.get("defaultCurrency") or "RWF",
        "rating": round(float(rating or 0), 2),
        "reviewCount": int(review_count or 0),
        "verificationStatus": enum_value(profile.verification_status),
        "isOnline": bool(profile.is_online),
        "workingDays": profile.working_days if profile.working_days is not None else [1, 2, 3, 4, 5],
        "workingHours": {
            "start": profile.working_hours_start or "08:00",
            "end": profile.working_hours_end or "17:00",
        },
        "createdAt": iso(user.created_at),
    }


def slot_out(slot: AvailabilitySlot) -> dict:
    return {
        "id": slot.id,
        "doctorId": slot.doctor_id,
        "date": slot.date,
        "startTime": slot.start_time,
        "endTime": slot.end_time,
        "isBooked": bool(slot.is_booked),
        "isBlocked": bool(slot.is_blocked),
    }


def visit_out(visit: Visit) -> dict:
    patient = visit.patient
    doctor = visit.doctor
    doctor_profile = doctor.doctor_profile if doctor is not None else None
    coordinates = None
    if visit.latitude is not None and visit.longitude is not None:
        coordinates = {"latitude": visit.latitude, "longitude": visit.longitude}
    return {
        "id": visit.id,
        "patientId": visit.patient_id,
        "patientName": patient.name if patient else "",
        "patientPhone": patient.phone if patient else "",
        "doctorId": visit.doctor_id,
        "doctorName": doctor.name if doctor else "",
        "doctorPhone": doctor.phone if doctor else "",
        "doctorSpecialty": doctor_profile.specialty if doctor_profile else "",
        "slotId": visit.slot_id or "",
        "scheduledDate": visit.scheduled_date,
        "scheduledTime": visit.scheduled_time,
        "alternativeDate": visit.alternative_date,
        "alternativeTime": visit.alternative_time,
        "alternativeProposalNote": visit.alternative_note,
        "status": visit.status,
        "conditionDescription": visit.condition_description,
        "commonSymptoms": visit.common_symptoms or [],
        "attachmentUrls": visit.attachment_urls or [],
        "visitAddress": visit.visit_address,
        "district": visit.district or "",
        "accessInstructions": visit.access_instructions,
        "coordinates": coordinates,
        "consultationFeeRwf": visit.consultation_fee,
        "travelFeeRwf": visit.travel_fee,
        "labFeeRwf": visit.lab_fee,
        "totalFeeRwf": visit.total_fee,
        "currency": visit.currency or "RWF",
        "paymentMethod": visit.payment_method,
        "paymentStatus": visit.payment_status,
        "cancellationReason": visit.cancellation_reason,
        "declineReason": visit.decline_reason,
        "createdAt": iso(visit.created_at),
        "updatedAt": iso(visit.updated_at),
    }


def consultation_out(record: ConsultationRecord) -> dict:
    return {
        "id": record.id,
        "visitId": record.visit_id,
        "patientId": record.patient_id,
        "doctorId": record.doctor_id,
        "consultationNotes": record.consultation_notes or "",
        "physicalExamination": record.physical_examination or "",
        "diagnosis": record.diagnosis or "",
        "icdCode": record.icd_code,
        "prescriptions": record.prescriptions or [],
        "recommendations": record.recommendations or [],
        "isLabRequired": bool(record.is_lab_required),
        "requiredLabTests": record.required_lab_tests or [],
        "sampleId": record.sample_id,
        "followUpRecommended": bool(record.follow_up_recommended),
        "followUpDate": record.follow_up_date,
        "followUpNotes": record.follow_up_notes,
        "isDraft": bool(record.is_draft),
        "publishedAt": iso(record.published_at),
        "createdAt": iso(record.created_at),
        "updatedAt": iso(record.updated_at),
    }


def sample_out(sample: LabSample) -> dict:
    return {
        "id": sample.id,
        "sampleCode": sample.sample_code,
        "visitId": sample.visit_id,
        "patientId": sample.patient_id,
        "doctorId": sample.doctor_id,
        "testNames": sample.test_names or [],
        "collectionTime": iso(sample.collection_time),
        "destinationLab": sample.destination_lab,
        "status": sample.status,
        "notes": sample.notes,
    }


def result_out(result: ResultDocument) -> dict:
    sample = result.sample
    return {
        "id": result.id,
        "visitId": result.visit_id,
        "patientId": result.patient_id,
        "patientName": result.patient.name if result.patient else "",
        "doctorId": result.doctor_id,
        "doctorName": result.doctor.name if result.doctor else "",
        "sampleId": result.sample_id,
        "sampleCode": sample.sample_code if sample else None,
        "sampleCollectionTime": iso(sample.collection_time) if sample else None,
        "destinationLab": sample.destination_lab if sample else None,
        "title": result.title,
        "category": result.category,
        "summaryFindings": result.summary_findings or "",
        "status": result.status,
        "pdfUrl": result.pdf_url,
        "pdfFileName": result.pdf_file_name,
        "fileSizeBytes": result.file_size_bytes,
        "publishedAt": iso(result.published_at),
        "isViewedByPatient": bool(result.is_viewed_by_patient),
    }


def notification_out(n: Notification) -> dict:
    return {
        "id": n.id,
        "recipientUserId": n.recipient_user_id,
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "referenceId": n.reference_id,
        "isRead": bool(n.is_read),
        "createdAt": iso(n.created_at),
    }


def review_out(review: Review) -> dict:
    return {
        "id": review.id,
        "visitId": review.visit_id,
        "patientId": review.patient_id,
        "patientName": review.patient.name if review.patient else "",
        "doctorId": review.doctor_id,
        "rating": review.rating,
        "comment": review.comment or "",
        "createdAt": iso(review.created_at),
    }


def complaint_out(c: Complaint, reporter_name: Optional[str] = None) -> dict:
    return {
        "id": c.id,
        "visitId": c.visit_id,
        "reporterUserId": c.reporter_user_id,
        "reporterName": reporter_name,
        "reporterRole": c.reporter_role,
        "subject": c.subject,
        "details": c.details,
        "status": c.status,
        "resolutionNotes": c.resolution_notes,
        "createdAt": iso(c.created_at),
        "updatedAt": iso(c.updated_at),
    }


def audit_out(log: AuditLog) -> dict:
    return {
        "id": log.id,
        "timestamp": iso(log.timestamp),
        "actorUserId": log.actor_user_id,
        "actorName": log.actor_name,
        "actorRole": log.actor_role,
        "action": log.action,
        "entityType": log.entity_type,
        "entityId": log.entity_id,
        "patientId": log.patient_id,
        "details": log.details or "",
    }
