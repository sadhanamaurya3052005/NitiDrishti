/** Pure CSC queue policy. No IndexedDB, no network, no tokens. */

export type QueueState = 'QUEUED' | 'SYNCING' | 'SYNCED' | 'RETRY_REQUIRED' | 'FAILED' | 'CONFLICT';

export type ErrorClass = 'RETRYABLE' | 'AUTH' | 'PERMANENT' | 'CONFLICT';

export const MAX_AUTO_RETRIES = 8;
export const STALE_SYNCING_MS = 30_000;
export const BACKOFF_CAP_MS = 120_000;

export function classifySyncFailure(status: number | null, network: boolean): ErrorClass {
  if (network || status === null) return 'RETRYABLE';
  if (status === 408 || status === 429 || status === 502 || status === 503 || status === 504) return 'RETRYABLE';
  if (status >= 500) return 'RETRYABLE';
  if (status === 401 || status === 403) return 'AUTH';
  if (status === 409) return 'CONFLICT';
  return 'PERMANENT';
}

export function backoffMs(retryCount: number): number {
  const exp = Math.min(Math.max(retryCount, 0), 6);
  return Math.min(BACKOFF_CAP_MS, 1000 * 2 ** exp);
}

export function isDue(nextRetryAt: string | null | undefined, now = Date.now()): boolean {
  if (!nextRetryAt) return true;
  const stamp = Date.parse(nextRetryAt);
  if (Number.isNaN(stamp)) return true;
  return stamp <= now;
}

export function isStaleSyncing(updatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!updatedAt) return true;
  const stamp = Date.parse(updatedAt);
  if (Number.isNaN(stamp)) return true;
  return now - stamp > STALE_SYNCING_MS;
}

export function rowState(states: QueueState[]): QueueState {
  if (states.includes('CONFLICT')) return 'CONFLICT';
  if (states.includes('FAILED')) return 'FAILED';
  if (states.includes('RETRY_REQUIRED')) return 'RETRY_REQUIRED';
  if (states.includes('SYNCING')) return 'SYNCING';
  if (states.includes('QUEUED')) return 'QUEUED';
  if (states.length > 0 && states.every((item) => item === 'SYNCED')) return 'SYNCED';
  return 'QUEUED';
}
