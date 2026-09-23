'use client';

import { useMemo, useState } from 'react';

import { EligibilityInspector } from '@/components/site/EligibilityInspector';
import { GazetteEvidence } from '@/components/site/GazetteEvidence';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useSchemes } from '@/hooks/useSchemes';
import { useServerEvaluations } from '@/hooks/useServerEvaluations';
import type { CasteCategory } from '@/types';

export function EligibilityDesk() {
  const { desk, locale, home } = useLocale();
  const { profile, patchProfile } = useExperience();
  const { schemes, loading, error } = useSchemes();
  const [activeId, setActiveId] = useState<string | null>(null);
  const schemeIds = useMemo(() => schemes.map((item) => item.id), [schemes]);
  const { byId, status: engineStatus } = useServerEvaluations(schemeIds, profile);

  const ranked = useMemo(
    () =>
      schemes
        .map((scheme) => ({
          scheme,
          evaluation: byId[scheme.id] ?? null,
        }))
        .sort((a, b) => (b.evaluation?.score ?? -1) - (a.evaluation?.score ?? -1)),
    [byId, schemes],
  );

  const active = ranked.find((item) => item.scheme.id === activeId);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.eligibility.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.eligibility.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{desk.eligibility.lede}</p>
        </div>
        <MetricBadge label="AST" />
      </header>

      <div className="nd-card mt-8 grid gap-4 p-5 sm:grid-cols-4">
        <p className="sm:col-span-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {desk.eligibility.profile}
        </p>
        <label className="text-xs font-semibold text-ink-muted">
          Age
          <input
            type="number"
            min={16}
            max={100}
            value={profile.age}
            onChange={(event) => patchProfile({ age: Number(event.target.value) })}
            className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-ink-muted">
          {home.schemes.income}
          <input
            type="number"
            min={0}
            step={1000}
            value={profile.income}
            onChange={(event) => patchProfile({ income: Number(event.target.value) })}
            className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-ink-muted">
          {home.schemes.caste}
          <select
            value={profile.category}
            onChange={(event) => patchProfile({ category: event.target.value as CasteCategory })}
            className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          >
            {(['GEN', 'EWS', 'OBC', 'SC', 'ST'] as const).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-muted">
          Land (ha)
          <input
            type="number"
            min={0}
            step={0.1}
            value={profile.landHectares}
            onChange={(event) => patchProfile({ landHectares: Number(event.target.value) })}
            className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
          />
        </label>
      </div>

      {engineStatus === 'error' ? (
        <p className="nd-card mt-6 px-5 py-4 text-center text-sm text-ink-muted">{desk.eligibility.engineDown}</p>
      ) : null}
      {error ? (
        <p className="nd-card mt-6 px-5 py-10 text-center text-sm text-ink-muted">
          {locale === 'hi' ? 'सूची अभी उपलब्ध नहीं।' : 'Catalog is unavailable right now.'}
        </p>
      ) : null}
      {!loading && !error && ranked.length === 0 ? (
        <p className="nd-card mt-6 px-5 py-10 text-center text-sm text-ink-muted">
          {home.schemes.emptyCatalog}
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {ranked.map(({ scheme, evaluation }) => (
          <li key={scheme.id}>
            <button
              type="button"
              onClick={() => setActiveId(scheme.id)}
              className="nd-card-interactive flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span>
                <span className="block font-semibold">{locale === 'hi' ? scheme.nameHi : scheme.name}</span>
                <span className="mt-1 block text-xs text-ink-muted">
                  {evaluation
                    ? `${evaluation.rules.filter((rule) => rule.verdict === 'pass').length}/${evaluation.rules.length} pass`
                    : engineStatus === 'loading'
                      ? '…'
                      : '—'}
                </span>
                <GazetteEvidence evaluation={evaluation} fallbackUrl={scheme.sourceUrl} compact className="mt-1" />
              </span>
              <span
                className={
                  evaluation?.status === 'ELIGIBLE'
                    ? 'text-sm font-semibold text-mint-deep'
                    : evaluation?.status === 'PARTIAL_INFO'
                      ? 'text-sm font-semibold text-amber-deep'
                      : evaluation?.status === 'INELIGIBLE'
                        ? 'text-sm font-semibold text-saffron-deep'
                        : 'text-sm font-semibold text-ink-muted'
                }
              >
                {evaluation?.status ?? '—'}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <EligibilityInspector
        open={Boolean(active)}
        onClose={() => setActiveId(null)}
        schemeName={active ? (locale === 'hi' ? active.scheme.nameHi : active.scheme.name) : ''}
        evaluation={active?.evaluation ?? null}
      />
    </div>
  );
}

export default EligibilityDesk;
