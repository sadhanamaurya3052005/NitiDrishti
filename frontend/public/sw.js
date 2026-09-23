/* NitiDrishti catalog snapshot worker.
 * Caches published scheme catalog + same-origin static shells.
 * Does not cache identity, eligibility votes, or ingest. Not a full offline app.
 */
const CATALOG_CACHE = 'nd-catalog-v1';
const STATIC_CACHE = 'nd-static-v1';
const META_PATH = '/nd-catalog-meta.json';

const PRECACHE = ['/schemes', '/citizen', '/icon.svg', '/manifest.webmanifest'];

function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function isCatalogRequest(url) {
  const path = pathnameOf(url);
  return (
    path === '/api/v1/schemes' ||
    path.startsWith('/api/v1/schemes/') ||
    path === '/api/v1/search/schemes' ||
    path.startsWith('/api/v1/search/schemes')
  );
}

function isBlockedRequest(url) {
  const path = pathnameOf(url);
  return (
    path.startsWith('/api/v1/auth') ||
    path.startsWith('/api/v1/eligibility') ||
    path.startsWith('/api/v1/what-if') ||
    path.startsWith('/api/v1/compare') ||
    path.startsWith('/api/v1/dossiers') ||
    path.startsWith('/api/v1/applications') ||
    path.startsWith('/api/v1/admin') ||
    path.startsWith('/api/v1/ocr') ||
    path.startsWith('/api/v1/alerts') ||
    path.startsWith('/api/v1/disaster/focus')
  );
}

function isStaticShell(url) {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== self.location.origin) return false;
    if (parsed.pathname.startsWith('/api/')) return false;
    return (
      /\.(js|css|woff2?|svg|png|jpe?g|webp|webmanifest)$/i.test(parsed.pathname) ||
      parsed.pathname === '/' ||
      parsed.pathname === '/schemes' ||
      parsed.pathname === '/citizen' ||
      parsed.pathname === '/icon.svg'
    );
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE.map(async (path) => {
          try {
            const response = await fetch(path, { cache: 'no-store' });
            if (response.ok) await cache.put(path, response);
          } catch {
            /* fail-closed: skip a missing shell file */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([CATALOG_CACHE, STATIC_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (isBlockedRequest(request.url)) return;
  if (isCatalogRequest(request.url)) {
    event.respondWith(networkFirstCatalog(request));
    return;
  }
  if (isStaticShell(request.url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstCatalog(request) {
  const cache = await caches.open(CATALOG_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) {
      await cache.put(request, fresh.clone());
      await cache.put(
        new Request(META_PATH),
        new Response(JSON.stringify({ cachedAt: Date.now(), url: request.url }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (!cached) {
      return new Response('catalog snapshot missing', { status: 503, statusText: 'Offline' });
    }
    const headers = new Headers(cached.headers);
    headers.set('X-ND-Catalog', 'snapshot');
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetching;
}
