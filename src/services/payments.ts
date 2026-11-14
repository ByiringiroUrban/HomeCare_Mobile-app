// PawaPay mobile money payments, proxied through the HomeCare backend.
// The API token never reaches the device: the app only sends the patient's JWT.
import { API_BASE_URL } from './api';
import { useAuthStore } from '../stores/authStore';

export interface PaymentProviderOption {
  country: string;
  prefix: string;
  provider: string;
  displayName: string;
  currency: string;
  minAmount?: string;
  maxAmount?: string;
  decimalsInAmount?: string;
  status: string;
}

export interface PaymentConfigResponse {
  enabled: boolean;
  environment?: string;
  companyName?: string;
  providers: PaymentProviderOption[];
  message?: string | null;
}

export type PawaPayStatus =
  | 'CREATED'
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'IN_RECONCILIATION'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'DUPLICATE_IGNORED'
  | 'NOT_FOUND';

export interface PaymentRecord {
  depositId: string;
  reference?: string | null;
  amount: number;
  currency: string;
  phoneNumber: string;
  provider: string;
  status: PawaPayStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  providerTransactionId?: string | null;
  environment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/payments${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (body as any)?.detail ?? body;
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message || `Payment request failed (HTTP ${res.status}).`;
    throw new Error(message);
  }
  return body as T;
}

export const paymentService = {
  getProviders(country?: string) {
    const query = country ? `?country=${encodeURIComponent(country)}` : '';
    return request<PaymentConfigResponse>(`/config${query}`);
  },

  initiateDeposit(data: {
    amount: number;
    currency: string;
    phoneNumber: string;
    provider: string;
    reference?: string;
    visitId?: string;
    customerMessage?: string;
  }) {
    return request<PaymentRecord>('/deposits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getStatus(depositId: string) {
    return request<PaymentRecord>(`/deposits/${encodeURIComponent(depositId)}`);
  },

  listDeposits() {
    return request<PaymentRecord[]>('/deposits');
  },
};
