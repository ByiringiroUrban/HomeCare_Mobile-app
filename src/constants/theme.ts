// Centralized configuration and design system tokens for HomeCare
// HomeCare operates across the East African Community: Rwanda, Kenya, Uganda,
// Tanzania, Burundi and South Sudan. Every market has its own currency, emergency
// number, medical regulator and coverage districts.

export type SupportedCountry = 'RW' | 'KE' | 'TZ' | 'UG' | 'BI' | 'SS';

export const DEFAULT_COUNTRY: SupportedCountry = 'RW';

export interface CountryConfig {
  name: string;
  code: SupportedCountry;
  flag: string;
  currency: string;
  currencySymbol: string;
  emergencyPhone: string;
  emergencyService: string;
  phonePrefix: string;
  phonePlaceholder: string;
  regulatoryBody: string;
  regulatorShort: string;
  licenseExample: string;
  dataProtectionLaw: string;
  capitalCity: string;
  exampleCities: string[];
  /** Coverage districts / neighbourhoods used by search filters and doctor onboarding. */
  districts: string[];
  languages: string[];
  /** Typical home-visit travel fee in local currency (demo baseline). */
  baseTravelFee: number;
}

export const COUNTRY_CONFIGS: Record<SupportedCountry, CountryConfig> = {
  RW: {
    name: 'Rwanda',
    code: 'RW',
    flag: '🇷🇼',
    currency: 'RWF',
    currencySymbol: 'RWF',
    emergencyPhone: '112',
    emergencyService: 'SAMU Rwanda',
    phonePrefix: '+250',
    phonePlaceholder: '+250 788 000 000',
    regulatoryBody: 'Rwanda Medical and Dental Council (RMDC)',
    regulatorShort: 'RMDC',
    licenseExample: 'RMC/2018/0412',
    dataProtectionLaw: 'Law No. 058/2021 on Personal Data Protection',
    capitalCity: 'Kigali',
    exampleCities: ['Kigali', 'Huye', 'Musanze', 'Rubavu', 'Muhanga'],
    districts: ['Gasabo', 'Kicukiro', 'Nyarugenge', 'Musanze', 'Huye', 'Rubavu'],
    languages: ['Kinyarwanda', 'English', 'French'],
    baseTravelFee: 5000,
  },
  KE: {
    name: 'Kenya',
    code: 'KE',
    flag: '🇰🇪',
    currency: 'KES',
    currencySymbol: 'KES',
    emergencyPhone: '999',
    emergencyService: 'Kenya Emergency Services',
    phonePrefix: '+254',
    phonePlaceholder: '+254 712 000 000',
    regulatoryBody: 'Kenya Medical Practitioners and Dentists Council (KMPDC)',
    regulatorShort: 'KMPDC',
    licenseExample: 'KMPDC/2016/8812',
    dataProtectionLaw: 'Data Protection Act, 2019',
    capitalCity: 'Nairobi',
    exampleCities: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
    districts: ['Westlands', 'Kilimani', 'Nairobi CBD', 'Karen', 'Mombasa Island', 'Nyali', 'Kisumu Central', 'Nakuru Town'],
    languages: ['Swahili', 'English'],
    baseTravelFee: 500,
  },
  TZ: {
    name: 'Tanzania',
    code: 'TZ',
    flag: '🇹🇿',
    currency: 'TZS',
    currencySymbol: 'TZS',
    emergencyPhone: '112',
    emergencyService: 'Tanzania Emergency Services',
    phonePrefix: '+255',
    phonePlaceholder: '+255 712 000 000',
    regulatoryBody: 'Medical Council of Tanganyika (MCT)',
    regulatorShort: 'MCT',
    licenseExample: 'MCT/2018/5509',
    dataProtectionLaw: 'Personal Data Protection Act, 2022',
    capitalCity: 'Dar es Salaam',
    exampleCities: ['Dar es Salaam', 'Arusha', 'Dodoma', 'Mwanza', 'Zanzibar'],
    districts: ['Kinondoni', 'Ilala', 'Ubungo', 'Temeke', 'Arusha City', 'Dodoma CBD', 'Mwanza City'],
    languages: ['Swahili', 'English'],
    baseTravelFee: 8000,
  },
  UG: {
    name: 'Uganda',
    code: 'UG',
    flag: '🇺🇬',
    currency: 'UGX',
    currencySymbol: 'UGX',
    emergencyPhone: '999',
    emergencyService: 'Uganda Emergency Medical Services',
    phonePrefix: '+256',
    phonePlaceholder: '+256 772 000 000',
    regulatoryBody: 'Uganda Medical and Dental Practitioners Council (UMDPC)',
    regulatorShort: 'UMDPC',
    licenseExample: 'UMDPC/2017/3320',
    dataProtectionLaw: 'Data Protection and Privacy Act, 2019',
    capitalCity: 'Kampala',
    exampleCities: ['Kampala', 'Entebbe', 'Gulu', 'Mbarara', 'Jinja'],
    districts: ['Kampala Central', 'Kololo', 'Nakawa', 'Entebbe', 'Mbarara City', 'Gulu City'],
    languages: ['Luganda', 'English', 'Swahili'],
    baseTravelFee: 15000,
  },
  BI: {
    name: 'Burundi',
    code: 'BI',
    flag: '🇧🇮',
    currency: 'BIF',
    currencySymbol: 'BIF',
    emergencyPhone: '117',
    emergencyService: 'Burundi Emergency Services',
    phonePrefix: '+257',
    phonePlaceholder: '+257 79 000 000',
    regulatoryBody: 'Ordre National des Médecins du Burundi (CNOMB)',
    regulatorShort: 'CNOMB',
    licenseExample: 'CNOMB/2015/2210',
    dataProtectionLaw: 'Loi sur la protection des données personnelles, 2020',
    capitalCity: 'Bujumbura',
    exampleCities: ['Bujumbura', 'Gitega', 'Ngozi', 'Rumonge'],
    districts: ['Bujumbura Mairie', 'Rohero', 'Kinindo', 'Gitega', 'Ngozi'],
    languages: ['Kirundi', 'French', 'Swahili'],
    baseTravelFee: 10000,
  },
  SS: {
    name: 'South Sudan',
    code: 'SS',
    flag: '🇸🇸',
    currency: 'SSP',
    currencySymbol: 'SSP',
    emergencyPhone: '999',
    emergencyService: 'South Sudan Emergency Services',
    phonePrefix: '+211',
    phonePlaceholder: '+211 920 000 000',
    regulatoryBody: 'South Sudan Medical Council (SSMC)',
    regulatorShort: 'SSMC',
    licenseExample: 'SSMC/2016/1180',
    dataProtectionLaw: 'National Health Data Protection Policy',
    capitalCity: 'Juba',
    exampleCities: ['Juba', 'Wau', 'Malakal', 'Yei'],
    districts: ['Juba Central', 'Munuki', 'Jebel', 'Wau', 'Malakal'],
    languages: ['English', 'Juba Arabic'],
    baseTravelFee: 12000,
  },
};

export const COUNTRY_CODES: SupportedCountry[] = ['RW', 'KE', 'TZ', 'UG', 'BI', 'SS'];

export const COUNTRY_LIST: CountryConfig[] = COUNTRY_CODES.map((code) => COUNTRY_CONFIGS[code]);

export const isSupportedCountry = (code?: string | null): code is SupportedCountry =>
  !!code && (COUNTRY_CODES as string[]).includes(code);

export const getCountryConfig = (code?: string | null): CountryConfig =>
  COUNTRY_CONFIGS[isSupportedCountry(code) ? code : DEFAULT_COUNTRY];

/** Every coverage district across all markets (search + onboarding filters). */
export const ALL_DISTRICTS = COUNTRY_CODES.flatMap((code) => COUNTRY_CONFIGS[code].districts);

export const COUNTRY_CODES_LABEL = COUNTRY_LIST.map((c) => c.name).join(', ');

export const APP_CONFIG = {
  appName: 'HomeCare',
  appVersion: '1.0.0',
  tagline: 'Certified Doctor Home Visits Across East Africa',
  supportedCountries: COUNTRY_CODES,
  supportEmail: 'support@homecare.africa',

  coverageDistricts: ALL_DISTRICTS,
  defaultCountry: DEFAULT_COUNTRY,
  // Generic emergency disclaimer used when country is unknown
  emergencyDisclaimer:
    'HomeCare is not an emergency service. In life-threatening emergencies, dial your national emergency number immediately.',
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
