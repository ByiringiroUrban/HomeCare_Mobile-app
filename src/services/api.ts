// Asynchronous Service Contracts for HomeCare
// Designed for seamless transition to future Node.js REST API
import {
  User,
  PatientProfile,
  DoctorProfile,
  AvailabilitySlot,
  VisitRequest,
  ConsultationRecord,
  LabSample,
  ResultDocument,
  AppNotification,
  DoctorReview,
  ComplaintReport,
  MedicalAuditLog,
  VisitStatus,
  PrescriptionItem,
} from '../types/domain';
import Constants from 'expo-constants';
import { SpecialtyItem, DEMO_USERS } from '../mock/fixtures';
import { getCountryConfig } from '../constants/theme';
import { mockDomainStore } from '../mock/mockDomainStore';

const SIMULATED_LATENCY_MS = 250;

// Bearer token of the signed-in user, mirrored from the auth store so services
// here can call protected endpoints without importing the store (import cycle).
let sessionToken: string | null = null;
export const setApiToken = (token: string | null) => {
  sessionToken = token;
};

const delay = (ms = SIMULATED_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

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

export interface AuthService {
  login(identifier: string, demoRole?: string): Promise<{ user: User; token: string }>;
  verifyOtp(code: string, userId: string): Promise<{ user: User; token: string }>;
  resendOtp(userId: string): Promise<{ destination?: string; emailSent: boolean }>;
  registerPatient(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    country?: string;
    city?: string;
    district?: string;
    consentGiven?: boolean;
  }): Promise<OtpChallenge>;
  registerDoctor(data: {
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
  }): Promise<OtpChallenge>;
  getCurrentUser(userId: string): Promise<User | null>;
  requestPasswordReset(identifier: string): Promise<PasswordResetInfo>;
  resetPasswordWithCode(data: { identifier: string; code: string; newPassword: string }): Promise<void>;
}

// Live Backend API base URL. Point extra.apiBaseUrl in app.json at the deployed
// API (e.g. https://home-care-be-teal.vercel.app/api/v1) to use it from devices.
export const API_BASE_URL = (
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ||
  'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

/** Backend returns snake_case profile fields; the app works with camelCase. */
function mapApiUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    role: raw.role,
    avatarUrl: raw.avatar_url ?? raw.avatarUrl,
    createdAt: raw.created_at ?? raw.createdAt,
  };
}

/**
 * The seeded backend accounts mirror DEMO_USERS. Reuse the demo identity for
 * those emails so the local (mock) clinical data still resolves by user id,
 * while the backend token is kept for real API calls.
 */
function resolveSessionUser(raw: any): User {
  const mapped = mapApiUser(raw);
  const demo = Object.values(DEMO_USERS).find(
    (u) => u.email.toLowerCase() === (mapped.email || '').toLowerCase()
  );
  return demo ?? mapped;
}

async function apiErrorDetail(res: Response): Promise<any> {
  const body = await res.json().catch(() => ({}));
  return body?.detail ?? body;
}

function isNetworkError(err: any): boolean {
  const message = String(err?.message || '').toLowerCase();
  return err instanceof TypeError || message.includes('fetch') || message.includes('network');
}

export const authService: AuthService = {
  async login(identifier: string, passwordOrRole: string = 'Password123!') {
    // Check if identifier or passwordOrRole corresponds to a known demo user key
    let demoKey: string | undefined;
    if (identifier && identifier in DEMO_USERS) {
      demoKey = identifier;
    } else if (passwordOrRole && passwordOrRole in DEMO_USERS) {
      demoKey = passwordOrRole;
    }

    let effectiveIdentifier = identifier;
    let effectivePassword = passwordOrRole;

    if (demoKey && DEMO_USERS[demoKey]) {
      effectiveIdentifier = DEMO_USERS[demoKey].email;
      if (demoKey === 'admin') {
        effectivePassword = 'AdminHomeCare2026!';
      } else if (demoKey.startsWith('doctor')) {
        effectivePassword = 'Doctor123!';
      } else {
        effectivePassword = 'Password123!';
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: effectiveIdentifier, password: effectivePassword }),
      });
      if (res.ok) {
        const data = await res.json();
        return { user: resolveSessionUser(data.user), token: data.accessToken || data.access_token };
      }
      const detail = await apiErrorDetail(res);
      const error: any = new Error(
        typeof detail === 'string' ? detail : detail?.message || 'Unable to sign in right now.'
      );
      error.code =
        (typeof detail === 'object' && detail?.code) ||
        (res.status === 401 ? 'invalid_credentials' : 'login_failed');
      error.userId = typeof detail === 'object' ? detail?.userId : undefined;
      error.destination =
        typeof detail === 'object' ? detail?.destinationMasked || detail?.destination : undefined;
      throw error;
    } catch (err: any) {
      // Explicit auth answers (bad password, unverified account) must reach the UI;
      // only transport failures fall back to the local demo store.
      if (err?.code) throw err;
      if (!isNetworkError(err)) throw err;
    }

    await delay();
    if (demoKey && DEMO_USERS[demoKey]) {
      const user = DEMO_USERS[demoKey];
      return { user, token: `jwt-${user.id}-${Date.now()}` };
    }

    const found = mockDomainStore.getUserByEmailOrPhone(effectiveIdentifier);
    if (!found) {
      throw new Error('Invalid credentials or unregistered account.');
    }
    return { user: found, token: `jwt-${found.id}-${Date.now()}` };
  },

  async verifyOtp(code: string, userId?: string) {
    if (userId) {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, code: code.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          return { user: resolveSessionUser(data.user), token: data.accessToken || data.access_token || '' };
        }
        const detail = await apiErrorDetail(res);
        throw new Error(
          typeof detail === 'string' ? detail : detail?.message || 'Invalid or expired verification code.'
        );
      } catch (err: any) {
        if (!isNetworkError(err)) throw err;
      }
    }
    await delay(150);
    if (code.trim() !== '123456') {
      throw new Error('Invalid verification code. Please try again.');
    }
    const user = userId ? mockDomainStore.getUser(userId) : null;
    if (!user) throw new Error('Invalid or expired verification code.');
    return { user, token: `jwt-${user.id}-${Date.now()}` };
  },

  async resendOtp(userId: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        return { destination: data.destination, emailSent: !!data.emailSent };
      }
      const detail = await apiErrorDetail(res);
      throw new Error(typeof detail === 'string' ? detail : detail?.message || 'Could not resend the code.');
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
    await delay(200);
    return { emailSent: false };
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
  }) {
    const market = getCountryConfig(data.country);
    const city = data.city || market.capitalCity;
    const district = data.district || market.districts[0];
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register/patient`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email || `${data.phone.replace(/[^0-9]/g, '')}@phone.homecare.rw`,
          phone: data.phone,
          password: data.password,
          consentGiven: data.consentGiven ?? true,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        const user = mapApiUser(payload.user ?? payload);
        // Also register in local cache store so subsequent visits can read it
        const profile: PatientProfile = {
          userId: user.id,
          age: 30,
          gender: 'other',
          residenceAddress: `${district}, ${city}`,
          country: market.code,
          city,
          district,
          emergencyContact: { name: 'Next of kin', relationship: 'Family', phone: data.phone },
          allergies: [],
          knownConditions: [],
          currentMedication: [],
          consentGiven: true,
          consentTimestamp: new Date().toISOString(),
        };
        mockDomainStore.registerPatient(user, profile);
        return {
          userId: user.id,
          destination: payload.destination ?? data.email,
          emailSent: !!payload.emailSent,
          requiresVerification: true,
        };
      } else {
        const detail = await apiErrorDetail(res);
        throw new Error(
          typeof detail === 'string' ? detail : detail?.message || 'Registration failed. Please try again.'
        );
      }
    } catch (e: any) {
      if (!isNetworkError(e)) throw e;
    }

    await delay(300);
    const userId = `patient-${Date.now().toString().slice(-4)}`;
    const user: User = {
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'patient',
      createdAt: new Date().toISOString(),
    };
    const profile: PatientProfile = {
      userId,
      age: 30,
      gender: 'other',
      residenceAddress: `${district}, ${city}`,
      country: market.code,
      city,
      district,
      emergencyContact: {
        name: 'Emergency Contact',
        relationship: 'Next of kin',
        phone: `${market.phonePrefix} 788 000 000`,
      },
      allergies: [],
      knownConditions: [],
      currentMedication: [],
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    };
    mockDomainStore.registerPatient(user, profile);
    return { userId, destination: data.email, emailSent: false, requiresVerification: true };
  },


  async registerDoctor(data) {
    const market = getCountryConfig(data.country);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register/doctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          specialty: data.specialty,
          licenseNumber: data.licenseNumber,
          experienceYears: data.experienceYears,
          qualifications: data.qualifications,
          coverageDistricts: data.coverageDistricts,
          country: market.code,
          city: market.capitalCity,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        const user = mapApiUser(payload.user ?? payload);
        // Mirror the new doctor into the local demo store so the in-app admin
        // queue and patient directory can see the account that was just created.
        mockDomainStore.registerDoctor(user, {
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          specialty: data.specialty,
          licenseNumber: data.licenseNumber,
          qualifications: data.qualifications,
          experienceYears: data.experienceYears,
          coverageDistricts: data.coverageDistricts,
          country: market.code,
          city: market.capitalCity,
          currency: market.currency,
          bio: `Board-registered specialist physician offering home visits in ${market.capitalCity}.`,
          languages: market.languages.slice(0, 2),
          consultationFeeRwf: market.baseTravelFee * 5,
          travelFeeRwf: market.baseTravelFee,
          rating: 0,
          reviewCount: 0,
          verificationStatus: 'pending',
          isOnline: false,
          workingDays: [1, 2, 3, 4, 5],
          workingHours: { start: '08:00', end: '17:00' },
        });
        return {
          userId: user.id,
          destination: payload.destination ?? data.email,
          emailSent: !!payload.emailSent,
          requiresVerification: true,
        };
      }
      const detail = await apiErrorDetail(res);
      throw new Error(
        typeof detail === 'string' ? detail : detail?.message || 'Doctor onboarding failed. Please try again.'
      );
    } catch (e: any) {
      if (!isNetworkError(e)) throw e;
    }

    await delay(350);
    const userId = `doctor-${Date.now().toString().slice(-4)}`;
    const user: User = {
      id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'doctor',
      createdAt: new Date().toISOString(),
    };
    const profile: DoctorProfile = {
      userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      specialty: data.specialty,
      licenseNumber: data.licenseNumber,
      qualifications: data.qualifications,
      experienceYears: data.experienceYears,
      coverageDistricts: data.coverageDistricts,
      country: market.code,
      city: market.capitalCity,
      currency: market.currency,
      bio: `Board-registered specialist physician offering home visits in ${market.capitalCity}.`,
      languages: market.languages.slice(0, 2),
      consultationFeeRwf: market.baseTravelFee * 5,
      travelFeeRwf: market.baseTravelFee,
      rating: 0,
      reviewCount: 0,
      verificationStatus: 'pending', // Doctors start pending until admin review
      isOnline: false,
      workingDays: [1, 2, 3, 4, 5],
      workingHours: { start: '08:00', end: '17:00' },
    };
    mockDomainStore.registerDoctor(user, profile);
    return { userId, destination: data.email, emailSent: false, requiresVerification: true };
  },

  async getCurrentUser(userId: string) {
    await delay(100);
    return mockDomainStore.getUser(userId) || null;
  },

  async requestPasswordReset(identifier: string) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          message: data.message,
          destination: data.destination,
          emailSent: !!data.emailSent,
          expiresInMinutes: data.expiresInMinutes || 10,
        };
      }
      const detail = await apiErrorDetail(res);
      throw new Error(
        typeof detail === 'string' ? detail : detail?.message || 'Could not send the reset code.'
      );
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
    await delay(250);
    return {
      message: 'If the account exists, a reset code has been sent by email.',
      destination: undefined,
      emailSent: false,
      expiresInMinutes: 10,
    };
  },

  async resetPasswordWithCode({ identifier, code, newPassword }: { identifier: string; code: string; newPassword: string }) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), code: code.trim(), newPassword }),
      });
      if (res.ok) return;
      const detail = await apiErrorDetail(res);
      throw new Error(
        typeof detail === 'string' ? detail : detail?.message || 'Invalid or expired verification code.'
      );
    } catch (err: any) {
      if (!isNetworkError(err)) throw err;
    }
    await delay(200);
    if (code.trim() !== '123456') {
      throw new Error('Invalid or expired verification code.');
    }
  },
};

export interface PatientService {
  getProfile(patientId: string): Promise<PatientProfile | null>;
  updateProfile(patientId: string, partial: Partial<PatientProfile>): Promise<PatientProfile>;
  getSpecialties(): Promise<SpecialtyItem[]>;
  searchDoctors(params: {
    query?: string;
    country?: string;
    specialty?: string;
    district?: string;
    language?: string;
    maxFee?: number;
    minRating?: number;
    availableNow?: boolean;
  }): Promise<DoctorProfile[]>;
  getDoctorDetails(doctorId: string): Promise<{ doctor: DoctorProfile; slots: AvailabilitySlot[]; reviews: DoctorReview[] }>;
  createVisitRequest(data: Omit<VisitRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<VisitRequest>;
  getVisits(patientId: string): Promise<VisitRequest[]>;
  getVisitDetails(visitId: string): Promise<VisitRequest>;
  cancelVisit(visitId: string, patientId: string, reason: string): Promise<VisitRequest>;
  rescheduleVisit(visitId: string, patientId: string, newDate: string, newTime: string): Promise<VisitRequest>;
  acceptAlternativeTime(visitId: string, patientId: string): Promise<VisitRequest>;
  rejectAlternativeTime(visitId: string, patientId: string, reason?: string): Promise<VisitRequest>;
  getRecords(patientId: string): Promise<{ consultations: ConsultationRecord[]; results: ResultDocument[] }>;
  getResultDocument(resultId: string): Promise<ResultDocument>;
  submitReview(review: Omit<DoctorReview, 'id' | 'createdAt'>): Promise<DoctorReview>;
  submitComplaint(complaint: Omit<ComplaintReport, 'id' | 'createdAt' | 'status'>): Promise<ComplaintReport>;
}

export const patientService: PatientService = {
  async getProfile(patientId: string) {
    await delay(150);
    return mockDomainStore.getPatientProfile(patientId) || null;
  },

  async updateProfile(patientId: string, partial: Partial<PatientProfile>) {
    await delay(200);
    return mockDomainStore.updatePatientProfile(patientId, partial);
  },

  async getSpecialties() {
    await delay(100);
    return mockDomainStore.getSpecialties();
  },

  async searchDoctors(params) {
    await delay(200);
    let docs = mockDomainStore.getAllDoctors(false);

    if (params.query) {
      const q = params.query.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.bio.toLowerCase().includes(q)
      );
    }
    if (params.country && params.country !== 'All') {
      docs = docs.filter((d) => d.country === params.country);
    }
    if (params.specialty && params.specialty !== 'All') {
      docs = docs.filter((d) => d.specialty.toLowerCase() === params.specialty!.toLowerCase());
    }
    if (params.district && params.district !== 'All') {
      docs = docs.filter((d) => d.coverageDistricts.includes(params.district!));
    }
    if (params.language && params.language !== 'All') {
      docs = docs.filter((d) => d.languages.includes(params.language!));
    }
    if (params.maxFee) {
      docs = docs.filter((d) => d.consultationFeeRwf <= params.maxFee!);
    }
    if (params.minRating) {
      docs = docs.filter((d) => d.rating >= params.minRating!);
    }
    if (params.availableNow) {
      docs = docs.filter((d) => d.isOnline);
    }

    return docs;
  },

  async getDoctorDetails(doctorId: string) {
    await delay(150);
    const doctor = mockDomainStore.getDoctor(doctorId);
    if (!doctor) throw new Error('Doctor not found');
    const slots = mockDomainStore.getDoctorSlots(doctorId);
    const reviews = mockDomainStore.getReviewsForDoctor(doctorId);
    return { doctor, slots, reviews };
  },

  async createVisitRequest(data) {
    await delay(300);
    const id = `visit-${Date.now().toString().slice(-4)}`;
    const request: VisitRequest = {
      ...data,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockDomainStore.createVisitRequest(request);
  },

  async getVisits(patientId: string) {
    await delay(150);
    return mockDomainStore.getVisitsForPatient(patientId);
  },

  async getVisitDetails(visitId: string) {
    await delay(100);
    const v = mockDomainStore.getVisitById(visitId);
    if (!v) throw new Error('Visit not found');
    return v;
  },

  async cancelVisit(visitId: string, patientId: string, reason: string) {
    await delay(200);
    const visit = mockDomainStore.getVisitById(visitId);
    if (!visit) throw new Error('Visit not found');
    if (visit.patientId !== patientId) throw new Error('Unauthorized');
    if (['on_the_way', 'arrived', 'in_consultation', 'completed'].includes(visit.status)) {
      throw new Error('Cannot cancel visit after doctor has started traveling or arrived.');
    }
    return mockDomainStore.updateVisitStatus(visitId, 'cancelled', patientId, { reason });
  },

  async rescheduleVisit(visitId: string, patientId: string, newDate: string, newTime: string) {
    await delay(200);
    const visit = mockDomainStore.getVisitById(visitId);
    if (!visit) throw new Error('Visit not found');
    if (['on_the_way', 'arrived', 'in_consultation', 'completed'].includes(visit.status)) {
      throw new Error('Cannot reschedule after doctor has departed.');
    }
    visit.scheduledDate = newDate;
    visit.scheduledTime = newTime;
    visit.status = 'pending'; // Requires doctor re-confirmation
    visit.updatedAt = new Date().toISOString();
    return visit;
  },

  async acceptAlternativeTime(visitId: string, patientId: string) {
    await delay(200);
    const visit = mockDomainStore.getVisitById(visitId);
    if (!visit) throw new Error('Visit not found');
    if (visit.patientId !== patientId) throw new Error('Unauthorized');
    if (visit.status !== 'alternative_proposed' || !visit.alternativeDate || !visit.alternativeTime) {
      throw new Error('No alternative time proposed to accept.');
    }
    visit.scheduledDate = visit.alternativeDate;
    visit.scheduledTime = visit.alternativeTime;
    visit.alternativeDate = undefined;
    visit.alternativeTime = undefined;
    visit.alternativeProposalNote = undefined;
    return mockDomainStore.updateVisitStatus(visitId, 'confirmed', patientId);
  },

  async rejectAlternativeTime(visitId: string, patientId: string, reason = 'Alternative time rejected by patient') {
    await delay(200);
    return mockDomainStore.updateVisitStatus(visitId, 'declined', patientId, { reason });
  },

  async getRecords(patientId: string) {
    await delay(200);
    const consultations = mockDomainStore.getConsultationsForPatient(patientId);
    const results = mockDomainStore.getResultsForPatient(patientId);
    return { consultations, results };
  },

  async getResultDocument(resultId: string) {
    await delay(150);
    const doc = mockDomainStore.getResultById(resultId);
    if (!doc) throw new Error('Result document not found');
    return doc;
  },

  async submitReview(review) {
    await delay(200);
    const id = `rev-${Date.now().toString().slice(-4)}`;
    return mockDomainStore.addReview({ ...review, id, createdAt: new Date().toISOString() });
  },

  async submitComplaint(complaint) {
    await delay(200);
    const id = `comp-${Date.now().toString().slice(-4)}`;
    return mockDomainStore.submitComplaint({ ...complaint, id, status: 'submitted', createdAt: new Date().toISOString() });
  },
};

export interface DoctorService {
  getProfile(doctorId: string): Promise<DoctorProfile | null>;
  toggleOnline(doctorId: string, isOnline: boolean): Promise<DoctorProfile>;
  getVisits(doctorId: string): Promise<VisitRequest[]>;
  getSlots(doctorId: string): Promise<AvailabilitySlot[]>;
  addSlot(doctorId: string, date: string, startTime: string, endTime: string): Promise<AvailabilitySlot>;
  removeSlot(slotId: string): Promise<void>;
  acceptVisit(visitId: string, doctorId: string): Promise<VisitRequest>;
  declineVisit(visitId: string, doctorId: string, reason: string): Promise<VisitRequest>;
  proposeAlternativeTime(
    visitId: string,
    doctorId: string,
    alternativeDate: string,
    alternativeTime: string,
    note?: string
  ): Promise<VisitRequest>;
  updateVisitExecutionStatus(visitId: string, doctorId: string, status: VisitStatus): Promise<VisitRequest>;
  getConsultationRecord(visitId: string): Promise<ConsultationRecord | null>;
  saveConsultationDraft(record: Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDraft'>, actor: User): Promise<ConsultationRecord>;
  publishConsultationRecord(record: Omit<ConsultationRecord, 'id' | 'createdAt' | 'updatedAt' | 'isDraft'>, actor: User): Promise<ConsultationRecord>;
  sendPrescriptionInCall(
    data: { visitId: string; patientId: string; items: PrescriptionItem[] },
    actor: User
  ): Promise<ConsultationRecord>;
  publishLabResult(
    resultData: {
      visitId: string;
      patientId: string;
      patientName: string;
      doctorId: string;
      doctorName: string;
      sampleCode?: string;
      title: string;
      category: 'laboratory' | 'examination_summary' | 'imaging';
      summaryFindings: string;
    },
    actor: User
  ): Promise<ResultDocument>;
}

export const doctorService: DoctorService = {
  async getProfile(doctorId: string) {
    await delay(100);
    return mockDomainStore.getDoctor(doctorId) || null;
  },

  async toggleOnline(doctorId: string, isOnline: boolean) {
    await delay(150);
    return mockDomainStore.toggleDoctorOnline(doctorId, isOnline);
  },

  async getVisits(doctorId: string) {
    await delay(150);
    return mockDomainStore.getVisitsForDoctor(doctorId);
  },

  async getSlots(doctorId: string) {
    await delay(100);
    return mockDomainStore.getDoctorSlots(doctorId);
  },

  async addSlot(doctorId: string, date: string, startTime: string, endTime: string) {
    await delay(200);
    const slot: AvailabilitySlot = {
      id: `slot-${Date.now().toString().slice(-5)}`,
      doctorId,
      date,
      startTime,
      endTime,
      isBooked: false,
      isBlocked: false,
    };
    return mockDomainStore.addSlot(slot);
  },

  async removeSlot(slotId: string) {
    await delay(150);
    mockDomainStore.removeSlot(slotId);
  },

  async acceptVisit(visitId: string, doctorId: string) {
    await delay(200);
    const doc = mockDomainStore.getDoctor(doctorId);
    if (!doc || doc.verificationStatus !== 'approved') {
      throw new Error('Unverified or suspended doctors cannot accept patient visits.');
    }
    return mockDomainStore.updateVisitStatus(visitId, 'confirmed', doctorId);
  },

  async declineVisit(visitId: string, doctorId: string, reason: string) {
    await delay(200);
    return mockDomainStore.updateVisitStatus(visitId, 'declined', doctorId, { reason });
  },

  async proposeAlternativeTime(visitId: string, doctorId: string, alternativeDate: string, alternativeTime: string, note?: string) {
    await delay(250);
    return mockDomainStore.updateVisitStatus(visitId, 'alternative_proposed', doctorId, {
      alternativeDate,
      alternativeTime,
      alternativeProposalNote: note,
    });
  },

  async updateVisitExecutionStatus(visitId: string, doctorId: string, status: VisitStatus) {
    await delay(200);
    const validStates: VisitStatus[] = ['on_the_way', 'arrived', 'in_consultation', 'completed'];
    if (!validStates.includes(status)) {
      throw new Error(`Invalid execution status transition to ${status}`);
    }
    return mockDomainStore.updateVisitStatus(visitId, status, doctorId);
  },

  async getConsultationRecord(visitId: string) {
    await delay(100);
    return mockDomainStore.getConsultationByVisit(visitId) || null;
  },

  async saveConsultationDraft(data, actor) {
    await delay(250);
    const record: ConsultationRecord = {
      ...data,
      id: `rec-${Date.now().toString().slice(-4)}`,
      isDraft: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockDomainStore.saveConsultationRecord(record, actor);
  },

  async publishConsultationRecord(data, actor) {
    await delay(300);
    const record: ConsultationRecord = {
      ...data,
      id: `rec-${Date.now().toString().slice(-4)}`,
      isDraft: false,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return mockDomainStore.saveConsultationRecord(record, actor);
  },

  // Doctor writes a prescription while the video call is still running.
  // It is published immediately, so the patient's dashboard and records update live.
  async sendPrescriptionInCall(data, actor) {
    await delay(300);
    const now = new Date().toISOString();
    const existing = mockDomainStore.getConsultationByVisit(data.visitId);

    const record: ConsultationRecord = existing
      ? {
          ...existing,
          prescriptions: [...existing.prescriptions, ...data.items],
          isDraft: false,
          publishedAt: now,
          updatedAt: now,
        }
      : {
          id: `rec-${Date.now().toString().slice(-4)}`,
          visitId: data.visitId,
          patientId: data.patientId,
          doctorId: actor.id,
          consultationNotes: 'Medication prescribed during the online video consultation.',
          physicalExamination: '',
          diagnosis: 'Online consultation — prescription issued',
          prescriptions: data.items,
          recommendations: [],
          isLabRequired: false,
          requiredLabTests: [],
          followUpRecommended: false,
          isDraft: false,
          publishedAt: now,
          createdAt: now,
          updatedAt: now,
        };

    return mockDomainStore.issuePrescription(record, actor);
  },

  async publishLabResult(resultData, actor) {
    await delay(350);
    const resultId = `res-${Date.now().toString().slice(-4)}`;
    const result: ResultDocument = {
      ...resultData,
      id: resultId,
      status: 'available',
      pdfUrl: `https://homecare.rw/fictional-reports/${resultId}-report.pdf`,
      pdfFileName: `HomeCare_${resultData.patientName.replace(/\s+/g, '_')}_LabResult_${resultId}.pdf`,
      fileSizeBytes: 215400,
      publishedAt: new Date().toISOString(),
      isViewedByPatient: false,
    };
    return mockDomainStore.publishResult(result, actor);
  },
};

export interface AdminService {
  getAllDoctors(): Promise<DoctorProfile[]>;
  updateDoctorVerification(doctorId: string, status: 'approved' | 'pending' | 'suspended'): Promise<DoctorProfile>;
  getAllVisits(): Promise<VisitRequest[]>;
  getComplaints(): Promise<ComplaintReport[]>;
  resolveComplaint(complaintId: string, resolutionNotes: string): Promise<ComplaintReport | undefined>;
  getAuditLogs(): Promise<MedicalAuditLog[]>;
  getPlatformMetrics(): Promise<{
    totalVisits: number;
    completedVisits: number;
    activeVisits: number;
    grossRevenueRwf: number;
    revenueByCurrency: Record<string, number>;
    markets: number;
    avgRating: number;
    pendingVerifications: number;
  }>;
}

export const adminService: AdminService = {
  async getAllDoctors() {
    await delay(150);
    return mockDomainStore.getAllDoctors(true);
  },

  async updateDoctorVerification(doctorId: string, status: 'approved' | 'pending' | 'suspended') {
    await delay(200);
    // Doctors registered through the API also exist on the server: keep their
    // credential status in step. Demo-only doctors simply 404 and are ignored.
    if (sessionToken) {
      try {
        await fetch(`${API_BASE_URL}/admin/doctors/${doctorId}/verification`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
          body: JSON.stringify({ status }),
        });
      } catch {
        // Offline demo mode: the local store below remains the source of truth
      }
    }
    return mockDomainStore.updateDoctorStatus(doctorId, status);
  },

  async getAllVisits() {
    await delay(150);
    return mockDomainStore.getAllVisits();
  },

  async getComplaints() {
    await delay(150);
    return mockDomainStore.getComplaints();
  },

  async resolveComplaint(complaintId: string, resolutionNotes: string) {
    await delay(200);
    return mockDomainStore.resolveComplaint(complaintId, resolutionNotes);
  },

  async getAuditLogs() {
    await delay(200);
    return mockDomainStore.getAuditLogs();
  },

  async getPlatformMetrics() {
    await delay(200);
    const visits = mockDomainStore.getAllVisits();
    const doctors = mockDomainStore.getAllDoctors(true);

    const completed = visits.filter((v) => v.status === 'completed');
    const active = visits.filter((v) => ['confirmed', 'on_the_way', 'arrived', 'in_consultation'].includes(v.status));
    const revenueByCurrency = completed.reduce<Record<string, number>>((acc, v) => {
      const currency = v.currency || 'RWF';
      acc[currency] = (acc[currency] || 0) + v.totalFeeRwf;
      return acc;
    }, {});
    const grossRevenue = revenueByCurrency.RWF || 0;

    const approvedDocs = doctors.filter((d) => d.verificationStatus === 'approved');
    const avgRating =
      approvedDocs.reduce((sum, d) => sum + (d.rating || 0), 0) / (approvedDocs.length || 1);

    const pendingVerifications = doctors.filter((d) => d.verificationStatus === 'pending').length;

    return {
      totalVisits: visits.length,
      completedVisits: completed.length,
      activeVisits: active.length,
      grossRevenueRwf: grossRevenue,
      revenueByCurrency,
      markets: new Set(doctors.map((d) => d.country)).size,
      avgRating: parseFloat(avgRating.toFixed(2)),
      pendingVerifications,
    };
  },
};
