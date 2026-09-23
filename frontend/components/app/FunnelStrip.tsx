'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import type { AnalyticsSummary } from '@/lib/blockE';

export function FunnelStrip({ summary }: { summary: AnalyticsSummary | null }) {
  const { locale, desk } = useLocale();
  const stages = summary?.funnel ?? desk.welfare.stages.map((stage) => ({ stage, count: null as number | null }));
  const hasRows = Boolean(summary?.application_rows);

  return (
    <section className="mt-4 nd-card p-4">
      <p className="nd-eyebrow">{desk.welfare.eyebrow}</p>
      <h2 className="text-sm font-semibold">{desk.welfare.title}</h2>
      <p className="mt-1 text-xs text-ink-muted">
        {hasRows
          ? locale === 'hi'
            ? 'गिनती आवेदन पंक्तियों से। डीबीटी अपने आप नहीं लिखा जाता।'
            : 'Counts come from application rows. DBT is not auto-written.'
          : locale === 'hi'
            ? 'आवेदन पंक्तियाँ नहीं — शून्य गढ़ा आँकड़ा नहीं।'
            : 'No application rows yet — counts stay empty, not invented.'}
      </p>
      <ol className="mt-3 grid gap-2 sm:grid-cols-5">
        {stages.map((item, index) => (
          <li key={item.stage} className="rounded-xl border border-line px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {index + 1}. {item.stage}
            </p>
            <p className="nd-numeric mt-1 text-lg">{item.count == null ? '—' : item.count}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default FunnelStrip;
