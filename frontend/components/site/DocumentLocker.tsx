'use client';

import { FileScan, UploadCloud } from 'lucide-react';
import { useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Reveal } from '@/components/motion/Reveal';

export function DocumentLocker() {
  const { home } = useLocale();
  const { setDocument, roleView, dossierQueue } = useExperience();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, string> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const ingest = (file: File) => {
    setFileName(file.name);
    setBusy(true);
    const lower = file.name.toLowerCase();
    if (lower.includes('land') || lower.includes('khasra')) {
      setDocument('land', true);
    } else if (lower.includes('ration')) {
      setDocument('ration', true);
    } else if (lower.includes('aadhaar') || lower.includes('aadhar')) {
      setDocument('aadhaar', true);
    }
    window.setTimeout(() => {
      setPreview({
        file: file.name,
        note: 'Self-declared tick only. Identity images stay in this tab and are not OCRed or uploaded.',
      });
      setBusy(false);
    }, 200);
  };

  return (
    <section id="locker" className="scroll-mt-28 border-y border-line bg-surface-muted py-20">
      <div className="nd-section grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          <p className="nd-eyebrow">{home.locker.eyebrow}</p>
          <h2 className="mt-3 text-display">{home.locker.title}</h2>
          <p className="nd-lede mt-4">{home.locker.lede}</p>
          <p className="mt-3 text-xs font-semibold text-mint-deep">{home.locker.privacy}</p>

          <label
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files[0];
              if (file) ingest(file);
            }}
            className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed border-saffron/50 bg-surface px-6 py-12 text-center shadow-soft"
          >
            <UploadCloud className="h-8 w-8 text-saffron" />
            <span className="mt-3 text-sm font-semibold">{home.locker.drop}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) ingest(file);
              }}
            />
            {fileName && <span className="mt-2 text-xs text-ink-muted">{fileName}</span>}
          </label>
        </Reveal>

        <div className="nd-glass p-6">
          {busy ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3">
              <FileScan className="h-8 w-8 animate-pulse text-saffron" />
              <p className="text-sm font-semibold">{home.locker.scanning}</p>
            </div>
          ) : preview ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{home.locker.extracted}</p>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-navy-deep p-4 text-[11px] text-saffron-deep dark:text-saffron">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">{home.locker.privacy}</p>
          )}

          {roleView === 'csc' && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold">{home.locker.bulkTitle}</p>
              <p className="mt-1 text-xs text-ink-muted">{home.locker.bulkHint}</p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider">{home.locker.queue}</p>
              <ul className="mt-2 space-y-2">
                {dossierQueue.length === 0 && <li className="text-xs text-ink-faint">—</li>}
                {dossierQueue.map((job) => (
                  <li key={job.id} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-xs">
                    <span>{job.schemeName}</span>
                    <span className="text-saffron">{job.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
