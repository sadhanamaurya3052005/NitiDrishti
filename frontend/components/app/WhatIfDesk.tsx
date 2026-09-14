'use client';

import { useMemo, useState } from 'react';

import { MetricBadge } from '@/components/ui/MetricBadge';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { OFFICIAL_SCHEME_CATALOG } from '@/lib/schemes/catalog';
import { evaluateScheme } from '@/lib/schemes/evaluate';
import { unlockHints } from '@/lib/schemes/sensitivity';

export function WhatIfDesk() {
  const { desk, locale } = useLocale();
  const { profile, patchProfile } = useExperience();
  const [schemeId, setSchemeId] = useState(OFFICIAL_SCHEME_CATALOG[0]?.id ?? '');
  const scheme = OFFICIAL_SCHEME_CATALOG.find((item) => item.id === schemeId);
  const evaluation = useMemo(
    () => (scheme ? evaluateScheme(scheme, profile) : null),
    [profile, scheme],
  );
  const hints = useMemo(
    () => (scheme ? unlockHints(scheme, profile) : []),
    [profile, scheme],
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.whatif.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.whatif.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{desk.whatif.lede}</p>
        </div>
        <MetricBadge label="Phase 11" />
      </header>

      <label className="mt-8 block text-xs font-semibold text-ink-muted">
        {desk.whatif.pick}
        <select
          value={schemeId}
          onChange={(event) => setSchemeId(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
        >
          {OFFICIAL_SCHEME_CATALOG.map((item) => (
            <option key={item.id} value={item.id}>
              {locale === 'hi' ? item.nameHi : item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-4 block text-xs font-semibold text-ink-muted">
        Income
        <input
          type="range"
          min={0}
          max={1200000}
          step={10000}
          value={profile.income}
          onChange={(event) => patchProfile({ income: Number(event.target.value) })}
          className="mt-3 w-full accent-saffron"
        />
        <span className="mt-1 block">₹{profile.income.toLocaleString('en-IN')}</span>
      </label>

      {evaluation ? (
        <div className="nd-card mt-6 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{desk.whatif.current}</p>
          <ul className="mt-3 space-y-2 font-mono text-[12px]">
            {evaluation.rules.map((rule) => (
              <li key={rule.id} className={rule.verdict === 'pass' ? 'text-mint-deep' : rule.verdict === 'fail' ? 'text-saffron-deep' : 'text-ink-muted'}>
                [{rule.verdict.toUpperCase()}] {rule.label} — {rule.explanation}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="nd-panel mt-4 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{desk.whatif.unlock}</p>
        {hints.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">{desk.whatif.none}</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {hints.map((hint) => (
              <li key={hint.message}>{hint.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default WhatIfDesk;
