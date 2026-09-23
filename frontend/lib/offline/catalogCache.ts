/** Honest catalog-snapshot helpers. Not a full offline app. */

export const OFFLINE_CATALOG_STORAGE_KEY = 'nd.offlineCatalog';
export const CATALOG_CACHE_NAME = 'nd-catalog-v1';
export const CATALOG_META_PATH = '/nd-catalog-meta.json';

export function offlineCatalogFeatureOn(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_OFFLINE_CATALOG !== 'false';
}

export function catalogCacheOptedOut(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(OFFLINE_CATALOG_STORAGE_KEY) === '0';
}

export function setCatalogCacheOptOut(optOut: boolean): void {
  if (optOut) window.localStorage.setItem(OFFLINE_CATALOG_STORAGE_KEY, '0');
  else window.localStorage.removeItem(OFFLINE_CATALOG_STORAGE_KEY);
}

export function serviceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

export async function readCatalogSnapshotMeta(): Promise<{ cachedAt: number; url: string } | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CATALOG_CACHE_NAME);
    const hit = await cache.match(CATALOG_META_PATH);
    if (!hit) return null;
    const body = (await hit.json()) as { cachedAt?: number; url?: string };
    if (typeof body.cachedAt !== 'number') return null;
    return { cachedAt: body.cachedAt, url: body.url ?? '' };
  } catch {
    return null;
  }
}
