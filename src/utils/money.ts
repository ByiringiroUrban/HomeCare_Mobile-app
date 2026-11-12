// Currency helpers: every market keeps its own prices in local currency units.
import { getCountryConfig } from '../constants/theme';

export const formatMoney = (amount: number | undefined | null, currency?: string | null): string => {
  const value = Math.round(Number(amount) || 0);
  return `${value.toLocaleString()} ${currency || 'RWF'}`;
};

/** Currency for a doctor profile or visit (falls back to the market default). */
export const currencyOf = (
  entity?: { currency?: string | null; country?: string | null } | null
): string => {
  if (entity?.currency) return entity.currency;
  return getCountryConfig(entity?.country).currency;
};
