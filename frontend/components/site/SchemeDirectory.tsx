'use client';

import { Bookmark, BookmarkCheck, CircleHelp, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { EligibilityInspector } from '@/components/site/EligibilityInspector';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Reveal } from '@/components/motion/Reveal';
import { getSchemes } from '@/lib/api';
import { cn } from '@/lib/cn';
import { OFFICIAL_SCHEME_CATALOG } from '@/lib/schemes/catalog';
import { evaluateScheme, type SchemeEvaluation } from '@/lib/schemes/evaluate';
import type { CasteCategory, SchemeCategory, SchemeRecord } from '@/types';

const STATES = [
  'Uttar Pradesh',
  'Bihar',
  'Maharashtra',
  'Rajasthan',
  'Madhya Pradesh',
  'West Bengal',
  'Tamil Nadu',
  'Karnataka',
  'Gujarat',
  'Odisha',
  'Assam',
  'Punjab',
] as const;

export function SchemeDirectory({ embedded = false }: { embedded?: boolean }) {
  const { home, locale } = useLocale();
  const { profile, patchProfile, savedSchemeIds, toggleSaveScheme, enqueueDossier, roleView } = useExperience();
  const [category, setCategory] = useState<'all' | SchemeCategory>('all');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('all');
  const [schemes, setSchemes] = useState<SchemeRecord[]>(OFFICIAL_SCHEME_CATALOG);
  const [fromApi, setFromApi] = useState(false);
  const [active, setActive] = useState<{ scheme: SchemeRecord; evaluation: SchemeEvaluation } | null>(null);

  useEffect(() => {
    const input = document.getElementById('scheme-search');
    const onInput = (event: Event) => setQuery((event.target as HTMLInputElement).value);
    input?.addEventListener('input', onInput);
    return () => input?.removeEventListener('input', onInput);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getSchemes({ category, q: query }).then((result) => {
      if (cancelled) return;
      setSchemes(result.schemes);
      setFromApi(result.source === 'api');
    });
    return () => {
      cancelled = true;
    };
  }, [category, query]);

  const visible = useMemo(() => {
    return schemes.filter((scheme) => {
      const evaluation = evaluateScheme(scheme, profile);
      if (profile.income > 0 && evaluation.status === 'INELIGIBLE' && category === 'all' && !query) {
        return true;
      }
      return true;
    });
  }, [category, profile, query, schemes]);

  const openInspector = (scheme: SchemeRecord) => {
    setActive({ scheme, evaluation: evaluateScheme(scheme, profile) });
  };

  return (
    <section id="schemes" className={embedded ? 'py-0' : 'scroll-mt-28 py-20'}>
      <div className={embedded ? 'w-full' : 'nd-section'}>
        <Reveal className="max-w-3xl">
          <p className="nd-eyebrow">{home.schemes.eyebrow}</p>
          <h2 className={embedded ? 'mt-3 text-headline' : 'mt-3 text-display'}>{home.schemes.title}</h2>
          <p className="nd-lede mt-4">{home.schemes.lede}</p>
          <p className="mt-3 text-xs font-semibold text-saffron">
            {fromApi ? home.schemes.live : home.schemes.catalog}
            {state !== 'all' ? ` · ${state}` : ''}
            {roleView === 'csc' ? ' · CSC desk' : ''}
          </p>
        </Reveal>

        <div className="mt-8 flex flex-wrap gap-2">
          {home.schemes.filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setCategory(filter.id)}
              className={cn(
                'rounded-pill border px-3 py-1.5 text-xs font-semibold transition',
                category === filter.id
                  ? 'border-saffron bg-saffron text-white dark:text-navy-deep'
                  : 'border-line bg-surface text-ink-soft hover:border-saffron',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 rounded-card border border-line bg-surface p-4 md:grid-cols-4">
          <label className="text-xs font-semibold text-ink-muted md:col-span-2">
            {home.schemes.search}
            <input
              id="scheme-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink"
            />
          </label>
          <label className="text-xs font-semibold text-ink-muted">
            {home.schemes.income}
            <input
              type="range"
              min={0}
              max={1200000}
              step={10000}
              value={profile.income}
              onChange={(event) => patchProfile({ income: Number(event.target.value) })}
              className="mt-3 w-full accent-saffron"
            />
            <span className="mt-1 block text-[11px] font-medium text-ink">
              ₹{profile.income.toLocaleString('en-IN')}
            </span>
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
          <label className="text-xs font-semibold text-ink-muted md:col-span-2">
            {home.schemes.state}
            <select
              value={state}
              onChange={(event) => setState(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            >
              <option value="all">{home.schemes.allStates}</option>
              {STATES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink-muted">
            Age
            <input
              type="range"
              min={16}
              max={80}
              value={profile.age}
              onChange={(event) => patchProfile({ age: Number(event.target.value) })}
              className="mt-3 w-full accent-saffron"
            />
            <span className="mt-1 block text-[11px]">{profile.age}</span>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 text-sm text-ink-muted">{home.schemes.empty}</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((scheme) => {
              const evaluation = evaluateScheme(scheme, profile);
              const name = locale === 'hi' ? scheme.nameHi : scheme.name;
              const summary = locale === 'hi' ? scheme.summaryHi : scheme.summary;
              const benefit = locale === 'hi' ? scheme.benefitHi : scheme.benefit;
              const ministry = locale === 'hi' ? scheme.ministryHi : scheme.ministry;
              const badge = locale === 'hi' ? scheme.badgeHi : scheme.badge;
              const saved = savedSchemeIds.includes(scheme.id);

              return (
                <article key={scheme.id} className="nd-card-interactive flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{ministry}</p>
                    <span className="nd-chip">{badge}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug">{name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{summary}</p>
                  <p className="mt-4 inline-flex w-fit rounded-pill bg-mint-soft px-3 py-1 text-sm font-semibold text-mint-deep">
                    {benefit}
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {scheme.documents.map((doc) => {
                      const known = profile.documents[doc.id];
                      const tone = known === true ? 'ok' : known === false ? 'missing' : 'unknown';
                      return (
                        <li
                          key={doc.id}
                          className={cn(
                            'rounded-pill px-2 py-0.5 text-[10px] font-semibold',
                            tone === 'ok' && 'bg-mint-soft text-mint-deep',
                            tone === 'missing' && 'bg-rose-soft text-rose-deep',
                            tone === 'unknown' && 'bg-amber-soft text-amber-deep',
                          )}
                        >
                          {doc.label} {tone === 'ok' ? '✓' : tone === 'missing' ? '!' : '?'}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 text-[11px] font-medium text-ink-muted">
                    {evaluation.status} · {evaluation.score}%
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => openInspector(scheme)} className="nd-cta-saffron !px-3 !py-2 text-xs">
                      <ListChecks className="h-3.5 w-3.5" />
                      {home.schemes.check}
                    </button>
                    <button
                      type="button"
                      onClick={() => openInspector(scheme)}
                      className="inline-flex items-center gap-1 rounded-pill border border-line px-3 py-2 text-xs font-semibold"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                      {home.schemes.explain}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSaveScheme(scheme.id);
                        enqueueDossier(name);
                      }}
                      className="inline-flex items-center gap-1 rounded-pill border border-line px-3 py-2 text-xs font-semibold"
                    >
                      {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-mint" /> : <Bookmark className="h-3.5 w-3.5" />}
                      {saved ? home.schemes.saved : home.schemes.save}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <EligibilityInspector
        open={Boolean(active)}
        onClose={() => setActive(null)}
        schemeName={active ? (locale === 'hi' ? active.scheme.nameHi : active.scheme.name) : ''}
        evaluation={active?.evaluation ?? null}
      />
    </section>
  );
}
