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

export interface AuthProfile {
  age: number | null;
  income: number | null;
  land_hectares: number | null;
  gender: string | null;
  category: string | null;
  occupation: string | null;
  consent_retention: boolean;
}

export interface AuthUser {
  id: string;
  email_masked: string | null;
  display_name: string | null;
  roles: Role[];
  is_active: boolean;
  profile: AuthProfile | null;
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
  if (init.body && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
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

export function deleteAccount(): Promise<{ purged: boolean }> {
  return authEnvelope<{ purged: boolean }>('/api/v1/auth/account', { method: 'DELETE' });
}

export function updateProfile(patch: {
  consent_retention?: boolean;
  age?: number | null;
  income?: number | null;
  land_hectares?: number | null;
  gender?: 'any' | 'female' | 'male' | null;
  category?: string | null;
  occupation?: string | null;
}): Promise<AuthUser> {
  return authEnvelope<AuthUser>('/api/v1/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(patch),
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

export interface WhatIfHint {
  ruleId?: string;
  kind: string;
  message: string;
}

export interface WhatIfItem extends EligibilityItem {
  hints?: WhatIfHint[];
}

export function evaluateWhatIf(input: {
  scheme_ids?: string[];
  profile: DeclaredEligibilityProfile;
}): Promise<{ evaluations: WhatIfItem[]; profile_source: string; disclaimer?: string }> {
  return authEnvelope<{ evaluations: WhatIfItem[]; profile_source: string; disclaimer?: string }>(
    '/api/v1/what-if',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
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

export interface ReviewSchemeRecord extends SchemeRecord {
  status?: 'draft' | 'published' | 'archived' | 'needs_review';
  versionNumber?: number | null;
  retrievedAt?: string | null;
  ruleCount?: number;
  reasons?: string[];
  conflicts?: { kind: string; message: string }[];
}

export function listReviewQueue(): Promise<{ schemes: ReviewSchemeRecord[]; count: number }> {
  return authEnvelope<{ schemes: ReviewSchemeRecord[]; count: number }>('/api/v1/review/schemes');
}

export function reviewScheme(
  schemeId: string,
  action: 'approve' | 'reject',
): Promise<{ id: string; status: string; action: string }> {
  return authEnvelope<{ id: string; status: string; action: string }>(
    `/api/v1/review/schemes/${encodeURIComponent(schemeId)}`,
    {
      method: 'POST',
      body: JSON.stringify({ action }),
    },
  );
}

export interface SourceStatusItem {
  id: string;
  name: string;
  domain: string;
  source_url: string;
  connector_type: string;
  last_checked_at: string | null;
  last_status: string | null;
  last_error_code: string | null;
  rows_upserted: number;
}

export interface SourceStatusPayload {
  sources: SourceStatusItem[];
  live_feed?: boolean;
  scheduler_enabled?: boolean;
  interval_hours?: number;
  note?: string;
}

export interface DeadLetterItem {
  log_id: string;
  source_id: string;
  source_url: string | null;
  name: string | null;
  status: string;
  error_code: string | null;
  detail: string | null;
  http_status: number | null;
  started_at: string;
  finished_at: string | null;
  content_hash: string | null;
}

export async function getSourceStatus(): Promise<SourceStatusPayload> {
  const payload = await apiFetch<ApiEnvelope<SourceStatusPayload>>('/api/v1/sources/status', {
    cache: 'no-store',
    timeoutMs: 6000,
    skipAuth: true,
  });
  if (!payload.success || payload.data == null) {
    throw new ApiError(payload.error?.message ?? 'Source status failed', 502, payload.error?.code);
  }
  return payload.data;
}

export interface PipelineLayerCounts {
  documents?: number;
  needs_review?: number;
  published?: number;
  path?: string;
  note?: string;
}

export interface PipelineMap {
  principle: string;
  llm_votes_eligibility: boolean;
  airflow: boolean;
  orchestrator: string;
  robots_fail_closed: boolean;
  live_feed: boolean;
  interval_hours: number;
  stages: string[];
  layers: {
    bronze: PipelineLayerCounts;
    silver: PipelineLayerCounts;
    gold: PipelineLayerCounts;
  };
  dead_letter: number;
  active_sources: number;
}

export async function getPipelineMap(): Promise<PipelineMap> {
  const payload = await apiFetch<ApiEnvelope<PipelineMap>>('/api/v1/pipeline', {
    cache: 'no-store',
    timeoutMs: 6000,
    skipAuth: true,
  });
  if (!payload.success || payload.data == null) {
    throw new ApiError(payload.error?.message ?? 'Pipeline map failed', 502, payload.error?.code);
  }
  return payload.data;
}

export function listDeadLetter(): Promise<{ items: DeadLetterItem[] }> {
  return authEnvelope<{ items: DeadLetterItem[] }>('/api/v1/sources/dead-letter');
}

export function rerunSource(sourceId: string): Promise<{
  source_id: string;
  status: string;
  rows_upserted: number;
  detail: string | null;
}> {
  return authEnvelope<{ source_id: string; status: string; rows_upserted: number; detail: string | null }>(
    `/api/v1/sources/${encodeURIComponent(sourceId)}/run`,
    { method: 'POST', timeoutMs: 20000 },
  );
}

export interface OcrPreview {
  available: boolean;
  engine: string | null;
  text: string;
  confidence: number | null;
  pages: number;
  reason: string | null;
  persisted: boolean;
}

export function previewOcr(file: File): Promise<OcrPreview> {
  const body = new FormData();
  body.append('file', file);
  return authEnvelope<OcrPreview>('/api/v1/ocr/preview', {
    method: 'POST',
    body,
    timeoutMs: 30000,
  });
}

export interface AdminDirectoryUser {
  id: string;
  email_masked: string | null;
  display_name: string | null;
  roles: Role[];
  is_active: boolean;
  created_at: string;
}

export interface AdminAuditEntry {
  id: string;
  action: string;
  actor_user_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  request_id: string | null;
  detail: string | null;
  created_at: string;
}

export interface AdminFlags {
  source: string;
  writable: boolean;
  environment: string;
  flags: Record<string, boolean>;
}

export function listAdminUsers(email?: string): Promise<{ items: AdminDirectoryUser[] }> {
  const query = email ? `?email=${encodeURIComponent(email)}` : '';
  return authEnvelope<{ items: AdminDirectoryUser[] }>(`/api/v1/admin/users${query}`);
}

export function assignAdminRoles(userId: string, roles: Role[]): Promise<AdminDirectoryUser> {
  return authEnvelope<AdminDirectoryUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/roles`, {
    method: 'PATCH',
    body: JSON.stringify({ roles }),
  });
}

export function setAdminUserActive(userId: string, isActive: boolean): Promise<AdminDirectoryUser> {
  return authEnvelope<AdminDirectoryUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function listAdminAudit(): Promise<{ items: AdminAuditEntry[] }> {
  return authEnvelope<{ items: AdminAuditEntry[] }>('/api/v1/admin/audit?limit=20&action=role_change');
}

export function getAdminFlags(): Promise<AdminFlags> {
  return authEnvelope<AdminFlags>('/api/v1/admin/flags');
}

export interface DisasterSchemeRow {
  id: string;
  name: string;
  name_hi: string;
  source_url: string;
  category: 'disaster';
  state_iso: string | null;
  coverage: string;
}

export interface DisasterSummary {
  enabled: boolean;
  ndma_live: boolean;
  postgis: boolean;
  geometry: string | null;
  source: string;
  published_count: number;
  schemes: DisasterSchemeRow[];
  states: { iso_code: string; name: string; name_hi: string; bundled_district_count: number }[];
  districts: { name: string; state_iso: string; geometry: string }[];
  focus: { state_iso: string; state_name: string; state_name_hi: string; district_name: string } | null;
  reason: string | null;
}

export function getDisasterSummary(): Promise<DisasterSummary> {
  return authEnvelope<DisasterSummary>('/api/v1/disaster/summary', { skipAuth: true });
}

export function postDisasterFocus(stateIso: string, districtName: string): Promise<DisasterSummary> {
  return authEnvelope<DisasterSummary>('/api/v1/disaster/focus', {
    method: 'POST',
    body: JSON.stringify({ state_iso: stateIso, district_name: districtName }),
  });
}

