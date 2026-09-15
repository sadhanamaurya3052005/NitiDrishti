'use client';

import { useEffect, useState } from 'react';

import { BentoCard } from '@/components/ui/BentoCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getOpportunities, type OpportunityItem } from '@/lib/blockE';

export default function OpportunitiesPage() {
  const { locale, desk } = useLocale();
  const [items, setItems] = useState<OpportunityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getOpportunities()
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'unavailable');
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.opportunities.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.opportunities.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{desk.opportunities.lede}</p>
        </div>
        <MetricBadge label="Opportunities" note={items ? String(items.length) : undefined} />
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {desk.opportunities.kinds.map((kind) => (
          <BentoCard key={kind.id} kicker={kind.id} title={kind.title} body={kind.body} />
        ))}
      </div>

      <div className="mt-6">
        {items == null ? (
          <EmptyState
            title={locale === 'hi' ? 'आधिकारिक पंक्तियाँ लोड हो रही हैं' : 'Loading official records'}
            body={desk.opportunities.lede}
            status="Opportunities"
          />
        ) : error ? (
          <EmptyState
            title={locale === 'hi' ? 'कैटलॉग पहुँच से बाहर' : 'Catalog unreachable'}
            body={error}
            status="Opportunities"
          />
        ) : items.length === 0 ? (
          <EmptyState title={desk.opportunities.empty} body={desk.opportunities.lede} status="Opportunities" />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item.id} className="nd-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{item.kind}</p>
                <h2 className="mt-1 text-sm font-semibold">{locale === 'hi' ? item.title_hi || item.title : item.title}</h2>
                <p className="mt-2 text-sm text-ink-soft">{item.summary}</p>
                <p className="mt-2 text-[11px] text-ink-muted">
                  <a href={item.source_url} className="underline" target="_blank" rel="noreferrer">
                    {item.source_url}
                  </a>
                  {' · '}
                  {new Date(item.retrieved_at).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')}
                  {item.deadline ? ` · ${item.deadline}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
