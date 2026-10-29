// In-memory persistent reactive mock database store with account isolation and domain events
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
  SampleStatus,
} from '../types/domain';
import {
  DEMO_USERS,
  INITIAL_PATIENT_PROFILES,
  INITIAL_DOCTORS,
  INITIAL_SLOTS,
  INITIAL_VISITS,
  INITIAL_CONSULTATIONS,
  INITIAL_SAMPLES,
  INITIAL_RESULTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_REVIEWS,
  INITIAL_AUDIT_LOGS,
  INITIAL_COMPLAINTS,
  INITIAL_SPECIALTIES,
  SpecialtyItem,
} from './fixtures';

class MockDomainStore {
  private users: Map<string, User> = new Map();
  private patientProfiles: Map<string, PatientProfile> = new Map();
  private doctorProfiles: Map<string, DoctorProfile> = new Map();
  private slots: Map<string, AvailabilitySlot> = new Map();
  private visits: Map<string, VisitRequest> = new Map();
  private consultations: Map<string, ConsultationRecord> = new Map();
  private samples: Map<string, LabSample> = new Map();
  private results: Map<string, ResultDocument> = new Map();
  private notifications: Map<string, AppNotification> = new Map();
  private reviews: Map<string, DoctorReview> = new Map();
  private complaints: Map<string, ComplaintReport> = new Map();
  private auditLogs: MedicalAuditLog[] = [];
  private specialties: SpecialtyItem[] = [];

  // System Config
  public platformConfig = {
    emergencyPhone: '112',
    cancellationWindowHours: 2,
    baseTravelFeeRwf: 5000,
    coverageDistricts: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  };

  constructor() {
    this.resetToDefaults();
  }

  public resetToDefaults() {
    this.users.clear();
    Object.values(DEMO_USERS).forEach((u) => this.users.set(u.id, { ...u }));

    this.patientProfiles.clear();
    Object.values(INITIAL_PATIENT_PROFILES).forEach((p) =>
      this.patientProfiles.set(p.userId, { ...p, allergies: [...p.allergies], knownConditions: [...p.knownConditions], currentMedication: [...p.currentMedication] })
    );

    this.doctorProfiles.clear();
    INITIAL_DOCTORS.forEach((d) =>
      this.doctorProfiles.set(d.userId, {
        ...d,
        qualifications: [...d.qualifications],
        coverageDistricts: [...d.coverageDistricts],
        languages: [...d.languages],
        workingDays: [...d.workingDays],
      })
    );

    this.slots.clear();
    INITIAL_SLOTS.forEach((s) => this.slots.set(s.id, { ...s }));

    this.visits.clear();
    INITIAL_VISITS.forEach((v) => this.visits.set(v.id, { ...v }));

    this.consultations.clear();
    Object.values(INITIAL_CONSULTATIONS).forEach((c) =>
      this.consultations.set(c.visitId, {
        ...c,
        prescriptions: c.prescriptions.map((rx) => ({ ...rx })),
        recommendations: [...c.recommendations],
        requiredLabTests: [...c.requiredLabTests],
      })
    );

    this.samples.clear();
    Object.values(INITIAL_SAMPLES).forEach((s) =>
      this.samples.set(s.id, { ...s, testNames: [...s.testNames] })
    );

    this.results.clear();
    INITIAL_RESULTS.forEach((r) => this.results.set(r.id, { ...r }));

    this.notifications.clear();
    INITIAL_NOTIFICATIONS.forEach((n) => this.notifications.set(n.id, { ...n }));

    this.reviews.clear();
    INITIAL_REVIEWS.forEach((r) => this.reviews.set(r.id, { ...r }));

    this.complaints.clear();
    INITIAL_COMPLAINTS.forEach((c) => this.complaints.set(c.id, { ...c }));

    this.auditLogs = INITIAL_AUDIT_LOGS.map((a) => ({ ...a }));
    this.specialties = INITIAL_SPECIALTIES.map((s) => ({ ...s }));
  }

  // --- Auth & Users ---
  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  public getUserByEmailOrPhone(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === clean || user.phone === identifier.trim()) {
        return user;
      }
    }
    return undefined;
  }

  public registerPatient(user: User, profile: PatientProfile): User {
    this.users.set(user.id, user);
    this.patientProfiles.set(user.id, profile);
    return user;
  }

  public registerDoctor(user: User, profile: DoctorProfile): User {
    this.users.set(user.id, user);
    this.doctorProfiles.set(user.id, profile);
    return user;
  }

  // --- Patient Profiles ---
  public getPatientProfile(userId: string): PatientProfile | undefined {
    return this.patientProfiles.get(userId);
  }

  public updatePatientProfile(userId: string, partial: Partial<PatientProfile>): PatientProfile {
    const existing = this.patientProfiles.get(userId);
    if (!existing) throw new Error('Patient profile not found');
    const updated = { ...existing, ...partial };
    this.patientProfiles.set(userId, updated);
    this.logAudit(userId, 'Patient Self', 'patient', 'UPDATE', 'patient_profile', userId, userId, 'Updated patient health profile & emergency details');
    return updated;
  }

  // --- Doctor Profiles & Catalog ---
  public getSpecialties(): SpecialtyItem[] {
    return [...this.specialties];
  }

  public getAllDoctors(includeUnverified = false): DoctorProfile[] {
    const all = Array.from(this.doctorProfiles.values());
    if (includeUnverified) return all;
    return all.filter((d) => d.verificationStatus === 'approved');
  }

  public getDoctor(doctorId: string): DoctorProfile | undefined {
    return this.doctorProfiles.get(doctorId);
  }

  public updateDoctorStatus(doctorId: string, status: 'approved' | 'pending' | 'suspended', adminId = 'admin-001') {
    const doc = this.doctorProfiles.get(doctorId);
    if (!doc) throw new Error('Doctor not found');
    doc.verificationStatus = status;
    this.doctorProfiles.set(doctorId, doc);
    this.logAudit(adminId, 'Admin', 'admin', 'UPDATE', 'patient_profile', doctorId, '', `Doctor verification status changed to ${status}`);
    return doc;
  }

  public toggleDoctorOnline(doctorId: string, isOnline: boolean): DoctorProfile {
    const doc = this.doctorProfiles.get(doctorId);
    if (!doc) throw new Error('Doctor not found');
    doc.isOnline = isOnline;
    this.doctorProfiles.set(doctorId, doc);
    return doc;
  }

  // --- Slots & Availability ---
  public getDoctorSlots(doctorId: string): AvailabilitySlot[] {
    return Array.from(this.slots.values()).filter((s) => s.doctorId === doctorId && !s.isBlocked);
  }

  public addSlot(slot: AvailabilitySlot): AvailabilitySlot {
    // Check overlaps
    const docSlots = this.getDoctorSlots(slot.doctorId);
    const hasOverlap = docSlots.some(
      (s) => s.date === slot.date && s.startTime === slot.startTime && !s.isBlocked
    );
    if (hasOverlap) throw new Error('A slot already exists at this date and time.');
    this.slots.set(slot.id, slot);
    return slot;
  }

  public removeSlot(slotId: string) {
    this.slots.delete(slotId);
  }

  // --- Visit Lifecycle Management ---
  public getVisitsForPatient(patientId: string): VisitRequest[] {
    return Array.from(this.visits.values())
      .filter((v) => v.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getVisitsForDoctor(doctorId: string): VisitRequest[] {
    return Array.from(this.visits.values())
      .filter((v) => v.doctorId === doctorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllVisits(): VisitRequest[] {
    return Array.from(this.visits.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getVisitById(visitId: string): VisitRequest | undefined {
    return this.visits.get(visitId);
  }

  public createVisitRequest(request: VisitRequest): VisitRequest {
    // Prevent double booking
    const existingActiveVisit = Array.from(this.visits.values()).find(
      (v) =>
        v.doctorId === request.doctorId &&
        v.scheduledDate === request.scheduledDate &&
        v.scheduledTime === request.scheduledTime &&
        !['declined', 'cancelled', 'expired'].includes(v.status)
    );
    if (existingActiveVisit) {
      throw new Error('This doctor is already reserved for the selected date and time.');
    }

    this.visits.set(request.id, request);

    // Mark slot as booked if slotId exists
    if (request.slotId && this.slots.has(request.slotId)) {
      const slot = this.slots.get(request.slotId)!;
      slot.isBooked = true;
      this.slots.set(slot.id, slot);
    }

    // Trigger Notification for Doctor
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      recipientUserId: request.doctorId,
      title: 'New Visit Request Received',
      body: `${request.patientName} requested a consultation on ${request.scheduledDate} at ${request.scheduledTime}.`,
      type: 'visit_status',
      referenceId: request.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notif.id, notif);

    return request;
  }

  public updateVisitStatus(
    visitId: string,
    newStatus: VisitStatus,
    actorId: string,
    extra: {
      reason?: string;
      alternativeDate?: string;
      alternativeTime?: string;
      alternativeProposalNote?: string;
    } = {}
  ): VisitRequest {
    const visit = this.visits.get(visitId);
    if (!visit) throw new Error('Visit request not found.');

    visit.status = newStatus;
    visit.updatedAt = new Date().toISOString();

    if (extra.reason) {
      if (newStatus === 'declined') visit.declineReason = extra.reason;
      if (newStatus === 'cancelled') visit.cancellationReason = extra.reason;
    }

    if (newStatus === 'alternative_proposed') {
      visit.alternativeDate = extra.alternativeDate;
      visit.alternativeTime = extra.alternativeTime;
      visit.alternativeProposalNote = extra.alternativeProposalNote;
    }

    // If cancelled or declined, free up the slot
    if (['cancelled', 'declined', 'expired'].includes(newStatus)) {
      if (visit.slotId && this.slots.has(visit.slotId)) {
        const slot = this.slots.get(visit.slotId)!;
        slot.isBooked = false;
        this.slots.set(slot.id, slot);
      }
    }

    this.visits.set(visitId, visit);

    // Cross-role push notification triggers
    let notifTitle = '';
    let notifBody = '';
    let recipientId = visit.patientId;

    switch (newStatus) {
      case 'confirmed':
        notifTitle = 'Visit Request Confirmed!';
        notifBody = `${visit.doctorName} accepted your appointment for ${visit.scheduledDate} at ${visit.scheduledTime}.`;
        recipientId = visit.patientId;
        break;
      case 'alternative_proposed':
        notifTitle = 'Alternative Time Proposed';
        notifBody = `${visit.doctorName} proposed a new appointment slot: ${extra.alternativeDate} at ${extra.alternativeTime}.`;
        recipientId = visit.patientId;
        break;
      case 'declined':
        notifTitle = 'Visit Request Declined';
        notifBody = `${visit.doctorName} is unavailable: ${extra.reason || 'No reason provided'}.`;
        recipientId = visit.patientId;
        break;
      case 'on_the_way':
        notifTitle = 'Doctor is on the way!';
        notifBody = `${visit.doctorName} has started traveling to your residence in ${visit.district}.`;
        recipientId = visit.patientId;
        break;
      case 'arrived':
        notifTitle = 'Doctor has arrived';
        notifBody = `${visit.doctorName} has arrived at your gate / residence.`;
        recipientId = visit.patientId;
        break;
      case 'completed':
        notifTitle = 'Consultation Completed';
        notifBody = `Your home visit with ${visit.doctorName} has finished. Consultation notes are being prepared.`;
        recipientId = visit.patientId;
        break;
      case 'cancelled':
        notifTitle = 'Visit Cancelled';
        notifBody = `The visit on ${visit.scheduledDate} has been cancelled.`;
        recipientId = actorId === visit.patientId ? visit.doctorId : visit.patientId;
        break;
    }

    if (notifTitle) {
      const notif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        recipientUserId: recipientId,
        title: notifTitle,
        body: notifBody,
        type: 'visit_status',
        referenceId: visit.id,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      this.notifications.set(notif.id, notif);
    }

    return visit;
  }

  // --- Consultation Records ---
  public getConsultationByVisit(visitId: string): ConsultationRecord | undefined {
    return this.consultations.get(visitId);
  }

  public getConsultationsForPatient(patientId: string): ConsultationRecord[] {
    return Array.from(this.consultations.values())
      .filter((c) => c.patientId === patientId && !c.isDraft)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public saveConsultationRecord(record: ConsultationRecord, actor: User): ConsultationRecord {
    this.consultations.set(record.visitId, record);
    this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      record.isDraft ? 'CREATE' : 'PUBLISH',
      'consultation_record',
      record.id,
      record.patientId,
      record.isDraft ? 'Drafted consultation record notes' : 'Published medical consultation record & Rx to patient'
    );
    return record;
  }

  // --- Lab Samples & Results ---
  public getSample(sampleId: string): LabSample | undefined {
    return this.samples.get(sampleId);
  }

  public createSample(sample: LabSample): LabSample {
    this.samples.set(sample.id, sample);
    return sample;
  }

  public updateSampleStatus(sampleId: string, status: SampleStatus): LabSample {
    const s = this.samples.get(sampleId);
    if (!s) throw new Error('Sample not found');
    s.status = status;
    this.samples.set(sampleId, s);
    return s;
  }

  public getResultsForPatient(patientId: string): ResultDocument[] {
    return Array.from(this.results.values())
      .filter((r) => r.patientId === patientId)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  public getResultById(resultId: string): ResultDocument | undefined {
    return this.results.get(resultId);
  }

  public publishResult(result: ResultDocument, actor: User): ResultDocument {
    this.results.set(result.id, result);

    // Notify patient
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      recipientUserId: result.patientId,
      title: 'New Medical Result Available',
      body: `${result.title} has been published by ${result.doctorName}. Tap to view.`,
      type: 'result_ready',
      referenceId: result.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.set(notif.id, notif);

    this.logAudit(
      actor.id,
      actor.name,
      actor.role,
      'PUBLISH',
      'result_document',
      result.id,
      result.patientId,
      `Published laboratory/examination document: ${result.title}`
    );

    return result;
  }

  // --- Notifications ---
  public getNotificationsForUser(userId: string): AppNotification[] {
    return Array.from(this.notifications.values())
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public markNotificationAsRead(notifId: string) {
    const n = this.notifications.get(notifId);
    if (n) {
      n.isRead = true;
      this.notifications.set(notifId, n);
    }
  }

  // --- Reviews & Complaints ---
  public addReview(review: DoctorReview): DoctorReview {
    this.reviews.set(review.id, review);
    // Update doctor average
    const docReviews = Array.from(this.reviews.values()).filter((r) => r.doctorId === review.doctorId);
    const sum = docReviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = parseFloat((sum / docReviews.length).toFixed(2));

    const doc = this.doctorProfiles.get(review.doctorId);
    if (doc) {
      doc.rating = avg;
      doc.reviewCount = docReviews.length;
      this.doctorProfiles.set(doc.userId, doc);
    }
    return review;
  }

  public getReviewsForDoctor(doctorId: string): DoctorReview[] {
    return Array.from(this.reviews.values()).filter((r) => r.doctorId === doctorId);
  }

  public submitComplaint(complaint: ComplaintReport): ComplaintReport {
    this.complaints.set(complaint.id, complaint);
    return complaint;
  }

  public getComplaints(): ComplaintReport[] {
    return Array.from(this.complaints.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public resolveComplaint(complaintId: string, resolutionNotes: string): ComplaintReport | undefined {
    const complaint = this.complaints.get(complaintId);
    if (!complaint) return undefined;
    complaint.status = 'resolved';
    complaint.resolutionNotes = resolutionNotes;
    this.complaints.set(complaintId, complaint);
    return complaint;
  }

  // --- Audit Logs ---
  public getAuditLogs(): MedicalAuditLog[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private logAudit(
    actorUserId: string,
    actorName: string,
    actorRole: 'patient' | 'doctor' | 'admin',
    action: 'READ' | 'CREATE' | 'UPDATE' | 'PUBLISH' | 'EXPORT',
    entityType: 'consultation_record' | 'result_document' | 'patient_profile',
    entityId: string,
    patientId: string,
    details: string
  ) {
    const log: MedicalAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      actorUserId,
      actorName,
      actorRole,
      action,
      entityType,
      entityId,
      patientId,
      details,
    };
    this.auditLogs.unshift(log);
  }
}

// Global Singleton Store Instance
export const mockDomainStore = new MockDomainStore();
