'use client';

import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { GazetteOcrStrip } from '@/components/app/GazetteOcrStrip';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useLocale } from '@/components/providers/LocaleProvider';
import {
  comparePolicy,
  getPolicies,
  getPolicy,
  getPolicyVersionClauses,
  type PolicyClauseItem,
  type PolicyCompare,
  type PolicySummary,
  type PolicyVersionSummary,
} from '@/lib/blockE';
import type { Locale } from '@/lib/config';

type PolicyDetail = PolicySummary & { clauses: PolicyClauseItem[] };

function sourceHost(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

function formatIsoDate(value: string | null | undefined, locale: Locale): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function VersionStamp({
  version,
  asOf,
  locale,
  asOfLabel,
  asOfCurrent,
  effectiveLabel,
}: {
  version: PolicyVersionSummary | null | undefined;
  asOf?: string | null;
  locale: Locale;
  asOfLabel: string;
  asOfCurrent: string;
  effectiveLabel: string;
}) {
  if (!version) return null;
  const host = sourceHost(version.source_url);
  const from = formatIsoDate(version.effective_from, locale);
  const to = formatIsoDate(version.effective_to, locale);
  const window = from && to ? `${from} → ${to}` : from || to;
  const asOn = formatIsoDate(asOf, locale) ?? asOfCurrent;
  return (
    <p className="mt-2 text-[11px] text-ink-muted">
      v{version.version_number}
      {version.gazette_ref ? ` · ${version.gazette_ref}` : ''}
      {' · '}
      {asOfLabel} {asOn}
      {window ? ` · ${effectiveLabel} ${window}` : ''}
      {host && version.source_url ? (
        <>
          {' · '}
          <a href={version.source_url} target="_blank" rel="noreferrer" className="font-semibold text-saffron">
            {host}
          </a>
        </>
      ) : null}
    </p>
  );
}

export function NyayMitraDesk() {
  const { locale, desk, app } = useLocale();
  const [policies, setPolicies] = useState<PolicySummary[] | null>(null);
  const [policyId, setPolicyId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [fromDetail, setFromDetail] = useState<PolicyDetail | null>(null);
  const [toDetail, setToDetail] = useState<PolicyDetail | null>(null);
  const [compare, setCompare] = useState<PolicyCompare | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPolicies()
      .then((data) => {
        if (cancelled) return;
        setPolicies(data.policies);
        setPolicyId((current) => {
          if (current && data.policies.some((item) => item.id === current)) return current;
          const preferred =
            data.policies.find((item) => (item.version_number ?? 0) >= 2) ?? data.policies[0];
          return preferred?.id ?? '';
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'unavailable');
        setPolicies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!policyId) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all([
        getPolicy(policyId)
          .then((payload) => payload.policy)
          .catch(() => null),
        comparePolicy(policyId, asOf || null).catch(() => null),
      ]).then(async ([loaded, diff]) => {
        if (cancelled) return;
        setCompare(diff);
        const base = loaded ?? policies?.find((item) => item.id === policyId) ?? null;
        if (!base) {
          setFromDetail(null);
          setToDetail(null);
          return;
        }
        const current: PolicyDetail = { ...base, clauses: loaded?.clauses ?? [] };
        if (diff?.from_version && diff.to_version) {
          const [fromClauses, toClauses] = await Promise.all([
            getPolicyVersionClauses(policyId, diff.from_version.id)
              .then((payload) => payload.clauses)
              .catch(() => []),
            getPolicyVersionClauses(policyId, diff.to_version.id)
              .then((payload) => payload.clauses)
              .catch(() => current.clauses),
          ]);
          if (cancelled) return;
          setFromDetail({
            ...base,
            source_url: diff.from_version.source_url,
            retrieved_at: diff.from_version.retrieved_at,
            gazette_ref: diff.from_version.gazette_ref,
            version_number: diff.from_version.version_number,
            clauses: fromClauses,
          });
          setToDetail({
            ...current,
            source_url: diff.to_version.source_url,
            retrieved_at: diff.to_version.retrieved_at,
            gazette_ref: diff.to_version.gazette_ref,
            version_number: diff.to_version.version_number,
            clauses: toClauses,
          });
          return;
        }
        setFromDetail(null);
        setToDetail(current);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [policyId, asOf, policies]);

  const loading = policies == null;
  const left = fromDetail;
  const right = toDetail ?? fromDetail;
  const selected = policies?.find((item) => item.id === policyId);

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{app.workspaces.nyaymitra.short}</p>
          <h1 className="mt-1 text-headline">{app.workspaces.nyaymitra.name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">{app.workspaces.nyaymitra.purpose}</p>
        </div>
        <MetricBadge label="Nyay-Mitra" note={policies ? String(policies.length) : undefined} />
      </header>

      {policies && policies.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-ink-muted">
            {desk.nyay.pick}
            <select
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
            >
              {policies.map((item) => (
                <option key={item.id} value={item.id}>
                  {locale === 'hi' ? item.title_hi || item.title : item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-ink-muted">
            {desk.nyay.asOf}
            <input
              type="date"
              value={asOf}
              onChange={(event) => setAsOf(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
            />
          </label>
        </div>
      ) : null}

      <p className="mt-8 text-xs text-ink-muted">{desk.nyay.drop}</p>
      <GazetteOcrStrip />

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <EmptyState title={desk.nyay.old} body={desk.nyay.hint} status="Previous version" />
            <EmptyState title={desk.nyay.neu} body={desk.nyay.pending} status="Current version" />
          </>
        ) : error ? (
          <div className="md:col-span-2">
            <EmptyState title={locale === 'hi' ? 'नीति कैटलॉग नहीं मिला' : 'Policy catalog unreachable'} body={error} status="Nyay-Mitra" />
          </div>
        ) : !policies.length || !right ? (
          <>
            <EmptyState title={desk.nyay.old} body={desk.nyay.hint} status="Previous version" />
            <EmptyState title={desk.nyay.neu} body={desk.nyay.pending} status="Current version" />
          </>
        ) : (
          <>
            <article className="nd-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{desk.nyay.old}</p>
              <h2 className="mt-2 text-sm font-semibold">
                {compare?.from_version
                  ? `v${compare.from_version.version_number}`
                  : locale === 'hi'
                    ? 'केवल एक संस्करण'
                    : 'Only one version ingested'}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{left?.issuing_body ?? right.issuing_body}</p>
              <VersionStamp
                version={compare?.from_version}
                asOf={compare?.asOf ?? (asOf || null)}
                locale={locale}
                asOfLabel={desk.nyay.asOf}
                asOfCurrent={desk.nyay.asOfCurrent}
                effectiveLabel={desk.nyay.effective}
              />
              {!compare?.from_version ? <p className="mt-2 text-sm text-ink-soft">{desk.nyay.hint}</p> : null}
              {left?.clauses.length ? (
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {left.clauses.slice(0, 4).map((clause) => (
                    <li key={clause.id}>
                      <span className="font-semibold text-ink">{clause.clause_ref}</span> — {clause.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
            <article className="nd-card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{desk.nyay.neu}</p>
              <h2 className="mt-2 text-sm font-semibold">
                {compare?.to_version
                  ? `v${compare.to_version.version_number}`
                  : locale === 'hi'
                    ? right.title_hi
                    : right.title}
              </h2>
              <p className="mt-2 text-sm text-ink-soft">{right.issuing_body}</p>
              <VersionStamp
                version={compare?.to_version}
                asOf={null}
                locale={locale}
                asOfLabel={desk.nyay.asOf}
                asOfCurrent={desk.nyay.asOfCurrent}
                effectiveLabel={desk.nyay.effective}
              />
              {right.clauses.length ? (
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {right.clauses.slice(0, 4).map((clause) => (
                    <li key={clause.id}>
                      <span className="font-semibold text-ink">{clause.clause_ref}</span> — {clause.text}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </>
        )}
      </div>
      {compare?.note ? <p className="mt-4 text-xs text-ink-muted">{compare.note}</p> : null}
      {compare?.changes.length ? (
        <ul className="mt-4 space-y-2">
          {compare.changes.slice(0, 8).map((change, index) => (
            <li key={change.id ?? `${change.clause_ref}-${index}`} className="nd-card px-4 py-3 text-sm">
              <span className="font-semibold">{change.change_kind}</span>
              {change.clause_ref ? ` · ${change.clause_ref}` : ''} — {change.summary}
            </li>
          ))}
        </ul>
      ) : policies?.length ? (
        <p className="mt-4 text-xs text-ink-muted">{desk.nyay.hint}</p>
      ) : null}
      {selected?.code ? (
        <p className="mt-3 text-[11px] text-ink-muted">
          {desk.nyay.gazette} · {selected.code}
        </p>
      ) : null}
    </div>
  );
}

export default NyayMitraDesk;
