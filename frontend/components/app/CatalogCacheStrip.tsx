'use client';

import { useEffect, useState } from 'react';

import { usePwa } from '@/components/providers/PwaProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { readCatalogSnapshotMeta, serviceWorkerSupported } from '@/lib/offline/catalogCache';

export function CatalogCacheStrip() {
  const { desk } = useLocale();
  const copy = desk.catalogCache;
  const { workerReady, catalogCacheEnabled, optedOut, setOptOut } = usePwa();
  const [snapshotAt, setSnapshotAt] = useState<number | null>(null);
  const supported = serviceWorkerSupported();

  useEffect(() => {
    void readCatalogSnapshotMeta().then((meta) => setSnapshotAt(meta?.cachedAt ?? null));
  }, [workerReady]);

  const when = snapshotAt
    ? new Date(snapshotAt).toLocaleString()
    : null;

  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{copy.title}</p>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>
      {!supported ? <p className="mt-2 text-sm text-ink-soft">{copy.unsupported}</p> : null}
      {supported && !catalogCacheEnabled ? <p className="mt-2 text-sm text-ink-soft">{copy.off}</p> : null}
      {supported && catalogCacheEnabled && workerReady ? (
        <p className="mt-2 text-sm text-ink-soft">{copy.ready}</p>
      ) : null}
      {supported && catalogCacheEnabled ? (
        <p className="mt-1 text-xs text-ink-muted">
          {when ? `${copy.snapshot} · ${when}` : copy.none}
        </p>
      ) : null}
      <p className="mt-1 text-[11px] text-ink-muted">{copy.eligibility}</p>
      {supported && !optedOut && catalogCacheEnabled ? (
        <button
          type="button"
          className="mt-2 rounded-pill border border-line px-3 py-1 text-xs font-semibold"
          onClick={() => setOptOut(true)}
        >
          {copy.optOut}
        </button>
      ) : null}
      {supported && optedOut ? (
        <button
          type="button"
          className="mt-2 rounded-pill border border-line px-3 py-1 text-xs font-semibold"
          onClick={() => setOptOut(false)}
        >
          {copy.optIn}
        </button>
      ) : null}
    </section>
  );
}

export default CatalogCacheStrip;
