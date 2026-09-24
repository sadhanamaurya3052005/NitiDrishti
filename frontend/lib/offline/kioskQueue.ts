import { normalizeApplicant, type KioskQueuedApplicant } from './kioskModel.ts';

const DB_NAME = 'nitidrishti';
const STORE = 'kiosk-queue';
const DB_VERSION = 2;

export type { KioskOp, KioskQueuedApplicant } from './kioskModel.ts';
export {
  applicantState,
  buildQueuedApplicant,
  newQueueId,
  newRequestId,
  normalizeApplicant,
} from './kioskModel.ts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function listKioskQueue(): Promise<KioskQueuedApplicant[]> {
  if (typeof indexedDB === 'undefined') return [];
  const db = await openDb();
  const raw = await new Promise<unknown[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as unknown[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  const rows: KioskQueuedApplicant[] = [];
  for (const item of raw) {
    const parsed = normalizeApplicant(item);
    if (parsed) rows.push(parsed);
  }
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rows;
}

export async function enqueueKioskApplicant(row: KioskQueuedApplicant): Promise<void> {
  const parsed = normalizeApplicant(row);
  if (!parsed) throw new Error('malformed queue record');
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(parsed);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function putKioskApplicant(row: KioskQueuedApplicant): Promise<void> {
  return enqueueKioskApplicant(row);
}

export async function getKioskApplicant(id: string): Promise<KioskQueuedApplicant | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDb();
  const raw = await new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
  return normalizeApplicant(raw);
}

export async function deleteKioskApplicant(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetKioskRetry(id: string): Promise<void> {
  const row = await getKioskApplicant(id);
  if (!row) return;
  const next: KioskQueuedApplicant = {
    ...row,
    ops: row.ops.map((op) =>
      op.state === 'SYNCED'
        ? op
        : {
            ...op,
            state: 'QUEUED',
            nextRetryAt: null,
            lastError: null,
            updatedAt: new Date().toISOString(),
          },
    ),
  };
  await putKioskApplicant(next);
}

export async function clearKioskQueue(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
