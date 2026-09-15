'use client';

import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
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
} from '@/lib/blockE';

type PolicyDetail = PolicySummary & { clauses: PolicyClauseItem[] };

export function NyayMitraDesk() {
  const { locale, desk, app } = useLocale();
  const [fileName, setFileName] = useState<string | null>(null);
  const [policies, setPolicies] = useState<PolicySummary[] | null>(null);
  const [fromDetail, setFromDetail] = useState<PolicyDetail | null>(null);
  const [toDetail, setToDetail] = useState<PolicyDetail | null>(null);
  const [compare, setCompare] = useState<PolicyCompare | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPolicies()
      .then(async (data) => {
        if (cancelled) return;
        setPolicies(data.policies);
        const preferred =
          data.policies.find((item) => (item.version_number ?? 0) >= 2) ?? data.policies[0];
        if (!preferred) return;
        const [loaded, diff] = await Promise.all([
          getPolicy(preferred.id)
            .then((payload) => payload.policy)
            .catch(() => null),
          comparePolicy(preferred.id).catch(() => null),
        ]);
        if (cancelled) return;
        setCompare(diff);
        const current: PolicyDetail | null = loaded
          ? { ...loaded, clauses: loaded.clauses }
          : { ...preferred, clauses: [] };
        let previous: PolicyDetail | null = null;
        if (diff?.from_version && diff.to_version) {
          const [fromClauses, toClauses] = await Promise.all([
            getPolicyVersionClauses(preferred.id, diff.from_version.id)
              .then((payload) => payload.clauses)
              .catch(() => []),
            getPolicyVersionClauses(preferred.id, diff.to_version.id)
              .then((payload) => payload.clauses)
              .catch(() => current.clauses),
          ]);
          if (cancelled) return;
          previous = {
            ...preferred,
            source_url: diff.from_version.source_url,
            retrieved_at: diff.from_version.retrieved_at,
            gazette_ref: diff.from_version.gazette_ref,
            version_number: diff.from_version.version_number,
            clauses: fromClauses,
          };
          setFromDetail(previous);
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

  const loading = policies == null;
  const left = fromDetail;
  const right = toDetail ?? fromDetail;

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

      <label className="nd-card mt-8 flex cursor-pointer flex-col items-center justify-center px-6 py-12 text-center">
        <input
          type="file"
          accept="application/pdf,image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? null);
          }}
        />
        <p className="text-sm font-semibold text-ink">{desk.nyay.drop}</p>
        {fileName ? <p className="mt-3 text-xs text-saffron">{fileName}</p> : null}
      </label>

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
              <p className="mt-2 text-sm text-ink-soft">
                {compare?.from_version?.source_url ?? left?.source_url ?? desk.nyay.hint}
              </p>
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
              {right.source_url ? (
                <p className="mt-2 text-[11px] text-ink-muted">
                  <a href={right.source_url} className="underline" target="_blank" rel="noreferrer">
                    {right.source_url}
                  </a>
                  {right.retrieved_at
                    ? ` · ${new Date(right.retrieved_at).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN')}`
                    : ''}
                </p>
              ) : null}
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
    </div>
  );
}

export default NyayMitraDesk;
