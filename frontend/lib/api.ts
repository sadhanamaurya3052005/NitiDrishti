import { API_BASE_URL, readStoredSession } from '@/lib/config';
import type { SchemeEvaluation } from '@/lib/schemes/evaluate';
import type { ApiEnvelope, HealthResponse, Role, SchemeRecord } from '@/types';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions extends RequestInit {
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
  /** Skip attaching the JWT (health probes, login, register). */
  skipAuth?: boolean;
}

export interface AuthUser {
  id: string;
  email_masked: string | null;
  display_name: string | null;
  roles: Role[];
  is_active: boolean;
  profile: Record<string, unknown> | null;
}

export interface TokenBundle {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: AuthUser;
}

/**
 * Single entry point for backend calls. The frontend never talks to a
 * government source directly (PROJECT_RULES Rule 6).
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 8000, skipAuth = false, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (!skipAuth && !headers.has('Authorization')) {
    const token = readStoredSession()?.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });

    const payload = (await response.json()) as T;
    if (!response.ok) {
      const envelope = payload as { error?: { message?: string; code?: string } };
      throw new ApiError(
        envelope.error?.message ?? `Request to ${path} failed`,
        response.status,
        envelope.error?.code,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) {
      throw new ApiError(`Request to ${path} failed`, 502);
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out`, 408);
    }
    throw new ApiError(`Backend unreachable at ${API_BASE_URL}`, 503);
  } finally {
    clearTimeout(timer);
  }
}

async function authEnvelope<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await apiFetch<ApiEnvelope<T>>(path, options);
  if (!payload.success || payload.data == null) {
    throw new ApiError(payload.error?.message ?? 'Request failed', 400, payload.error?.code);
  }
  return payload.data;
}

export function registerAccount(input: {
  email: string;
  password: string;
  display_name?: string;
}): Promise<TokenBundle> {
  return authEnvelope<TokenBundle>('/api/v1/auth/register', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(input),
  });
}

export function loginAccount(input: { email: string; password: string }): Promise<TokenBundle> {
  return authEnvelope<TokenBundle>('/api/v1/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify(input),
  });
}

export function refreshAccount(refreshToken: string): Promise<TokenBundle> {
  return authEnvelope<TokenBundle>('/api/v1/auth/refresh', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function logoutAccount(accessToken: string): Promise<{ logged_out: boolean }> {
  return authEnvelope<{ logged_out: boolean }>('/api/v1/auth/logout', {
    method: 'POST',
    skipAuth: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function fetchMe(accessToken: string): Promise<AuthUser> {
  return authEnvelope<AuthUser>('/api/v1/auth/me', {
    skipAuth: true,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { cache: 'no-store', timeoutMs: 5000, skipAuth: true });
}

export interface DeclaredEligibilityProfile {
  age: number;
  income: number;
  land_hectares: number;
  gender: 'any' | 'female' | 'male';
  category: string;
  occupation: string;
}

export interface CatalogPayload {
  schemes: SchemeRecord[];
  source?: 'postgres' | 'static_fallback';
  published_count?: number;
}

export interface EligibilityItem {
  scheme: SchemeRecord;
  evaluation: SchemeEvaluation;
}

export interface CompareItem extends EligibilityItem {
  documents: { id: string; label: string; mandatory?: boolean }[];
}

export interface DossierRecord {
  id: string;
  scheme_id: string | null;
  scheme_name: string;
  status: 'queued' | 'ready' | 'failed';
  created_at: string;
}

function unwrapCatalog(
  payload: ApiEnvelope<CatalogPayload> | CatalogPayload,
): CatalogPayload | null {
  if ('data' in payload && payload.data && Array.isArray(payload.data.schemes)) {
    return payload.data;
  }
  if ('schemes' in payload && Array.isArray(payload.schemes)) {
    return payload;
  }
  return null;
}

export async function getSchemes(params?: {
  category?: string;
  q?: string;
}): Promise<{ schemes: SchemeRecord[]; source: 'api' | 'catalog'; publishedCount?: number }> {
  const search = new URLSearchParams();
  if (params?.category && params.category !== 'all') search.set('category', params.category);
  if (params?.q) search.set('q', params.q);
  const suffix = search.toString() ? `?${search.toString()}` : '';
  const path = params?.q?.trim() ? `/api/v1/search/schemes${suffix}` : `/api/v1/schemes${suffix}`;

  try {
    const payload = await apiFetch<ApiEnvelope<CatalogPayload> | CatalogPayload>(path, {
      cache: 'no-store',
      timeoutMs: 6000,
      skipAuth: true,
    });
    const data = unwrapCatalog(payload);
    if (data) {
      if (data.source === 'postgres') {
        return { schemes: data.schemes, source: 'api', publishedCount: data.published_count };
      }
      if (data.schemes.length) {
        return { schemes: data.schemes, source: 'api', publishedCount: data.published_count };
      }
    }
  } catch {
    /* Network/API failure — show an empty catalog, never invented rows. */
  }

  return { schemes: [], source: 'catalog' };
}

export function evaluateEligibility(input: {
  scheme_ids?: string[];
  profile: DeclaredEligibilityProfile;
}): Promise<{ evaluations: EligibilityItem[]; profile_source: string }> {
  return authEnvelope<{ evaluations: EligibilityItem[]; profile_source: string }>('/api/v1/eligibility', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function compareSchemes(input: {
  scheme_ids: string[];
  profile: DeclaredEligibilityProfile;
}): Promise<{ items: CompareItem[]; profile_source: string }> {
  return authEnvelope<{ items: CompareItem[]; profile_source: string }>('/api/v1/compare', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getSchemeDocuments(schemeId: string): Promise<{ documents: { id: string; label: string }[] }> {
  return authEnvelope<{ documents: { id: string; label: string }[] }>(
    `/api/v1/schemes/${encodeURIComponent(schemeId)}/documents`,
    { skipAuth: true },
  );
}

export function createDossier(schemeId: string): Promise<DossierRecord> {
  return authEnvelope<DossierRecord>('/api/v1/dossiers', {
    method: 'POST',
    body: JSON.stringify({ scheme_id: schemeId }),
  });
}

export function listDossiers(): Promise<{ dossiers: DossierRecord[] }> {
  return authEnvelope<{ dossiers: DossierRecord[] }>('/api/v1/dossiers');
}

