'use client';

import { useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ApiError, previewOcr, type OcrPreview } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Role } from '@/types';

const OCR_ROLES: readonly Role[] = ['POLICY_ANALYST', 'WELFARE_OFFICER', 'ADMIN'];

export function GazetteOcrStrip({ className }: { className?: string }) {
  const { desk } = useLocale();
  const { session } = useExperience();
  const copy = desk.nyay.ocr;
  const authed = Boolean(session?.accessToken);
  const allowed = Boolean(session?.roles?.some((role) => OCR_ROLES.includes(role)));
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<OcrPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <section className={cn('mt-4 nd-card p-4', className)}>
      <h2 className="text-sm font-semibold">{copy.title}</h2>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>
      {!authed ? (
        <p className="mt-2 text-xs text-ink-muted">{copy.guest}</p>
      ) : !allowed ? (
        <p className="mt-2 text-xs text-ink-muted">{copy.forbidden}</p>
      ) : (
        <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm">
          <input
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              setFileName(file.name);
              setBusy(true);
              setError(null);
              setPreview(null);
              void previewOcr(file)
                .then(setPreview)
                .catch((caught) => {
                  setError(caught instanceof ApiError ? caught.message : copy.failed);
                })
                .finally(() => setBusy(false));
            }}
          />
          {busy ? copy.busy : fileName ?? copy.drop}
        </label>
      )}
      {error ? <p className="mt-2 text-xs text-ink-muted">{error}</p> : null}
      {preview ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            {preview.available
              ? `${copy.confidence} ${preview.confidence ?? '—'} · ${preview.engine ?? 'tesseract'} · ${preview.pages}p`
              : copy.unavailable}
          </p>
          {preview.reason ? <p className="mt-1 text-xs text-ink-muted">{preview.reason}</p> : null}
          <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-canvas px-3 py-2 text-[11px] text-ink-soft">
            {preview.text || copy.empty}
          </pre>
          <p className="mt-1 text-[11px] text-ink-faint">{copy.notStored}</p>
        </div>
      ) : null}
    </section>
  );
}

export default GazetteOcrStrip;
