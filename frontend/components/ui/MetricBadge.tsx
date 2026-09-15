import { cn } from '@/lib/cn';

/** Status chip. Never used for invented impact numbers. */
export function MetricBadge({
  label,
  note,
  className,
}: {
  label: string;
  note?: string;
  className?: string;
}) {
  return (
    <span className={cn('nd-chip', className)}>
      {label}
      {note ? <span className="text-ink-muted"> · {note}</span> : null}
    </span>
  );
}

export default MetricBadge;
