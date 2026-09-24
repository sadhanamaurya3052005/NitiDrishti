import { ApiError, getHealth } from '@/lib/api';
import { createApplication, type ApplicationRecord } from '@/lib/blockE';
import { readStoredSession } from '@/lib/config';
import {
  backoffMs,
  classifySyncFailure,
  isDue,
  MAX_AUTO_RETRIES,
  type ErrorClass,
} from '@/lib/offline/kioskPolicy';
import {
  applicantState,
  getKioskApplicant,
  listKioskQueue,
  putKioskApplicant,
  type KioskOp,
  type KioskQueuedApplicant,
} from '@/lib/offline/kioskQueue';

export type SyncResult = {
  filed: ApplicationRecord[];
  pending: number;
  failed: number;
};

const SYNC_EVENT = 'nd-kiosk-sync';

let inFlight: Promise<SyncResult> | null = null;
let listenersBound = false;
let debounce: number | null = null;

function logEvent(event: string, detail: Record<string, string | number | null | undefined>): void {
  const safe: Record<string, string | number | null | undefined> = { ...detail };
  delete safe.token;
  delete safe.password;
  delete safe.name;
  console.info('[nd-kiosk]', event, safe);
}

function stamp(): string {
  return new Date().toISOString();
}

async function apiReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    await getHealth();
    return true;
  } catch {
    return false;
  }
}

function applyClass(op: KioskOp, klass: ErrorClass, message: string, hasToken: boolean): KioskOp {
  const next: KioskOp = { ...op, lastError: message, updatedAt: stamp() };
  if (klass === 'CONFLICT') {
    next.state = 'CONFLICT';
    return next;
  }
  if (klass === 'PERMANENT') {
    next.state = 'FAILED';
    return next;
  }
  if (klass === 'AUTH') {
    next.state = 'RETRY_REQUIRED';
    next.nextRetryAt = hasToken ? stamp() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return next;
  }
  const retryCount = op.retryCount + 1;
  next.retryCount = retryCount;
  if (retryCount >= MAX_AUTO_RETRIES) {
    next.state = 'FAILED';
    next.lastError = `${message} (retry limit)`;
    return next;
  }
  next.state = 'RETRY_REQUIRED';
  next.nextRetryAt = new Date(Date.now() + backoffMs(retryCount)).toISOString();
  return next;
}

async function persist(row: KioskQueuedApplicant): Promise<void> {
  await putKioskApplicant(row);
}

async function syncOneOp(row: KioskQueuedApplicant, index: number, hasToken: boolean): Promise<ApplicationRecord | null> {
  const op = row.ops[index];
  if (!op || !op.schemeId || !op.requestId) {
    if (op) {
      row.ops[index] = {
        schemeId: op.schemeId || '',
        requestId: op.requestId || `broken-${row.id}-${index}`,
        state: 'FAILED',
        retryCount: op.retryCount,
        lastError: 'malformed operation',
        nextRetryAt: null,
        syncedAt: null,
        updatedAt: stamp(),
        serverApplicationId: null,
      };
      await persist(row);
    }
    return null;
  }
  if (op.state === 'SYNCED') return null;
  if (op.state === 'FAILED' || op.state === 'CONFLICT') return null;
  if (op.state === 'SYNCING') return null;
  const authHeld = op.state === 'RETRY_REQUIRED' && (op.lastError || '').startsWith('auth');
  if (!isDue(op.nextRetryAt) && !(authHeld && hasToken)) return null;
  if ((op.state === 'QUEUED' || op.state === 'RETRY_REQUIRED') === false) return null;

  row.ops[index] = { ...op, state: 'SYNCING', updatedAt: stamp(), lastError: null };
  await persist(row);
  logEvent('sync_started', { id: row.id, requestId: op.requestId, schemeId: op.schemeId });

  try {
    const filed = await createApplication({ scheme_id: op.schemeId, stage: 'Submitted' }, op.requestId);
    row.ops[index] = {
      ...row.ops[index],
      state: 'SYNCED',
      serverApplicationId: filed.id,
      syncedAt: stamp(),
      updatedAt: stamp(),
      lastError: null,
      nextRetryAt: null,
    };
    await persist(row);
    logEvent('sync_success', { id: row.id, requestId: op.requestId, applicationId: filed.id });
    return filed;
  } catch (error) {
    const status = error instanceof ApiError ? error.status : null;
    const network = status === 408 || status === 503 || status === 502;
    const klass = classifySyncFailure(status, network && !(error instanceof ApiError && error.status === 401));
    const message =
      error instanceof ApiError
        ? klass === 'AUTH'
          ? `auth: ${error.message}`
          : error.message
        : 'network unavailable';
    const resolved = klass === 'AUTH' && status === 401 ? 'AUTH' : klass;
    row.ops[index] = applyClass(row.ops[index], resolved, message, hasToken);
    await persist(row);
    if (row.ops[index].state === 'RETRY_REQUIRED') {
      logEvent('sync_retry', { id: row.id, requestId: op.requestId, retryCount: row.ops[index].retryCount });
    } else if (row.ops[index].state === 'CONFLICT') {
      logEvent('sync_conflict', { id: row.id, requestId: op.requestId });
    } else {
      logEvent('sync_failed', { id: row.id, requestId: op.requestId, status: status ?? 0 });
    }
    return null;
  }
}

async function runSync(): Promise<SyncResult> {
  const filed: ApplicationRecord[] = [];
  let pending = 0;
  let failed = 0;
  const token = readStoredSession()?.accessToken;
  if (!token) {
    const rows = await listKioskQueue().catch(() => []);
    for (const row of rows) {
      const state = applicantState(row);
      if (state === 'FAILED' || state === 'CONFLICT') failed += 1;
      else if (state !== 'SYNCED') pending += 1;
    }
    return { filed, pending, failed };
  }
  const reachable = await apiReachable();
  if (!reachable) {
    const rows = await listKioskQueue().catch(() => []);
    return {
      filed,
      pending: rows.filter((row) => applicantState(row) !== 'SYNCED').length,
      failed: rows.filter((row) => {
        const state = applicantState(row);
        return state === 'FAILED' || state === 'CONFLICT';
      }).length,
    };
  }

  const rows = await listKioskQueue().catch(() => []);
  for (const listed of rows) {
    let row: KioskQueuedApplicant | null = listed;
    try {
      const fresh = await getKioskApplicant(listed.id);
      row = fresh ?? listed;
      for (let index = 0; index < row.ops.length; index += 1) {
        const result = await syncOneOp(row, index, true);
        if (result) filed.push(result);
      }
    } catch {
      logEvent('sync_failed', { id: listed.id, requestId: 'malformed' });
    }
    const latest = (await getKioskApplicant(listed.id).catch(() => row)) ?? row;
    if (!latest) continue;
    const state = applicantState(latest);
    if (state === 'FAILED' || state === 'CONFLICT') failed += 1;
    else if (state !== 'SYNCED') pending += 1;
  }
  return { filed, pending, failed };
}

export function syncKioskQueue(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = runSync().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

export function requestKioskSync(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function bindKioskSyncListeners(): void {
  if (typeof window === 'undefined' || listenersBound) return;
  listenersBound = true;
  const kick = () => {
    if (debounce) window.clearTimeout(debounce);
    debounce = window.setTimeout(() => {
      void syncKioskQueue();
    }, 300) as unknown as number;
  };
  window.addEventListener(SYNC_EVENT, kick);
  window.addEventListener('online', kick);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') kick();
  });
}

export { SYNC_EVENT };
