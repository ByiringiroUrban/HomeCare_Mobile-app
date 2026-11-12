// Selected East African market for the signed-in session.
import { create } from 'zustand';
import {
  COUNTRY_CONFIGS,
  CountryConfig,
  DEFAULT_COUNTRY,
  SupportedCountry,
  getCountryConfig,
  isSupportedCountry,
} from '../constants/theme';

interface LocaleState {
  country: SupportedCountry;
  /** Switch market manually (profile, registration, discovery filters). */
  setCountry: (code: SupportedCountry) => void;
  /** Adopt the country stored on the signed-in user's profile, if any. */
  syncFromProfile: (code?: string | null) => void;
  config: () => CountryConfig;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  country: DEFAULT_COUNTRY,
  setCountry: (code) => {
    if (isSupportedCountry(code)) set({ country: code });
  },
  syncFromProfile: (code) => {
    if (isSupportedCountry(code)) set({ country: code });
  },
  config: () => getCountryConfig(get().country),
}));

/** Current country config (re-renders when the market changes). */
export const useCountry = (): CountryConfig => {
  const country = useLocaleStore((state) => state.country);
  return COUNTRY_CONFIGS[country];
};
