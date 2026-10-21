// User Session Store with Zustand and Account Isolation
import { create } from 'zustand';
import { User, PatientProfile, DoctorProfile } from '../types/domain';
import { authService, patientService, doctorService } from '../services/api';
import { mockDomainStore } from '../mock/mockDomainStore';

interface AuthSessionState {
  currentUser: User | null;
  patientProfile: PatientProfile | null;
  doctorProfile: DoctorProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loginDemo: (role: 'patient1' | 'patient2' | 'doctor1' | 'doctor2' | 'admin') => Promise<User>;
  loginCustom: (identifier: string) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  resetDemoData: () => void;
}

export const useAuthStore = create<AuthSessionState>((set, get) => ({
  currentUser: null,
  patientProfile: null,
  doctorProfile: null,
  token: null,
  isLoading: false,
  error: null,

  loginDemo: async (role) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.login('', role);
      let pProfile: PatientProfile | null = null;
      let dProfile: DoctorProfile | null = null;

      if (user.role === 'patient') {
        pProfile = await patientService.getProfile(user.id);
      } else if (user.role === 'doctor') {
        dProfile = await doctorService.getProfile(user.id);
      }

      set({
        currentUser: user,
        patientProfile: pProfile,
        doctorProfile: dProfile,
        token,
        isLoading: false,
      });
      return user;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  loginCustom: async (identifier) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.login(identifier);
      let pProfile: PatientProfile | null = null;
      let dProfile: DoctorProfile | null = null;

      if (user.role === 'patient') {
        pProfile = await patientService.getProfile(user.id);
      } else if (user.role === 'doctor') {
        dProfile = await doctorService.getProfile(user.id);
      }

      set({
        currentUser: user,
        patientProfile: pProfile,
        doctorProfile: dProfile,
        token,
        isLoading: false,
      });
      return user;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', isLoading: false });
      throw err;
    }
  },

  logout: () => {
    set({
      currentUser: null,
      patientProfile: null,
      doctorProfile: null,
      token: null,
      error: null,
    });
  },

  refreshProfile: async () => {
    const user = get().currentUser;
    if (!user) return;
    if (user.role === 'patient') {
      const pProfile = await patientService.getProfile(user.id);
      set({ patientProfile: pProfile });
    } else if (user.role === 'doctor') {
      const dProfile = await doctorService.getProfile(user.id);
      set({ doctorProfile: dProfile });
    }
  },

  resetDemoData: () => {
    mockDomainStore.resetToDefaults();
    get().refreshProfile();
  },
}));
