import Constants from 'expo-constants';
import type { AuthUser, DashboardMetrics, LoadItem, TripItem, UserRole } from '../constants/types';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string };
const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || extra.apiBaseUrl || '';

function getApiBaseUrl() {
  const normalized = configuredApiBaseUrl.trim();
  if (!normalized || /api\.example\.com|your-domain\.com/i.test(normalized)) {
    throw new Error('Mobile app API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL before running a production build.');
  }
  return normalized.replace(/\/$/, '');
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function withRetry<T>(request: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && error.status < 500 && error.status !== 429) {
        throw error;
      }
      if (attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }
  throw lastError;
}

async function rawRequest<T>(path: string, method: HttpMethod = 'GET', body?: unknown, token?: string): Promise<T> {
  return withRetry(async () => {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const message = typeof payload === 'object' && payload && 'message' in payload ? String(payload.message) : 'Request failed';
      throw new ApiError(message, response.status);
    }
    return payload as T;
  });
}

export async function requestWithRefresh<T>(args: {
  path: string;
  method?: HttpMethod;
  body?: unknown;
  user?: AuthUser | null;
  onTokens?: (tokens: { token: string; refreshToken: string }) => Promise<void>;
}) {
  try {
    return await rawRequest<T>(args.path, args.method, args.body, args.user?.token);
  } catch (error) {
    if (!(error instanceof ApiError) || !args.user?.refreshToken || error.status !== 401) {
      throw error;
    }

    const tokens = await rawRequest<{ token: string; refreshToken: string }>('/auth/refresh-token', 'POST', {
      refreshToken: args.user.refreshToken,
    });

    if (args.onTokens) await args.onTokens(tokens);
    return rawRequest<T>(args.path, args.method, args.body, tokens.token);
  }
}

export const Api = {
  sendOtp: (mobile: string) => rawRequest<{ success: boolean; sid: string; message: string }>('/auth/send-otp', 'POST', { mobile }),
  verifyOtp: (mobile: string, otp: string, role: UserRole, name?: string) =>
    rawRequest<{ user: AuthUser }>('/auth/verify-otp', 'POST', { mobile, otp, role, name }),
  profile: (token: string) => rawRequest<{ user: AuthUser }>('/auth/me', 'GET', undefined, token),
  refreshToken: (refreshToken: string) => rawRequest<{ token: string; refreshToken: string }>('/auth/refresh-token', 'POST', { refreshToken }),
  logout: (token: string, refreshToken?: string) => rawRequest<void>('/auth/logout', 'POST', { refreshToken }, token),
  logoutAll: (token: string) => rawRequest<void>('/auth/logout-all', 'POST', undefined, token),
  loads: (token: string) => rawRequest<{ items: LoadItem[] }>('/loads', 'GET', undefined, token),
  createLoad: (token: string, body: Omit<LoadItem, 'id' | 'status'>) => rawRequest('/loads', 'POST', body, token),
  trips: (token: string) => rawRequest<{ items: TripItem[] }>('/trips', 'GET', undefined, token),
  tripHistory: (token: string, id: string) => rawRequest<{ item: TripItem }>('/trips/' + id + '/history', 'GET', undefined, token),
  updateTripLocation: (token: string, id: string, body: { currentLat: number; currentLng: number; speed?: number; heading?: number; accuracyM?: number }) =>
    rawRequest('/trips/' + id + '/location', 'PATCH', body, token),
  dashboard: (token: string) => rawRequest<{ metrics: DashboardMetrics }>('/dashboard/summary', 'GET', undefined, token),
  payments: (token: string) => rawRequest<{ items: Array<Record<string, unknown>> }>('/payments', 'GET', undefined, token),
};
