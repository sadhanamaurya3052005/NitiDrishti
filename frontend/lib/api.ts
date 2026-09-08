import { API_BASE_URL } from '@/lib/config';
import type { HealthResponse } from '@/types';

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
