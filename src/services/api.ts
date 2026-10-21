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
} from '../types/domain';
import { SpecialtyItem } from '../mock/fixtures';
import { mockDomainStore } from '../mock/mockDomainStore';

const SIMULATED_LATENCY_MS = 250;

const delay = (ms = SIMULATED_LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AuthService {
  login(identifier: string, demoRole?: string): Promise<{ user: User; token: string }>;
  verifyOtp(code: string, userId: string): Promise<boolean>;
  registerPatient(data: { name: string; email: string; phone: string; password: string }): Promise<User>;
  registerDoctor(data: {
    name: string;
    email: string;
    phone: string;
    specialty: string;
    licenseNumber: string;
    qualifications: string[];
    experienceYears: number;
    coverageDistricts: string[];
  }): Promise<User>;
  getCurrentUser(userId: string): Promise<User | null>;
  resetPassword(email: string): Promise<boolean>;
}

export const authService: AuthService = {
  async login(identifier: string, demoRole?: string) {
    await delay();
    if (demoRole) {
      const demoUsers = {
        patient1: 'patient-101',
        patient2: 'patient-102',
        doctor1: 'doctor-201',
        doctor2: 'doctor-202',
        admin: 'admin-001',
      };
      const targetId = demoUsers[demoRole as keyof typeof demoUsers];
      const user = mockDomainStore.getUser(targetId);
      if (user) {
        return { user, token: `simulated-jwt-${user.id}-${Date.now()}` };
      }
    }

    const found = mockDomainStore.getUserByEmailOrPhone(identifier);
    if (!found) {
      throw new Error('Invalid credentials or unregistered account.');
    }
    return { user: found, token: `simulated-jwt-${found.id}-${Date.now()}` };
  },

  async verifyOtp(code: string) {
    await delay(150);
    // Verified with standard demo code '123456'
    return code === '123456' || code.length === 6;
  },

  async registerPatient(data) {
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
      residenceAddress: 'Kigali, Rwanda',
      district: 'Gasabo',
      sector: 'Remera',
      emergencyContact: { name: 'Emergency Contact', relationship: 'Next of kin', phone: '+250 788 000 000' },
      allergies: [],
      knownConditions: [],
      currentMedication: [],
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
    };
    mockDomainStore.registerPatient(user, profile);
    return user;
  },

  async registerDoctor(data) {
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
      bio: 'Board-registered specialist physician in Kigali.',
      languages: ['English', 'Kinyarwanda'],
      consultationFeeRwf: 25000,
      travelFeeRwf: 5000,
      rating: 0,
      reviewCount: 0,
      verificationStatus: 'pending', // Doctors start pending until admin review
      isOnline: false,
      workingDays: [1, 2, 3, 4, 5],
      workingHours: { start: '08:00', end: '17:00' },
    };
    mockDomainStore.registerDoctor(user, profile);
    return user;
  },

  async getCurrentUser(userId: string) {
    await delay(100);
    return mockDomainStore.getUser(userId) || null;
  },

  async resetPassword() {
    await delay(200);
    return true;
  },
};

export interface PatientService {
  getProfile(patientId: string): Promise<PatientProfile | null>;
  updateProfile(patientId: string, partial: Partial<PatientProfile>): Promise<PatientProfile>;
  getSpecialties(): Promise<SpecialtyItem[]>;
  searchDoctors(params: {
    query?: string;
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
  getAuditLogs(): Promise<MedicalAuditLog[]>;
  getPlatformMetrics(): Promise<{
    totalVisits: number;
    completedVisits: number;
    activeVisits: number;
    grossRevenueRwf: number;
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
    const grossRevenue = completed.reduce((sum, v) => sum + v.totalFeeRwf, 0);

    const approvedDocs = doctors.filter((d) => d.verificationStatus === 'approved');
    const avgRating =
      approvedDocs.reduce((sum, d) => sum + (d.rating || 0), 0) / (approvedDocs.length || 1);

    const pendingVerifications = doctors.filter((d) => d.verificationStatus === 'pending').length;

    return {
      totalVisits: visits.length,
      completedVisits: completed.length,
      activeVisits: active.length,
      grossRevenueRwf: grossRevenue,
      avgRating: parseFloat(avgRating.toFixed(2)),
      pendingVerifications,
    };
  },
};
