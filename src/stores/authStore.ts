// User Session Store (Zustand). Sessions are issued by the backend API.
import { create } from 'zustand';
import { User, PatientProfile, DoctorProfile } from '../types/domain';
import { authService, patientService, doctorService, setApiToken } from '../services/api';

interface AuthSessionState {
  currentUser: User | null;
  patientProfile: PatientProfile | null;
  doctorProfile: DoctorProfile | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loginCustom: (identifier: string, password?: string) => Promise<User>;
  setSession: (user: User, token: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthSessionState>((set, get) => ({
  currentUser: null,
  patientProfile: null,
  doctorProfile: null,
  token: null,
  isLoading: false,
  error: null,

  loginCustom: async (identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await authService.login(identifier, password || '');
      setApiToken(token);

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

  setSession: async (user, token) => {
    // Used after OTP verification, where the backend already issued the token
    setApiToken(token);

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
      error: null,
    });
  },

  logout: () => {
    setApiToken(null);
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
}));
