'use client';

import { useState } from 'react';

import { EmptyPhase } from '@/components/shared/EmptyPhase';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useLocale } from '@/components/providers/LocaleProvider';

export function NyayMitraDesk() {
  const { desk, app } = useLocale();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{app.workspaces.nyaymitra.short}</p>
          <h1 className="mt-1 text-headline">{app.workspaces.nyaymitra.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{app.workspaces.nyaymitra.purpose}</p>
        </div>
        <MetricBadge label="Phase 13–14" />
      </header>

      <label className="nd-card mt-8 flex cursor-pointer flex-col items-center justify-center px-6 py-12 text-center">
        <input
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? null);
          }}
        />
        <p className="text-sm font-semibold text-ink">{desk.nyay.drop}</p>
        {fileName ? <p className="mt-3 text-xs text-saffron">{fileName}</p> : null}
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <EmptyPhase title={desk.nyay.old} body={desk.nyay.hint} phase="Phase 14" />
        <EmptyPhase title={desk.nyay.neu} body={desk.nyay.pending} phase="Phase 13" />
      </div>
    </div>
  );
}

export default NyayMitraDesk;
