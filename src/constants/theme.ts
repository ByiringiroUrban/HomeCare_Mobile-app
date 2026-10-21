// Centralized configuration and design system tokens for HomeCare
export const APP_CONFIG = {
  appName: 'HomeCare',
  appVersion: '1.0.0-draft',
  tagline: 'Personalized Doctor Home Visits in Kigali',
  defaultCountry: 'Rwanda',
  defaultCity: 'Kigali',
  currency: 'RWF',
  emergencyDisclaimer:
    'HomeCare is not an emergency service. In life-threatening emergencies, immediately call 112 (SAMU Rwanda / Emergency Helpline).',
  emergencyPhone: '112',
  supportEmail: 'support@homecare.rw',
  supportPhone: '+250 788 123 456',
  demoOtpCode: '123456',
  coverageDistricts: ['Gasabo', 'Kicukiro', 'Nyarugenge'],
};

export const THEME = {
  colors: {
    // Primary palette: Deep trustworthy teal & healthcare blue
    primary: '#0F766E', // Tailwind teal-700
    primaryDark: '#115E59', // teal-800
    primaryLight: '#14B8A6', // teal-500
    primarySoft: '#F0FDFA', // teal-50

    // Accent: Restrained calming blue & green
    accent: '#0284C7', // sky-600
    accentSoft: '#F0F9FF',
    success: '#16A34A', // green-600
    successSoft: '#DCFCE7', // green-100
    warning: '#D97706', // amber-600
    warningSoft: '#FEF3C7', // amber-100
    error: '#DC2626', // red-600
    errorSoft: '#FEE2E2', // red-100
    info: '#2563EB', // blue-600

    // Neutrals
    background: '#F8FAFC', // slate-50
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F5F9', // slate-100
    border: '#E2E8F0', // slate-200
    borderLight: '#F1F5F9',
    
    // Text
    textPrimary: '#0F172A', // slate-900
    textSecondary: '#475569', // slate-600
    textMuted: '#94A3B8', // slate-400
    textWhite: '#FFFFFF',

    // Status Badges
    badgePendingBg: '#FEF3C7',
    badgePendingText: '#92400E',
    badgeConfirmedBg: '#DBEAFE',
    badgeConfirmedText: '#1E40AF',
    badgeActiveBg: '#E0E7FF',
    badgeActiveText: '#3730A3',
    badgeCompletedBg: '#DCFCE7',
    badgeCompletedText: '#166534',
    badgeCancelledBg: '#FEE2E2',
    badgeCancelledText: '#991B1B',
  },
  typography: {
    fontFamilies: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      display: 28,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 20,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
  },
};
