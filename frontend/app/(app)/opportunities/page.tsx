'use client';

import { BentoCard } from '@/components/ui/BentoCard';
import { EmptyPhase } from '@/components/shared/EmptyPhase';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useLocale } from '@/components/providers/LocaleProvider';

export default function OpportunitiesPage() {
  const { desk } = useLocale();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.opportunities.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.opportunities.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{desk.opportunities.lede}</p>
        </div>
        <MetricBadge label="Phase 12" />
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {desk.opportunities.kinds.map((kind) => (
          <BentoCard key={kind.id} kicker={kind.id} title={kind.title} body={kind.body} />
        ))}
      </div>

      <div className="mt-6">
        <EmptyPhase title={desk.opportunities.empty} body={desk.opportunities.lede} phase="Phase 12" />
      </div>
    </div>
  );
}
