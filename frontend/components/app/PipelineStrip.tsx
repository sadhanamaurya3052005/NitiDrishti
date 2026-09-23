'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import {
  ApiError,
  getPipelineMap,
  getSourceStatus,
  listDeadLetter,
  rerunSource,
  type DeadLetterItem,
  type PipelineMap,
  type SourceStatusItem,
  type SourceStatusPayload,
} from '@/lib/api';
import type { Role } from '@/types';

const RERUN_ROLES: readonly Role[] = ['WELFARE_OFFICER', 'ADMIN'];

function statusClass(status: string | null): string {
  if (status === 'ok') return 'text-mint-deep';
  if (status === 'failed') return 'text-rose-deep';
  if (status === 'running') return 'text-amber-deep';
  return 'text-ink-muted';
}

export function PipelineStrip() {
  const { locale, desk } = useLocale();
  const { session } = useExperience();
  const copy = desk.welfare.pipeline;
  const [payload, setPayload] = useState<SourceStatusPayload | null>(null);
  const [map, setMap] = useState<PipelineMap | null>(null);
  const [failed, setFailed] = useState<DeadLetterItem[]>([]);
  const [gate, setGate] = useState<'guest' | 'ok' | 'forbidden' | 'error'>('guest');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signedIn = Boolean(session?.accessToken);
  const canRerun = Boolean(session?.roles?.some((role) => RERUN_ROLES.includes(role)));

  const loadStatus = useCallback(() => {
    void getSourceStatus()
      .then(setPayload)
      .catch(() => setPayload(null));
    void getPipelineMap()
      .then(setMap)
      .catch(() => setMap(null));
  }, []);

  const loadDlq = useCallback(() => {
    if (!signedIn) {
      setFailed([]);
      setGate('guest');
      return;
    }
    void listDeadLetter()
      .then((data) => {
        setFailed(data.items);
        setGate('ok');
      })
      .catch((error: unknown) => {
        setFailed([]);
        if (error instanceof ApiError && error.status === 401) {
          setGate('guest');
          return;
        }
        if (error instanceof ApiError && error.status === 403) {
          setGate('forbidden');
          return;
        }
        setGate('error');
      });
  }, [signedIn]);

  useEffect(() => {
    loadStatus();
    loadDlq();
  }, [loadStatus, loadDlq]);

  const run = (sourceId: string) => {
    if (!canRerun) return;
    setBusyId(sourceId);
    setNotice(null);
    void rerunSource(sourceId)
      .then((result) => {
        setNotice(`${result.status} · ${result.rows_upserted} rows`);
        loadStatus();
        loadDlq();
      })
      .catch((error: unknown) => {
        setNotice(error instanceof ApiError ? error.message : copy.forbidden);
      })
      .finally(() => setBusyId(null));
  };

  const sources: SourceStatusItem[] = payload?.sources ?? [];
  const interval = payload?.interval_hours ?? 24;

  return (
    <section className="mb-4 nd-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {copy.batch} · {interval}h · {copy.notLive}
        </p>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>
      {map ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <p className="rounded-xl border border-line px-3 py-2 text-[11px] text-ink-muted">
            <span className="block font-semibold text-ink">{copy.bronze}</span>
            {map.layers.bronze.documents ?? 0} docs · SHA-256
          </p>
          <p className="rounded-xl border border-line px-3 py-2 text-[11px] text-ink-muted">
            <span className="block font-semibold text-ink">{copy.silver}</span>
            {map.layers.silver.needs_review ?? 0} needs_review
          </p>
          <p className="rounded-xl border border-line px-3 py-2 text-[11px] text-ink-muted">
            <span className="block font-semibold text-ink">{copy.gold}</span>
            {map.layers.gold.published ?? 0} published
          </p>
        </div>
      ) : null}
      {map ? <p className="mt-2 text-[11px] text-ink-muted">{copy.principle} {copy.noAirflow}</p> : null}

      {sources.length === 0 ? <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p> : null}
      {sources.length > 0 ? (
        <ul className="mt-3 max-h-[240px] space-y-2 overflow-y-auto">
          {sources.slice(0, 12).map((source) => (
            <li key={source.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
              <span>
                <span className="block text-sm font-semibold">{source.name}</span>
                <span className="mt-0.5 block text-[11px] text-ink-muted">
                  {source.domain}
                  {' · '}
                  <span className={statusClass(source.last_status)}>{source.last_status ?? '—'}</span>
                  {source.last_error_code ? ` · ${source.last_error_code}` : ''}
                </span>
              </span>
              {canRerun ? (
                <button
                  type="button"
                  disabled={busyId === source.id}
                  onClick={() => run(source.id)}
                  className="rounded-pill border border-line px-3 py-1 text-xs font-semibold disabled:opacity-50"
                >
                  {busyId === source.id ? copy.busy : copy.rerun}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{copy.deadLetter}</h3>
      {gate === 'guest' ? (
        <p className="mt-2 text-sm text-ink-soft">
          {copy.signIn}{' '}
          <Link href="/login" className="font-semibold text-saffron">
            {locale === 'hi' ? 'साइन इन' : 'Sign in'}
          </Link>
        </p>
      ) : null}
      {gate === 'forbidden' ? <p className="mt-2 text-sm text-ink-soft">{copy.forbidden}</p> : null}
      {gate === 'error' ? (
        <p className="mt-2 text-sm text-ink-muted">
          {locale === 'hi' ? 'डेड-लेटर अभी उपलब्ध नहीं।' : 'Dead-letter is unavailable right now.'}
        </p>
      ) : null}
      {gate === 'ok' && failed.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{copy.deadEmpty}</p> : null}
      {notice ? <p className="mt-2 text-xs text-ink-soft">{notice}</p> : null}
      {failed.length > 0 ? (
        <ul className="mt-2 max-h-[200px] space-y-2 overflow-y-auto">
          {failed.map((item) => (
            <li key={item.log_id} className="rounded-xl border border-line px-3 py-2 text-[11px] text-ink-muted">
              <span className="block font-semibold text-ink">{item.name ?? item.source_id}</span>
              <span className="mt-0.5 block text-rose-deep">
                {item.error_code ?? item.status}
                {item.http_status ? ` · HTTP ${item.http_status}` : ''}
              </span>
              {item.detail ? <span className="mt-0.5 block">{item.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default PipelineStrip;
