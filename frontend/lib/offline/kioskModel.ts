/** Pure CSC queue record helpers. No IndexedDB, no network. */

import {
  isStaleSyncing,
  rowState,
  type QueueState,
} from './kioskPolicy.ts';

export interface KioskOp {
  schemeId: string;
  requestId: string;
  state: QueueState;
  retryCount: number;
  lastError: string | null;
  nextRetryAt: string | null;
  syncedAt: string | null;
  updatedAt: string | null;
  serverApplicationId: string | null;
}

export interface KioskQueuedApplicant {
  id: string;
  name: string;
  maskedId: string;
  age: number;
  income: number;
  createdAt: string;
  schemeIds: string[];
  operation: 'application_create';
  ops: KioskOp[];
}

function newId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newQueueId(): string {
  return newId('vle');
}

export function newRequestId(): string {
  return newId('req');
}

function nowIso(): string {
  return new Date().toISOString();
}

function asOp(raw: unknown, fallbackScheme: string): KioskOp | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const schemeId = typeof row.schemeId === 'string' ? row.schemeId : fallbackScheme;
  const requestId = typeof row.requestId === 'string' && row.requestId ? row.requestId : newRequestId();
  if (!schemeId) return null;
  const state = (typeof row.state === 'string' ? row.state : 'QUEUED') as QueueState;
  const allowed: QueueState[] = ['QUEUED', 'SYNCING', 'SYNCED', 'RETRY_REQUIRED', 'FAILED', 'CONFLICT'];
  return {
    schemeId,
    requestId,
    state: allowed.includes(state) ? state : 'QUEUED',
    retryCount: typeof row.retryCount === 'number' ? row.retryCount : 0,
    lastError: typeof row.lastError === 'string' ? row.lastError : null,
    nextRetryAt: typeof row.nextRetryAt === 'string' ? row.nextRetryAt : null,
    syncedAt: typeof row.syncedAt === 'string' ? row.syncedAt : null,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : null,
    serverApplicationId: typeof row.serverApplicationId === 'string' ? row.serverApplicationId : null,
  };
}

function reclaim(op: KioskOp): KioskOp {
  if (op.state === 'SYNCING' && isStaleSyncing(op.updatedAt)) {
    return { ...op, state: 'RETRY_REQUIRED', lastError: op.lastError ?? 'sync interrupted' };
  }
  return op;
}

export function normalizeApplicant(raw: unknown): KioskQueuedApplicant | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== 'string' || !row.id) return null;
  const schemeIds = Array.isArray(row.schemeIds)
    ? row.schemeIds.filter((item): item is string => typeof item === 'string')
    : [];
  const createdAt = typeof row.createdAt === 'string' ? row.createdAt : nowIso();
  let ops: KioskOp[] = [];
  if (Array.isArray(row.ops)) {
    ops = row.ops.map((item, index) => asOp(item, schemeIds[index] ?? '')).filter((item): item is KioskOp => item != null);
  }
  if (ops.length === 0 && schemeIds.length > 0) {
    ops = schemeIds.map((schemeId) => ({
      schemeId,
      requestId: newRequestId(),
      state: 'QUEUED' as const,
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
      syncedAt: null,
      updatedAt: null,
      serverApplicationId: null,
    }));
  }
  ops = ops.map(reclaim);
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    maskedId: typeof row.maskedId === 'string' ? row.maskedId : '',
    age: typeof row.age === 'number' ? row.age : 0,
    income: typeof row.income === 'number' ? row.income : 0,
    createdAt,
    schemeIds: schemeIds.length ? schemeIds : ops.map((item) => item.schemeId),
    operation: 'application_create',
    ops,
  };
}

export function applicantState(row: KioskQueuedApplicant): QueueState {
  return rowState(row.ops.map((item) => item.state));
}

export function buildQueuedApplicant(input: {
  name: string;
  maskedId: string;
  age: number;
  income: number;
  schemeIds: string[];
}): KioskQueuedApplicant {
  const createdAt = nowIso();
  const schemeIds = input.schemeIds.filter(Boolean);
  return {
    id: newQueueId(),
    name: input.name,
    maskedId: input.maskedId,
    age: input.age,
    income: input.income,
    createdAt,
    schemeIds,
    operation: 'application_create',
    ops: schemeIds.map((schemeId) => ({
      schemeId,
      requestId: newRequestId(),
      state: 'QUEUED',
      retryCount: 0,
      lastError: null,
      nextRetryAt: null,
      syncedAt: null,
      updatedAt: createdAt,
      serverApplicationId: null,
    })),
  };
}
