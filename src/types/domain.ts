// Domain Entities for HomeCare Mobile & Web Application
// Sourced from SRS Version 1.0 Draft

export type UserRole = 'patient' | 'doctor' | 'admin';

export type DoctorVerificationStatus = 'pending' | 'approved' | 'suspended';

export type VisitStatus =
  | 'pending'
  | 'alternative_proposed'
  | 'confirmed'
  | 'declined'
  | 'expired'
  | 'cancelled'
  | 'on_the_way'
  | 'arrived'
  | 'in_consultation'
  | 'completed';

export type SampleStatus = 'collected' | 'delivered' | 'processing' | 'completed';

export type PatientResultStatus = 'pending_sample' | 'in_lab' | 'available';

export type PaymentMethod = 'momo' | 'airtel' | 'card' | 'cash_on_visit';

export type PaymentStatus = 'pending' | 'completed' | 'refunded' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface PatientProfile {
  userId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  residenceAddress: string;
  district: string;
  sector: string;
  coordinates?: { latitude: number; longitude: number };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  allergies: string[];
  knownConditions: string[];
  currentMedication: string[];
  consentGiven: boolean;
  consentTimestamp: string;
}

export interface DoctorProfile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  specialty: string;
  licenseNumber: string;
  qualifications: string[];
  experienceYears: number;
  coverageDistricts: string[];
  bio: string;
  languages: string[];
  consultationFeeRwf: number;
  travelFeeRwf: number;
  rating: number;
  reviewCount: number;
  verificationStatus: DoctorVerificationStatus;
  isOnline: boolean;
  workingDays: number[]; // 0=Sunday, 1=Monday...
  workingHours: { start: string; end: string }; // e.g. "08:00", "18:00"
}

export interface AvailabilitySlot {
  id: string;
  doctorId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isBooked: boolean;
  isBlocked: boolean;
}

export interface VisitRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  slotId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  alternativeDate?: string;
  alternativeTime?: string;
  alternativeProposalNote?: string;
  status: VisitStatus;
  conditionDescription: string;
  commonSymptoms: string[];
  attachmentUrls?: string[];
  visitAddress: string;
  district: string;
  accessInstructions?: string; // gate code, landmark
  coordinates?: { latitude: number; longitude: number };
  consultationFeeRwf: number;
  travelFeeRwf: number;
  labFeeRwf?: number;
  totalFeeRwf: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cancellationReason?: string;
  declineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}

export interface LabSample {
  id: string;
  sampleCode: string; // e.g., "SMP-KGL-842"
  visitId: string;
  patientId: string;
  doctorId: string;
  testNames: string[];
  collectionTime: string;
  destinationLab: string;
  status: SampleStatus;
  notes?: string;
}

export interface ResultDocument {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  sampleId?: string;
  title: string;
  category: 'laboratory' | 'examination_summary' | 'imaging';
  summaryFindings: string;
  status: PatientResultStatus;
  pdfUrl: string;
  pdfFileName: string;
  fileSizeBytes: number;
  publishedAt: string;
  isViewedByPatient: boolean;
  localCachedUri?: string;
}

export interface ConsultationRecord {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  consultationNotes: string;
  physicalExamination: string;
  diagnosis: string;
  icdCode?: string;
  prescriptions: PrescriptionItem[];
  recommendations: string[];
  isLabRequired: boolean;
  requiredLabTests: string[];
  sampleId?: string;
  followUpRecommended: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  isDraft: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  recipientUserId: string;
  title: string;
  body: string;
  type: 'visit_status' | 'result_ready' | 'reminder' | 'verification' | 'system';
  referenceId?: string; // visitId or resultId
  isRead: boolean;
  createdAt: string;
}

export interface DoctorReview {
  id: string;
  visitId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface ComplaintReport {
  id: string;
  visitId: string;
  reporterUserId: string;
  reporterRole: UserRole;
  subject: string;
  details: string;
  status: 'submitted' | 'under_review' | 'resolved';
  resolutionNotes?: string;
  createdAt: string;
}

export interface MedicalAuditLog {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'PUBLISH' | 'EXPORT';
  entityType: 'consultation_record' | 'result_document' | 'patient_profile';
  entityId: string;
  patientId: string;
  details: string;
}
