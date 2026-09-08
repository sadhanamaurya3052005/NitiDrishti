'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Rule 7: log the failure, never the payload that caused it.
    console.error('[NitiDrishti] render error', error.digest ?? error.name);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-soft text-rose-deep ring-1 ring-rose/20">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="mt-6 text-headline">Something failed while rendering this screen</h1>
      <p className="nd-lede mt-3 max-w-md">
        The error has been logged. Retrying is safe — no data was written.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-3 text-sm font-semibold text-canvas transition-transform duration-300 ease-civic hover:-translate-y-0.5"
      >
        <RotateCcw className="h-4 w-4" />
        Try again
      </button>
    </main>
  );
}
