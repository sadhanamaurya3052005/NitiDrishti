'use client';

import { EmptyPhase } from '@/components/shared/EmptyPhase';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useLocale } from '@/components/providers/LocaleProvider';

export default function AlertsPage() {
  const { desk } = useLocale();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.alerts.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.alerts.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{desk.alerts.lede}</p>
        </div>
        <MetricBadge label="Phase 15" />
      </header>
      <div className="mt-8">
        <EmptyPhase title={desk.alerts.empty} body={desk.alerts.lede} phase="Phase 15" />
      </div>
    </div>
  );
}
