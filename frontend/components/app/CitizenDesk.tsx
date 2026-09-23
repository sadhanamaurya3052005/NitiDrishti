'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { CatalogCacheStrip } from '@/components/app/CatalogCacheStrip';
import { GazetteEvidence } from '@/components/site/GazetteEvidence';
import { PrivacyStrip } from '@/components/app/PrivacyStrip';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { useSchemes } from '@/hooks/useSchemes';
import { useServerEvaluations } from '@/hooks/useServerEvaluations';
import { createApplication, type ApplicationRecord } from '@/lib/blockE';
import { CIVIC_SECTORS } from '@/lib/civic/sectors';
import { stackedYearlyRupees } from '@/lib/schemes/liquidity';
import { speak, speechSupported, stopSpeaking } from '@/lib/speech';
import type { CasteCategory, SchemeCategory } from '@/types';

const FILTERS: { id: 'all' | SchemeCategory; en: string; hi: string }[] = [
  { id: 'all', en: 'All', hi: 'सभी' },
  ...CIVIC_SECTORS.map((item) => ({ id: item.category, en: item.nameEn, hi: item.nameHi })),
];

export function CitizenDesk() {
  const { locale, home, desk } = useLocale();
  const { profile, patchProfile, setDocument, enqueueDossier, session } = useExperience();
  const params = useSearchParams();
  const sectorId = params.get('sector');
  const sector = CIVIC_SECTORS.find((item) => item.id === sectorId);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | SchemeCategory>(sector ? sector.category : 'all');
  const [rate, setRate] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [tracked, setTracked] = useState<Record<string, ApplicationRecord>>({});
  const [trackBusy, setTrackBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { schemes, loading, error } = useSchemes({
    category: filter,
    q: query,
  });
  const schemeIds = useMemo(() => schemes.map((item) => item.id), [schemes]);
  const { byId, status: engineStatus } = useServerEvaluations(schemeIds, profile);

  const ranked = useMemo(() => {
    return schemes
      .filter((scheme) => filter === 'all' || scheme.category === filter)
      .map((scheme) => ({ scheme, evaluation: byId[scheme.id] ?? null }));
  }, [byId, filter, schemes]);

  const eligible = ranked.filter((item) => item.evaluation?.status === 'ELIGIBLE');
  const yearly = stackedYearlyRupees(eligible.map((item) => item.scheme));
  const neededDocs = Array.from(
    new Set(schemes.flatMap((scheme) => scheme.documents.map((doc) => doc.id))),
  );
  const present = neededDocs.filter((id) => profile.documents[id]).length;
  const readiness = Math.round((present / Math.max(1, neededDocs.length)) * 100);

  const suniye = (text: string) => {
    if (!speechSupported()) return;
    speak(text, locale, undefined, rate);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <Link href="/#gateways" className="text-sm font-semibold text-saffron">
          ← {locale === 'hi' ? 'होम' : 'Home'}
        </Link>
        <p className="text-sm text-ink-soft">
          {session?.displayName ?? (locale === 'hi' ? 'अतिथि · 0-PII' : 'Guest · 0-PII')}
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
          {locale === 'hi' ? 'सुनिए गति' : 'Audio speed'} {rate.toFixed(1)}x
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.1}
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
          />
        </label>
        <p className="text-sm font-semibold text-mint-deep">
          {locale === 'hi' ? 'पात्र योजनाएँ' : 'Eligible'} {eligible.length}
          {yearly > 0 ? ` · ₹${yearly.toLocaleString('en-IN')} / ${locale === 'hi' ? 'वर्ष' : 'yr'}` : ''}
          <span className="ml-2 text-[10px] font-medium text-ink-muted">
            {locale === 'hi' ? 'केवल ₹ / वर्ष वाली अधिसूचनाएँ' : 'only exact ₹ / year gazette strings'}
          </span>
        </p>
      </header>

      <PrivacyStrip />
      <CatalogCacheStrip />

      <div className="grid gap-4 lg:grid-cols-[38%_62%]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="nd-card p-4">
            <label className="text-xs font-semibold text-ink-muted">
              {locale === 'hi' ? 'बोलचाल प्रश्न' : 'Conversational query'}
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={locale === 'hi' ? 'योजना नाम…' : 'Scheme name…'}
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="nd-card grid gap-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {locale === 'hi' ? 'जनसांख्यिकी' : 'Demographics'}
            </p>
            <Slider label={locale === 'hi' ? 'आयु' : 'Age'} min={16} max={90} value={profile.age} onChange={(value) => patchProfile({ age: value })} />
            <Slider
              label={home.schemes.income}
              min={0}
              max={1200000}
              step={5000}
              value={profile.income}
              onChange={(value) => patchProfile({ income: value })}
              format={(value) => `₹${value.toLocaleString('en-IN')}`}
            />
            <Slider
              label={locale === 'hi' ? 'भूमि (हेक्टेयर)' : 'Land (ha)'}
              min={0}
              max={10}
              step={0.1}
              value={profile.landHectares}
              onChange={(value) => patchProfile({ landHectares: value })}
            />
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
              {locale === 'hi' ? 'पेशा' : 'Occupation'}
              <select
                value={profile.occupation}
                onChange={(event) =>
                  patchProfile({ occupation: event.target.value as typeof profile.occupation })
                }
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
              >
                <option value="farmer">{locale === 'hi' ? 'किसान' : 'Farmer'}</option>
                <option value="student">{locale === 'hi' ? 'विद्यार्थी' : 'Student'}</option>
                <option value="artisan">{locale === 'hi' ? 'कारीगर' : 'Artisan'}</option>
                <option value="shg">SHG</option>
                <option value="other">{locale === 'hi' ? 'अन्य' : 'Other'}</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-ink-muted">
              {locale === 'hi' ? 'लिंग' : 'Gender'}
              <select
                value={profile.gender}
                onChange={(event) => patchProfile({ gender: event.target.value as typeof profile.gender })}
                className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
              >
                <option value="any">{locale === 'hi' ? 'घोषित नहीं' : 'Undeclared'}</option>
                <option value="female">{locale === 'hi' ? 'महिला' : 'Female'}</option>
                <option value="male">{locale === 'hi' ? 'पुरुष' : 'Male'}</option>
              </select>
            </label>
          </div>

          <div className="nd-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {locale === 'hi' ? 'न्याय-मित्र तिजोरी' : 'Nyaya-Mitra vault'}
            </p>
            <p className="mt-2 text-xs text-ink-muted">
              {locale === 'hi'
                ? 'फ़ाइल ब्राउज़र में रहती है। पहचान OCR सर्वर पर नहीं। स्व-घोषित टिक। अंक काले मास्क पर।'
                : 'File stays in this browser. Identity OCR is not uploaded. Tick self-declared docs. Digits stay behind the mask.'}
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 w-full rounded-xl border border-dashed border-line px-3 py-6 text-sm"
            >
              {locale === 'hi' ? 'कैमरा / अपलोड' : 'Camera / upload'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (preview) URL.revokeObjectURL(preview);
                setPreview(URL.createObjectURL(file));
              }}
            />
            {preview ? (
              <div className="relative mt-3 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="max-h-40 w-full object-cover" />
                <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded bg-black py-2 text-center text-[11px] font-semibold text-white">
                  [Identity Redacted]
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <span className="relative flex h-16 w-16 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" className="text-line" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    className="text-mint"
                    strokeWidth="3"
                    strokeDasharray={`${readiness}, 100`}
                  />
                </svg>
                <span className="absolute text-[11px] font-bold">{readiness}%</span>
              </span>
              <p className="text-xs text-ink-muted">
                {locale === 'hi' ? 'दस्तावेज़ तैयारी (स्व-घोषित)' : 'Document readiness (self-declared)'}
              </p>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {neededDocs.slice(0, 8).map((id) => (
                <li key={id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(profile.documents[id])}
                      onChange={(event) => setDocument(id, event.target.checked)}
                    />
                    {id}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-pill border px-3 py-1.5 text-xs font-semibold ${
                  filter === item.id ? 'border-saffron bg-saffron-soft text-saffron-deep' : 'border-line bg-surface'
                }`}
              >
                {locale === 'hi' ? item.hi : item.en}
              </button>
            ))}
          </div>
          {error ? (
            <p className="nd-card px-5 py-10 text-center text-sm text-ink-muted">
              {locale === 'hi' ? 'सूची अभी उपलब्ध नहीं।' : 'Catalog is unavailable right now.'}
            </p>
          ) : null}
          {engineStatus === 'error' ? (
            <p className="nd-card px-5 py-4 text-center text-sm text-ink-muted">{desk.eligibility.engineDown}</p>
          ) : null}
          {!loading && !error && ranked.length === 0 ? (
            <p className="nd-card px-5 py-10 text-center text-sm text-ink-muted">
              {query.trim() ? home.schemes.empty : home.schemes.emptyCatalog}
            </p>
          ) : null}

          {ranked.map(({ scheme, evaluation }) => {
            const name = locale === 'hi' ? scheme.nameHi : scheme.name;
            const hints = evaluation?.rules.filter((rule) => rule.verdict === 'fail').map((rule) => rule.explanation) ?? [];
            const failIncome = evaluation?.rules.find((rule) => rule.id.includes('income') && rule.verdict === 'fail');
            const tone =
              evaluation?.status === 'ELIGIBLE'
                ? 'border-mint/50 bg-mint-soft/30'
                : evaluation?.status === 'PARTIAL_INFO'
                  ? 'border-amber/50 bg-amber-soft/40'
                  : evaluation?.status === 'INELIGIBLE'
                    ? 'border-rose/40 bg-rose-soft/30'
                    : 'border-line bg-surface';
            const audio =
              locale === 'hi'
                ? `${name}. स्थिति ${evaluation?.status ?? '—'}. ${evaluation?.rules.map((rule) => rule.explanation).join(' ') ?? ''}`
                : `${name}. Status ${evaluation?.status ?? '—'}. ${evaluation?.rules.map((rule) => rule.explanation).join(' ') ?? ''}`;

            return (
              <article key={scheme.id} className={`rounded-2xl border p-4 ${tone}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{scheme.ministry}</p>
                    <h3 className="mt-1 text-lg font-semibold">{name}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{locale === 'hi' ? scheme.benefitHi : scheme.benefit}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      stopSpeaking();
                      suniye(audio);
                    }}
                    className="rounded-pill border border-line bg-surface px-3 py-1 text-xs font-semibold"
                  >
                    🔊 {locale === 'hi' ? 'सुनिए' : 'Listen'}
                  </button>
                </div>
                <ul className="mt-3 space-y-1 font-mono text-[11px]">
                  {(evaluation?.rules ?? []).map((rule) => (
                    <li key={rule.id} className={rule.verdict === 'pass' ? 'text-mint-deep' : rule.verdict === 'fail' ? 'text-rose-deep' : 'text-ink-muted'}>
                      [{rule.verdict.toUpperCase()}] {rule.explanation}
                    </li>
                  ))}
                </ul>
                {failIncome ? (
                  <div className="mt-3 h-2 overflow-hidden rounded-pill bg-canvas-deep">
                    <div
                      className="h-full bg-rose"
                      style={{ width: `${Math.min(100, (profile.income / 250000) * 100)}%` }}
                    />
                  </div>
                ) : null}
                {evaluation?.status === 'PARTIAL_INFO' && profile.kccActive === null && scheme.category === 'agriculture' ? (
                  <div className="mt-3 rounded-xl border border-amber/40 bg-surface px-3 py-2 text-sm">
                    {locale === 'hi' ? 'क्या किसान क्रेडिट कार्ड सक्रिय है?' : 'Is a Kisan Credit Card active?'}
                    <span className="ml-3 flex gap-2 sm:inline-flex">
                      <button type="button" className="font-semibold text-mint-deep" onClick={() => patchProfile({ kccActive: true })}>
                        {locale === 'hi' ? 'हाँ' : 'Yes'}
                      </button>
                      <button type="button" className="font-semibold text-rose-deep" onClick={() => patchProfile({ kccActive: false })}>
                        {locale === 'hi' ? 'नहीं' : 'No'}
                      </button>
                    </span>
                  </div>
                ) : null}
                {hints.length > 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    <span className="font-semibold">{home.inspector.remediation}: </span>
                    {hints[0]}
                  </p>
                ) : null}
                <GazetteEvidence evaluation={evaluation} fallbackUrl={scheme.sourceUrl} className="mt-3" />
                <p className="mt-2 text-[11px] text-ink-muted">
                  {locale === 'hi'
                    ? 'स्वीकृति सरकारी पेज पर होती है। यहाँ केवल ट्रैक।'
                    : 'Approval happens on the official page. This desk only tracks.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scheme.sourceUrl ? (
                    <a
                      href={scheme.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-pill border border-line px-3 py-1 text-xs font-semibold"
                    >
                      {locale === 'hi' ? 'सरकारी apply' : 'Official apply'}
                    </a>
                  ) : null}
                  {session?.accessToken ? (
                    <button
                      type="button"
                      disabled={trackBusy === scheme.id || Boolean(tracked[scheme.id])}
                      onClick={() => {
                        setTrackBusy(scheme.id);
                        void createApplication({ scheme_id: scheme.id })
                          .then((row) => setTracked((current) => ({ ...current, [scheme.id]: row })))
                          .finally(() => setTrackBusy(null));
                      }}
                      className="rounded-pill border border-line px-3 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      {tracked[scheme.id]?.stage
                        ? tracked[scheme.id]?.stage
                        : locale === 'hi'
                          ? 'आवेदन ट्रैक करें'
                          : 'Track application'}
                    </button>
                  ) : (
                    <Link href="/login" className="rounded-pill border border-line px-3 py-1 text-xs font-semibold">
                      {locale === 'hi' ? 'ट्रैक के लिए साइन इन' : 'Sign in to track'}
                    </Link>
                  )}
                  {evaluation?.status === 'ELIGIBLE' ? (
                    <button
                      type="button"
                      onClick={() => enqueueDossier(name, scheme.id)}
                      className="ml-auto rounded-pill bg-ink px-3 py-1 text-xs font-semibold text-canvas"
                    >
                      {locale === 'hi' ? 'एक्शन डोज़ियर कतार' : 'Queue Action Dossier'}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <label className="text-xs font-semibold text-ink-muted">
      {label}: {format ? format(value) : value}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full"
      />
    </label>
  );
}

export default CitizenDesk;
