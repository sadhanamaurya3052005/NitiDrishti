import { API_BASE_URL } from '@/lib/config';
import { OFFICIAL_SCHEME_CATALOG } from '@/lib/schemes/catalog';
import type { ApiEnvelope, HealthResponse, SchemeRecord } from '@/types';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  /** Abort the request after this many milliseconds. */
  timeoutMs?: number;
}

/**
 * Single entry point for backend calls. The frontend never talks to a
 * government source directly (PROJECT_RULES Rule 6).
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 8000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...init.headers },
    });

    if (!response.ok) {
      throw new ApiError(`Request to ${path} failed`, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`Request to ${path} timed out`, 408);
    }
    throw new ApiError(`Backend unreachable at ${API_BASE_URL}`, 503);
  } finally {
    clearTimeout(timer);
  }
}

export function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>('/health', { cache: 'no-store', timeoutMs: 5000 });
}

export async function getSchemes(params?: {
  category?: string;
  q?: string;
}): Promise<{ schemes: SchemeRecord[]; source: 'api' | 'catalog' }> {
  const search = new URLSearchParams();
  if (params?.category && params.category !== 'all') search.set('category', params.category);
  if (params?.q) search.set('q', params.q);
  const suffix = search.toString() ? `?${search.toString()}` : '';

  try {
    const payload = await apiFetch<ApiEnvelope<{ schemes: SchemeRecord[] }> | { schemes: SchemeRecord[] }>(
      `/api/v1/schemes${suffix}`,
      { cache: 'no-store', timeoutMs: 6000 },
    );
    const schemes =
      'data' in payload && payload.data?.schemes
        ? payload.data.schemes
        : 'schemes' in payload
          ? payload.schemes
          : [];
    if (schemes.length) return { schemes, source: 'api' };
  } catch {
    /* Fall through to the local official catalog until Phase 7 ingestion is live. */
  }

  const query = (params?.q ?? '').trim().toLowerCase();
  const schemes = OFFICIAL_SCHEME_CATALOG.filter((scheme) => {
    const categoryOk = !params?.category || params.category === 'all' || scheme.category === params.category;
    const text = `${scheme.name} ${scheme.nameHi} ${scheme.ministry} ${scheme.summary}`.toLowerCase();
    const queryOk = !query || text.includes(query);
    return categoryOk && queryOk;
  });
  return { schemes, source: 'catalog' };
}
