'use client';

import { useCallback, useEffect, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ApiError, getDisasterSummary, postDisasterFocus, type DisasterSummary } from '@/lib/api';
import type { Role } from '@/types';

const WRITE_ROLES: readonly Role[] = ['POLICY_ANALYST', 'WELFARE_OFFICER', 'ADMIN'];

export function DisasterStrip() {
  const { desk } = useLocale();
  const { session } = useExperience();
  const copy = desk.welfare.disaster;
  const authed = Boolean(session?.accessToken);
  const canWrite = Boolean(session?.roles?.some((role) => WRITE_ROLES.includes(role)));
  const [data, setData] = useState<DisasterSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [district, setDistrict] = useState('South Andaman');
  const [stateIso, setStateIso] = useState('AN');

  const load = useCallback(() => {
    setBusy(true);
    setError(null);
    void getDisasterSummary()
      .then(setData)
      .catch((caught: unknown) => {
        setData(null);
        setError(caught instanceof ApiError ? caught.message : copy.failed);
      })
      .finally(() => setBusy(false));
  }, [copy.failed]);

  useEffect(() => {
    load();
  }, [load]);

  const focus = () => {
    if (!authed || !canWrite) return;
    setBusy(true);
    setError(null);
    void postDisasterFocus(stateIso, district)
      .then(setData)
      .catch((caught: unknown) => {
        setError(caught instanceof ApiError ? caught.message : copy.failed);
      })
      .finally(() => setBusy(false));
  };

  return (
    <section className="mb-4 nd-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">{copy.notLive}</p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>

      {busy && !data ? <p className="mt-2 text-sm text-ink-muted">{copy.busy}</p> : null}
      {error ? <p className="mt-2 text-sm text-ink-muted">{error}</p> : null}

      {data && !data.enabled ? <p className="mt-2 text-sm text-ink-soft">{copy.off}</p> : null}

      {data?.enabled ? (
        <>
          <p className="mt-2 text-[11px] text-ink-muted">
            {copy.geometry}
            {' · '}
            {data.source}
            {' · '}
            {data.published_count}
          </p>
          {data.reason && data.schemes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">{copy.empty}</p>
          ) : null}
          {data.schemes.length > 0 ? (
            <ul className="mt-3 max-h-[200px] space-y-1 overflow-y-auto text-sm">
              {data.schemes.map((row) => (
                <li key={row.id}>
                  <a href={row.source_url} className="font-semibold text-saffron" target="_blank" rel="noreferrer">
                    {row.name}
                  </a>
                  <span className="ml-2 text-[11px] text-ink-muted">
                    {row.coverage}
                    {row.state_iso ? ` · ${row.state_iso}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {data.focus ? (
            <p className="mt-2 text-xs text-ink-soft">
              {copy.focused}: {data.focus.district_name} · {data.focus.state_iso}
            </p>
          ) : null}

          {!authed ? <p className="mt-2 text-xs text-ink-muted">{copy.signIn}</p> : null}
          {authed && !canWrite ? <p className="mt-2 text-xs text-ink-muted">{copy.forbidden}</p> : null}
          {authed && canWrite ? (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                focus();
              }}
            >
              <input
                value={stateIso}
                onChange={(event) => setStateIso(event.target.value)}
                aria-label="state iso"
                className="w-20 rounded-xl border border-line bg-canvas px-3 py-2 text-sm uppercase"
              />
              <input
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
                aria-label="district"
                className="min-w-[160px] flex-1 rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
              />
              <button type="submit" disabled={busy} className="rounded-pill border border-line px-3 py-1 text-xs font-semibold">
                {copy.focus}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default DisasterStrip;
