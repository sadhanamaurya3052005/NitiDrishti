import { Database } from 'lucide-react';

/** Honest empty panel. Status is a desk label, not a delivery marker. */
export function EmptyPhase({
  title,
  body,
  status,
}: {
  title: string;
  body: string;
  status: string;
}) {
  return (
    <div className="nd-panel flex flex-col items-center justify-center px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-deep text-ink-muted">
        <Database className="h-5 w-5" />
      </span>
      <h2 className="mt-4 text-sm font-semibold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{status}</p>
    </div>
  );
}

export default EmptyPhase;
