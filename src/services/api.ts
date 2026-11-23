// Service layer for HomeCare.
// Every call here talks to the FastAPI backend; there is no local demo data.
import Constants from 'expo-constants';
import {
  AppNotification,
  AvailabilitySlot,
  ComplaintReport,
  ConsultationRecord,
  DoctorProfile,
  DoctorReview,
  LabSample,
  MedicalAuditLog,
  PatientProfile,
  PrescriptionItem,
  ResultDocument,
  User,
  VisitRequest,
  VisitStatus,
} from '../types/domain';

// Bearer token of the signed-in user, mirrored from the auth store so services
// here can call protected endpoints without importing the store (import cycle).
let sessionToken: string | null = null;
export const setApiToken = (token: string | null) => {
  sessionToken = token;
};

// Point extra.apiBaseUrl in app.json at the deployed API
// (e.g. https://home-care-be-teal.vercel.app/api/v1).
export const API_BASE_URL = (
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ||
  'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 45000;

export class ApiError extends Error {
  status: number;
  code?: string;
  userId?: string;
  destination?: string;

  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string> | undefined) || {}),
  };
  if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch {
    throw new ApiError(
      'Cannot reach the HomeCare servers. Check your internet connection and try again.',
      0,
      'network_error'
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const detail = body?.detail ?? body;
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message ||
          (res.status === 401
            ? 'Your session has expired. Please sign in again.'
            : `Request failed (HTTP ${res.status}).`);

    const error = new ApiError(
      res.status === 401 && typeof detail !== 'object'
        ? 'Your session has expired. Please sign in again.'
        : message,
      res.status,
      typeof detail === 'object' ? detail?.code : undefined
    );
    if (typeof detail === 'object') {
      error.userId = detail?.userId;
      error.destination = detail?.destinationMasked || detail?.destination;
    }
    throw error;
  }

  return body as T;
}

function queryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'All') return;
    search.append(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : '';
}

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// ---------- Mappers (backend JSON -> app domain types) ----------

function mapUser(raw: any): User {
  return {
    id: str(raw.id),
    name: str(raw.name),
    email: str(raw.email),
    phone: str(raw.phone),
    role: raw.role === 'doctor' || raw.role === 'admin' ? raw.role : 'patient',
    avatarUrl: raw.avatarUrl ?? undefined,
    createdAt: str(raw.createdAt),
  };
}

function mapPatientProfile(raw: any): PatientProfile {
  return {
    userId: str(raw.userId),
    age: num(raw.age),
    gender:
      raw.gender === 'male' || raw.gender === 'female' || raw.gender === 'other'
        ? raw.gender
        : 'other',
    residenceAddress: str(raw.residenceAddress),
    city: str(raw.city),
    country: str(raw.country),
    district: str(raw.district),
    sector: raw.sector ?? undefined,
    coordinates: raw.coordinates ?? undefined,
    emergencyContact: {
      name: str(raw.emergencyContact?.name),
      relationship: str(raw.emergencyContact?.relationship),
      phone: str(raw.emergencyContact?.phone),
    },
    allergies: list<string>(raw.allergies),
    knownConditions: list<string>(raw.knownConditions),
    currentMedication: list<string>(raw.currentMedication),
    consentGiven: !!raw.consentGiven,
    consentTimestamp: str(raw.consentTimestamp),
  };
}

function mapDoctorProfile(raw: any): DoctorProfile {
  return {
    userId: str(raw.userId),
    name: str(raw.name),
    email: str(raw.email),
    phone: str(raw.phone),
    avatarUrl: raw.avatarUrl ?? undefined,
    specialty: str(raw.specialty),
    licenseNumber: str(raw.licenseNumber),
    qualifications: list<string>(raw.qualifications),
    experienceYears: num(raw.experienceYears),
    coverageDistricts: list<string>(raw.coverageDistricts),
    city: str(raw.city),
    country: str(raw.country),
    bio: str(raw.bio),
    languages: list<string>(raw.languages),
    consultationFeeRwf: num(raw.consultationFeeRwf),
    travelFeeRwf: num(raw.travelFeeRwf),
    currency: str(raw.currency, 'RWF'),
    rating: num(raw.rating),
    reviewCount: num(raw.reviewCount),
    verificationStatus:
      raw.verificationStatus === 'approved' || raw.verificationStatus === 'suspended'
        ? raw.verificationStatus
        : 'pending',
    isOnline: !!raw.isOnline,
    workingDays: list<number>(raw.workingDays),
    workingHours: {
      start: str(raw.workingHours?.start, '08:00'),
      end: str(raw.workingHours?.end, '17:00'),
    },
  };
}

function mapSlot(raw: any): AvailabilitySlot {
  return {
    id: str(raw.id),
    doctorId: str(raw.doctorId),
    date: str(raw.date),
    startTime: str(raw.startTime),
    endTime: str(raw.endTime),
    isBooked: !!raw.isBooked,
    isBlocked: !!raw.isBlocked,
  };
}

function mapVisit(raw: any): VisitRequest {
  return {
    id: str(raw.id),
    patientId: str(raw.patientId),
    patientName: str(raw.patientName),
    patientPhone: str(raw.patientPhone),
    doctorId: str(raw.doctorId),
    doctorName: str(raw.doctorName),
    doctorSpecialty: str(raw.doctorSpecialty),
    slotId: str(raw.slotId),
    scheduledDate: str(raw.scheduledDate),
    scheduledTime: str(raw.scheduledTime),
    alternativeDate: raw.alternativeDate ?? undefined,
    alternativeTime: raw.alternativeTime ?? undefined,
    alternativeProposalNote: raw.alternativeProposalNote ?? undefined,
    status: str(raw.status, 'pending') as VisitStatus,
    conditionDescription: str(raw.conditionDescription),
    commonSymptoms: list<string>(raw.commonSymptoms),
    attachmentUrls: list<string>(raw.attachmentUrls),
    visitAddress: str(raw.visitAddress),
    district: str(raw.district),
    country: str(raw.country),
    currency: str(raw.currency, 'RWF'),
    accessInstructions: raw.accessInstructions ?? undefined,
    coordinates: raw.coordinates ?? undefined,
    consultationFeeRwf: num(raw.consultationFeeRwf),
    travelFeeRwf: num(raw.travelFeeRwf),
    labFeeRwf: raw.labFeeRwf ?? undefined,
    totalFeeRwf: num(raw.totalFeeRwf),
    paymentMethod: raw.paymentMethod,
    paymentStatus: raw.paymentStatus === 'completed' || raw.paymentStatus === 'failed' || raw.paymentStatus === 'refunded' ? raw.paymentStatus : 'pending',
    cancellationReason: raw.cancellationReason ?? undefined,
    declineReason: raw.declineReason ?? undefined,
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

function mapConsultation(raw: any): ConsultationRecord {
  return {
    id: str(raw.id),
    visitId: str(raw.visitId),
    patientId: str(raw.patientId),
    doctorId: str(raw.doctorId),
    consultationNotes: str(raw.consultationNotes),
    physicalExamination: str(raw.physicalExamination),
    diagnosis: str(raw.diagnosis),
    icdCode: raw.icdCode ?? undefined,
    prescriptions: list<PrescriptionItem>(raw.prescriptions),
    recommendations: list<string>(raw.recommendations),
    isLabRequired: !!raw.isLabRequired,
    requiredLabTests: list<string>(raw.requiredLabTests),
    sampleId: raw.sampleId ?? undefined,
    followUpRecommended: !!raw.followUpRecommended,
    followUpDate: raw.followUpDate ?? undefined,
    followUpNotes: raw.followUpNotes ?? undefined,
    isDraft: !!raw.isDraft,
    publishedAt: raw.publishedAt ?? undefined,
    createdAt: str(raw.createdAt),
    updatedAt: str(raw.updatedAt),
  };
}

function mapSample(raw: any): LabSample {
  return {
    id: str(raw.id),
    sampleCode: str(raw.sampleCode),
    visitId: str(raw.visitId),
    patientId: str(raw.patientId),
    doctorId: str(raw.doctorId),
    testNames: list<string>(raw.testNames),
    collectionTime: str(raw.collectionTime),
    destinationLab: str(raw.destinationLab),
    status: raw.status || 'collected',
    notes: raw.notes ?? undefined,
  };
}

function mapResult(raw: any): ResultDocument {
  return {
    id: str(raw.id),
    visitId: str(raw.visitId),
    patientId: str(raw.patientId),
    patientName: str(raw.patientName),
    doctorId: str(raw.doctorId),
    doctorName: str(raw.doctorName),
    sampleId: raw.sampleId ?? undefined,
    title: str(raw.title),
    category: raw.category || 'laboratory',
    summaryFindings: str(raw.summaryFindings),
    status: raw.status || 'available',
    pdfUrl: str(raw.pdfUrl),
    pdfFileName: str(raw.pdfFileName),
    fileSizeBytes: num(raw.fileSizeBytes),
    publishedAt: str(raw.publishedAt),
    isViewedByPatient: !!raw.isViewedByPatient,
  };
}

function mapReview(raw: any): DoctorReview {
  return {
    id: str(raw.id),
    visitId: str(raw.visitId),
    patientId: str(raw.patientId),
    patientName: str(raw.patientName),
    doctorId: str(raw.doctorId),
    rating: num(raw.rating),
    comment: str(raw.comment),
    createdAt: str(raw.createdAt),
  };
}

function mapNotification(raw: any): AppNotification {
  return {
    id: str(raw.id),
    recipientUserId: str(raw.recipientUserId),
    title: str(raw.title),
    body: str(raw.body),
    type: raw.type || 'system',
    referenceId: raw.referenceId ?? undefined,
    isRead: !!raw.isRead,
    createdAt: str(raw.createdAt),
  };
}

function mapComplaint(raw: any): ComplaintReport {
  return {
    id: str(raw.id),
    visitId: str(raw.visitId),
    reporterUserId: str(raw.reporterUserId),
    reporterRole: raw.reporterRole || 'patient',
    subject: str(raw.subject),
    details: str(raw.details),
    status:
      raw.status === 'under_review' || raw.status === 'resolved' ? raw.status : 'submitted',
    resolutionNotes: raw.resolutionNotes ?? undefined,
    createdAt: str(raw.createdAt),
  };
}

// ---------- Auth ----------

export interface OtpChallenge {
  userId: string;
  destination?: string;
  emailSent: boolean;
  requiresVerification: boolean;
}

export interface PasswordResetInfo {
  message: string;
  destination?: string;
  emailSent: boolean;
  expiresInMinutes: number;
}

export const authService = {
  async login(identifier: string, password: string) {
    const data = await request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifier.trim(), password }),
    });
    return { user: mapUser(data.user), token: str(data.accessToken || data.access_token) };
  },

  async verifyOtp(code: string, userId: string) {
    const data = await request<any>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ userId, code: code.trim() }),
    });
    return { user: mapUser(data.user), token: str(data.accessToken || data.access_token) };
  },

  async resendOtp(userId: string) {
    const data = await request<any>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    return { destination: data.destination, emailSent: !!data.emailSent };
  },

  async registerPatient(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    country?: string;
    city?: string;
    district?: string;
    consentGiven?: boolean;
  }): Promise<OtpChallenge> {
    const payload = await request<any>('/auth/register/patient', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        country: data.country,
        city: data.city,
        district: data.district,
        consentGiven: data.consentGiven ?? true,
      }),
    });
    return {
      userId: str(payload.user?.id),
      destination: payload.destination,
      emailSent: !!payload.emailSent,
      requiresVerification: true,
    };
  },

  async registerDoctor(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    specialty: string;
    licenseNumber: string;
    qualifications: string[];
    experienceYears: number;
    coverageDistricts: string[];
    country?: string;
    city?: string;
  }): Promise<OtpChallenge> {
    const payload = await request<any>('/auth/register/doctor', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        specialty: data.specialty,
        licenseNumber: data.licenseNumber,
        qualifications: data.qualifications,
        experienceYears: data.experienceYears,
        coverageDistricts: data.coverageDistricts,
        country: data.country,
        city: data.city,
      }),
    });
    return {
      userId: str(payload.user?.id),
      destination: payload.destination,
      emailSent: !!payload.emailSent,
      requiresVerification: true,
    };
  },

  async getCurrentUser(_userId?: string) {
    return mapUser(await request<any>('/auth/me'));
  },

  async requestPasswordReset(identifier: string): Promise<PasswordResetInfo> {
    const data = await request<any>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier: identifier.trim() }),
    });
    return {
      message: str(data.message),
      destination: data.destination,
      emailSent: !!data.emailSent,
      expiresInMinutes: num(data.expiresInMinutes, 10),
    };
  },

  async resetPasswordWithCode(data: { identifier: string; code: string; newPassword: string }) {
    await request<any>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({
        identifier: data.identifier.trim(),
        code: data.code.trim(),
        newPassword: data.newPassword,
      }),
    });
  },
};

// ---------- Patient ----------

export interface SpecialtyItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
  isActive: boolean;
  doctorCount: number;
}

export const patientService = {
  async getProfile(_patientId?: string): Promise<PatientProfile | null> {
    return mapPatientProfile(await request<any>('/patient/profile'));
  },

  async updateProfile(_patientId: string, partial: Partial<PatientProfile>) {
    return mapPatientProfile(
      await request<any>('/patient/profile', {
        method: 'PUT',
        body: JSON.stringify(partial),
      })
    );
  },

  async getSpecialties(): Promise<SpecialtyItem[]> {
    const rows = await request<any[]>('/meta/specialties');
    return rows.map((s: any) => ({
      id: str(s.id),
      name: str(s.name),
      description: str(s.description),
      iconName: str(s.iconName, 'stethoscope'),
      isActive: !!s.isActive,
      doctorCount: num(s.doctorCount),
    }));
  },

  async searchDoctors(params: {
    query?: string;
    country?: string;
    specialty?: string;
    district?: string;
    language?: string;
    maxFee?: number;
    minRating?: number;
    availableNow?: boolean;
  }): Promise<DoctorProfile[]> {
    const rows = await request<any[]>(
      `/doctors${queryString({
        query: params.query,
        country: params.country,
        specialty: params.specialty,
        district: params.district,
        language: params.language,
        maxFee: params.maxFee,
        minRating: params.minRating,
        availableNow: params.availableNow ? true : undefined,
      })}`
    );
    return rows.map(mapDoctorProfile);
  },

  async getDoctorDetails(doctorId: string) {
    const data = await request<any>(`/doctors/${encodeURIComponent(doctorId)}`);
    return {
      doctor: mapDoctorProfile(data.doctor),
      slots: list<any>(data.slots).map(mapSlot),
      reviews: list<any>(data.reviews).map(mapReview),
    };
  },

  async createVisitRequest(
    data: Omit<VisitRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<VisitRequest> {
    return mapVisit(
      await request<any>('/patient/visits', {
        method: 'POST',
        body: JSON.stringify({
          doctorId: data.doctorId,
          slotId: data.slotId || undefined,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          conditionDescription: data.conditionDescription,
          commonSymptoms: data.commonSymptoms,
          attachmentUrls: data.attachmentUrls || [],
          visitAddress: data.visitAddress,
          district: data.district,
          accessInstructions: data.accessInstructions,
          coordinates: data.coordinates,
          paymentMethod: data.paymentMethod,
        }),
      })
    );
  },

  async getVisits(_patientId?: string) {
    const rows = await request<any[]>('/patient/visits');
    return rows.map(mapVisit);
  },

  async getVisitDetails(visitId: string) {
    return mapVisit(await request<any>(`/visits/${encodeURIComponent(visitId)}`));
  },

  async cancelVisit(visitId: string, _patientId: string, reason: string) {
    return mapVisit(
      await request<any>(`/patient/visits/${encodeURIComponent(visitId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    );
  },

  async rescheduleVisit(visitId: string, _patientId: string, newDate: string, newTime: string) {
    return mapVisit(
      await request<any>(`/patient/visits/${encodeURIComponent(visitId)}/reschedule`, {
        method: 'POST',
        body: JSON.stringify({ newDate, newTime }),
      })
    );
  },

  async acceptAlternativeTime(visitId: string, _patientId: string) {
    return mapVisit(
      await request<any>(`/patient/visits/${encodeURIComponent(visitId)}/accept-alternative`, {
        method: 'POST',
      })
    );
  },

  async rejectAlternativeTime(visitId: string, _patientId: string, reason?: string) {
    return mapVisit(
      await request<any>(`/patient/visits/${encodeURIComponent(visitId)}/reject-alternative`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Alternative time rejected by patient' }),
      })
    );
  },

  async getRecords(_patientId?: string) {
    const data = await request<any>('/patient/records');
    return {
      consultations: list<any>(data.consultations).map(mapConsultation),
      results: list<any>(data.results).map(mapResult),
    };
  },

  async getResultDocument(resultId: string) {
    return mapResult(await request<any>(`/patient/results/${encodeURIComponent(resultId)}`));
  },

  async submitReview(review: Omit<DoctorReview, 'id' | 'createdAt'>) {
    return mapReview(
      await request<any>('/patient/reviews', {
        method: 'POST',
        body: JSON.stringify({
          visitId: review.visitId,
          rating: review.rating,
          comment: review.comment,
        }),
      })
    );
  },

  async submitComplaint(complaint: Omit<ComplaintReport, 'id' | 'createdAt' | 'status'>) {
    return mapComplaint(
      await request<any>('/complaints', {
        method: 'POST',
        body: JSON.stringify({
          visitId: complaint.visitId || undefined,
          subject: complaint.subject,
          details: complaint.details,
        }),
      })
    );
  },
};

// ---------- Doctor ----------

export interface DoctorPatientSummary extends PatientProfile {
  name: string;
  email: string;
  phone: string;
  visitCount: number;
  lastVisitDate?: string;
}

async function upsertConsultation(
  visitId: string,
  data: {
    consultationNotes?: string;
    physicalExamination?: string;
    diagnosis?: string;
    icdCode?: string;
    prescriptions?: PrescriptionItem[];
    recommendations?: string[];
    isLabRequired?: boolean;
    requiredLabTests?: string[];
    sampleId?: string;
    followUpRecommended?: boolean;
    followUpDate?: string;
    followUpNotes?: string;
  },
  publish: boolean
) {
  return mapConsultation(
    await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/consultation`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, publish }),
    })
  );
}

export const doctorService = {
  async getProfile(_doctorId?: string): Promise<DoctorProfile | null> {
    return mapDoctorProfile(await request<any>('/doctor/profile'));
  },

  async toggleOnline(_doctorId: string, isOnline: boolean) {
    return mapDoctorProfile(
      await request<any>('/doctor/online', {
        method: 'PUT',
        body: JSON.stringify({ isOnline }),
      })
    );
  },

  async getVisits(_doctorId?: string) {
    const rows = await request<any[]>('/doctor/visits');
    return rows.map(mapVisit);
  },

  async getSlots(_doctorId?: string) {
    const rows = await request<any[]>('/doctor/slots');
    return rows.map(mapSlot);
  },

  async addSlot(_doctorId: string, date: string, startTime: string, endTime: string) {
    return mapSlot(
      await request<any>('/doctor/slots', {
        method: 'POST',
        body: JSON.stringify({ date, startTime, endTime }),
      })
    );
  },

  async removeSlot(slotId: string) {
    await request<void>(`/doctor/slots/${encodeURIComponent(slotId)}`, { method: 'DELETE' });
  },

  async acceptVisit(visitId: string, _doctorId?: string) {
    return mapVisit(
      await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/accept`, {
        method: 'POST',
      })
    );
  },

  async declineVisit(visitId: string, _doctorId: string, reason: string) {
    return mapVisit(
      await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    );
  },

  async proposeAlternativeTime(
    visitId: string,
    _doctorId: string,
    alternativeDate: string,
    alternativeTime: string,
    note?: string
  ) {
    return mapVisit(
      await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/propose`, {
        method: 'POST',
        body: JSON.stringify({ alternativeDate, alternativeTime, note }),
      })
    );
  },

  async updateVisitExecutionStatus(visitId: string, _doctorId: string, status: VisitStatus) {
    return mapVisit(
      await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
    );
  },

  async getConsultationRecord(visitId: string) {
    const data = await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/consultation`);
    return data ? mapConsultation(data) : null;
  },

  async saveConsultationDraft(
    data: Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDraft'>,
    _actor?: User
  ) {
    return upsertConsultation(data.visitId, data, false);
  },

  async publishConsultationRecord(
    data: Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDraft'>,
    _actor?: User
  ) {
    return upsertConsultation(data.visitId, data, true);
  },

  async sendPrescriptionInCall(
    data: { visitId: string; patientId: string; items: PrescriptionItem[] },
    _actor?: User
  ) {
    const existing = await doctorService.getConsultationRecord(data.visitId);
    return upsertConsultation(
      data.visitId,
      {
        consultationNotes:
          existing?.consultationNotes ||
          'Medication prescribed during the online video consultation.',
        physicalExamination: existing?.physicalExamination || '',
        diagnosis: existing?.diagnosis || 'Online consultation — prescription issued',
        icdCode: existing?.icdCode,
        prescriptions: [...(existing?.prescriptions || []), ...data.items],
        recommendations: existing?.recommendations || [],
        isLabRequired: existing?.isLabRequired || false,
        requiredLabTests: existing?.requiredLabTests || [],
        sampleId: existing?.sampleId,
        followUpRecommended: existing?.followUpRecommended || false,
        followUpDate: existing?.followUpDate,
        followUpNotes: existing?.followUpNotes,
      },
      true
    );
  },

  async createSample(
    visitId: string,
    data: { testNames: string[]; destinationLab: string; notes?: string }
  ) {
    return mapSample(
      await request<any>(`/doctor/visits/${encodeURIComponent(visitId)}/samples`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    );
  },

  async publishLabResult(
    resultData: {
      visitId: string;
      patientId: string;
      patientName: string;
      doctorId: string;
      doctorName: string;
      sampleId?: string;
      sampleCode?: string;
      title: string;
      category: 'laboratory' | 'examination_summary' | 'imaging';
      summaryFindings: string;
      pdfUrl?: string;
      pdfFileName?: string;
      fileSizeBytes?: number;
    },
    _actor?: User
  ) {
    return mapResult(
      await request<any>('/doctor/results', {
        method: 'POST',
        body: JSON.stringify({
          visitId: resultData.visitId,
          sampleId: resultData.sampleId,
          title: resultData.title,
          category: resultData.category,
          summaryFindings: resultData.summaryFindings,
          pdfUrl: resultData.pdfUrl,
          pdfFileName: resultData.pdfFileName,
          fileSizeBytes: resultData.fileSizeBytes,
        }),
      })
    );
  },

  async getPatients(): Promise<DoctorPatientSummary[]> {
    const rows = await request<any[]>('/doctor/patients');
    return rows.map((raw) => ({
      ...mapPatientProfile(raw),
      name: str(raw.name),
      email: str(raw.email),
      phone: str(raw.phone),
      visitCount: num(raw.visitCount),
      lastVisitDate: raw.lastVisitDate ?? undefined,
    }));
  },

  async getPatient(patientId: string): Promise<PatientProfile> {
    return mapPatientProfile(
      await request<any>(`/doctor/patients/${encodeURIComponent(patientId)}`)
    );
  },
};

// ---------- Notifications ----------

export const notificationService = {
  async getAll() {
    const rows = await request<any[]>('/notifications');
    return rows.map(mapNotification);
  },

  async markRead(notificationId: string) {
    await request<any>(`/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
    });
  },

  async markAllRead() {
    await request<any>('/notifications/read-all', { method: 'POST' });
  },
};

// ---------- Platform configuration ----------

export interface PlatformConfig {
  platformName?: string;
  operatingRegion?: string;
  emergencyPhone?: string;
  emergencyPhones?: Record<string, string>;
  cancellationWindowHours?: number;
  defaultConsultationFee?: number;
  baseTravelFee?: number;
  defaultCurrency?: string;
  coverageDistricts?: string[];
  languages?: string[];
  commonSymptoms?: string[];
  [key: string]: unknown;
}

export const metaService = {
  async getConfig(): Promise<PlatformConfig> {
    return request<PlatformConfig>('/meta/config');
  },
};

// ---------- Admin ----------

export interface AdminMetrics {
  totalVisits: number;
  completedVisits: number;
  activeVisits: number;
  grossRevenueRwf: number;
  revenueByCurrency: Record<string, number>;
  markets: number;
  avgRating: number;
  pendingVerifications: number;
  totalDoctors?: number;
  approvedDoctors?: number;
  suspendedDoctors?: number;
}

export const adminService = {
  async getAllDoctors() {
    const rows = await request<any[]>('/admin/doctors');
    return rows.map(mapDoctorProfile);
  },

  async updateDoctorVerification(
    doctorId: string,
    status: 'approved' | 'pending' | 'suspended'
  ) {
    return mapDoctorProfile(
      await request<any>(`/admin/doctors/${encodeURIComponent(doctorId)}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    );
  },

  async getAllVisits() {
    const rows = await request<any[]>('/admin/visits');
    return rows.map(mapVisit);
  },

  async getComplaints() {
    const rows = await request<any[]>('/admin/complaints');
    return rows.map(mapComplaint);
  },

  async resolveComplaint(complaintId: string, resolutionNotes: string) {
    return mapComplaint(
      await request<any>(`/admin/complaints/${encodeURIComponent(complaintId)}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolutionNotes }),
      })
    );
  },

  async getAuditLogs(): Promise<MedicalAuditLog[]> {
    return request<MedicalAuditLog[]>('/admin/audit-logs');
  },

  async getPlatformMetrics(): Promise<AdminMetrics> {
    const raw = await request<any>('/admin/metrics');
    return {
      totalVisits: num(raw.totalVisits),
      completedVisits: num(raw.completedVisits),
      activeVisits: num(raw.activeVisits),
      grossRevenueRwf: num(raw.grossRevenueRwf),
      revenueByCurrency: raw.revenueByCurrency ?? {},
      markets: num(raw.markets),
      avgRating: num(raw.avgRating),
      pendingVerifications: num(raw.pendingVerifications),
      totalDoctors: num(raw.totalDoctors),
      approvedDoctors: num(raw.approvedDoctors),
      suspendedDoctors: num(raw.suspendedDoctors),
    };
  },
};
