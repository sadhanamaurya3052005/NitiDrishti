'use client';

import { useMemo, useState } from 'react';

import { MetricBadge } from '@/components/ui/MetricBadge';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { OFFICIAL_SCHEME_CATALOG } from '@/lib/schemes/catalog';
import { evaluateScheme } from '@/lib/schemes/evaluate';

export function CompareDesk() {
  const { desk, locale } = useLocale();
  const { profile } = useExperience();
  const first = OFFICIAL_SCHEME_CATALOG[0]?.id ?? '';
  const second = OFFICIAL_SCHEME_CATALOG[1]?.id ?? first;
  const [leftId, setLeftId] = useState(first);
  const [rightId, setRightId] = useState(second);

  const left = OFFICIAL_SCHEME_CATALOG.find((item) => item.id === leftId);
  const right = OFFICIAL_SCHEME_CATALOG.find((item) => item.id === rightId);
  const leftEval = useMemo(() => (left ? evaluateScheme(left, profile) : null), [left, profile]);
  const rightEval = useMemo(() => (right ? evaluateScheme(right, profile) : null), [profile, right]);

  const select = (value: string, setter: (id: string) => void) => (
    <select
      value={value}
      onChange={(event) => setter(event.target.value)}
      className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
    >
      {OFFICIAL_SCHEME_CATALOG.map((item) => (
        <option key={item.id} value={item.id}>
          {locale === 'hi' ? item.nameHi : item.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.compare.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.compare.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{desk.compare.lede}</p>
        </div>
        <MetricBadge label="Phase 11" />
      </header>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="nd-card p-5">
          <label className="text-xs font-semibold text-ink-muted">
            {desk.compare.left}
            {select(leftId, setLeftId)}
          </label>
          <ul className="mt-4 space-y-2 text-sm">
            {leftEval?.rules.map((rule) => (
              <li key={rule.id}>
                <span className="font-mono text-[11px] text-ink-muted">[{rule.verdict}]</span> {rule.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="nd-card p-5">
          <label className="text-xs font-semibold text-ink-muted">
            {desk.compare.right}
            {select(rightId, setRightId)}
          </label>
          <ul className="mt-4 space-y-2 text-sm">
            {rightEval?.rules.map((rule) => (
              <li key={rule.id}>
                <span className="font-mono text-[11px] text-ink-muted">[{rule.verdict}]</span> {rule.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default CompareDesk;
