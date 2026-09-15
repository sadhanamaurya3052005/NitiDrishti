'use client';

import { useEffect, useMemo, useState } from 'react';

import { MetricBadge } from '@/components/ui/MetricBadge';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useSchemes } from '@/hooks/useSchemes';
import { compareSchemes } from '@/lib/api';
import { evaluateScheme, type SchemeEvaluation } from '@/lib/schemes/evaluate';

export function CompareDesk() {
  const { desk, locale, home } = useLocale();
  const { profile } = useExperience();
  const { schemes, loading, error } = useSchemes();
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const [serverEvals, setServerEvals] = useState<Record<string, SchemeEvaluation> | null>(null);

  useEffect(() => {
    if (!schemes.length) return;
    setLeftId((current) => current || schemes[0]?.id || '');
    setRightId((current) => current || schemes[1]?.id || schemes[0]?.id || '');
  }, [schemes]);

  const left = schemes.find((item) => item.id === leftId);
  const right = schemes.find((item) => item.id === rightId);
  const leftLocal = useMemo(() => (left ? evaluateScheme(left, profile) : null), [left, profile]);
  const rightLocal = useMemo(() => (right ? evaluateScheme(right, profile) : null), [profile, right]);

  useEffect(() => {
    if (!leftId || !rightId || leftId === rightId) {
      setServerEvals(null);
      return;
    }
    let cancelled = false;
    void compareSchemes({
      scheme_ids: [leftId, rightId],
      profile: {
        age: profile.age,
        income: profile.income,
        land_hectares: profile.landHectares,
        gender: profile.gender,
        category: profile.category,
        occupation: profile.occupation,
      },
    })
      .then((payload) => {
        if (cancelled) return;
        const next: Record<string, SchemeEvaluation> = {};
        for (const item of payload.items) {
          next[item.evaluation.schemeId] = item.evaluation;
        }
        setServerEvals(next);
      })
      .catch(() => {
        if (!cancelled) setServerEvals(null);
      });
    return () => {
      cancelled = true;
    };
  }, [leftId, profile, rightId]);

  const leftEval = (leftId && serverEvals?.[leftId]) || leftLocal;
  const rightEval = (rightId && serverEvals?.[rightId]) || rightLocal;

  const select = (value: string, setter: (id: string) => void) => (
    <select
      value={value}
      onChange={(event) => setter(event.target.value)}
      className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm"
    >
      {schemes.map((item) => (
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
        <MetricBadge label="Comparison" />
      </header>

      {error ? (
        <p className="nd-card mt-8 px-5 py-10 text-center text-sm text-ink-muted">
          {locale === 'hi' ? 'सूची अभी उपलब्ध नहीं।' : 'Catalog is unavailable right now.'}
        </p>
      ) : null}
      {!loading && !error && schemes.length < 2 ? (
        <p className="nd-card mt-8 px-5 py-10 text-center text-sm text-ink-muted">
          {schemes.length === 0 ? home.schemes.emptyCatalog : home.schemes.empty}
        </p>
      ) : null}

      {schemes.length >= 2 ? (
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
      ) : null}
    </div>
  );
}

export default CompareDesk;
