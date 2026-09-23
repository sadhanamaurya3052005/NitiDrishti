'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { ApiError, listReviewQueue, reviewScheme, type ReviewSchemeRecord } from '@/lib/api';
import type { WelfareReviewCopy } from '@/lib/i18n/desks';
import type { Role } from '@/types';

const REVIEW_ROLES: readonly Role[] = ['POLICY_ANALYST', 'WELFARE_OFFICER', 'ADMIN'];

function reasonLabel(copy: WelfareReviewCopy, reason: string): string {
  if (reason === 'thin_summary') return copy.reasons.thin_summary;
  if (reason === 'no_rules') return copy.reasons.no_rules;
  if (reason === 'income_cap_conflict') return copy.reasons.income_cap_conflict;
  return copy.reasons.needs_review;
}

function sourceHost(url?: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
}

export function ReviewQueue() {
  const { locale, desk } = useLocale();
  const { session } = useExperience();
  const copy = desk.welfare.review;
  const [schemes, setSchemes] = useState<ReviewSchemeRecord[]>([]);
  const [gate, setGate] = useState<'loading' | 'ok' | 'signIn' | 'forbidden' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const signedIn = Boolean(session?.accessToken);
  const canReview = Boolean(session?.roles?.some((role) => REVIEW_ROLES.includes(role)));

  const load = useCallback(() => {
    if (!signedIn) {
      setSchemes([]);
      setGate('signIn');
      return;
    }
    setGate('loading');
    void listReviewQueue()
      .then((payload) => {
        setSchemes(payload.schemes);
        setGate('ok');
      })
      .catch((error: unknown) => {
        setSchemes([]);
        if (error instanceof ApiError && error.status === 401) {
          setGate('signIn');
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
    load();
  }, [load]);

  const act = (schemeId: string, action: 'approve' | 'reject') => {
    if (!canReview) return;
    setBusyId(schemeId);
    setNotice(null);
    void reviewScheme(schemeId, action)
      .then((result) => {
        setSchemes((current) => current.filter((item) => item.id !== result.id && item.id !== schemeId));
        setNotice(
          action === 'approve'
            ? `${schemeId} → published`
            : `${schemeId} → archived`,
        );
      })
      .catch((error: unknown) => {
        setNotice(error instanceof ApiError ? error.message : copy.forbidden);
      })
      .finally(() => setBusyId(null));
  };

  return (
    <section className="mb-4 nd-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{copy.title}</h2>
        {gate === 'ok' ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {schemes.length} {copy.queued}
          </p>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>

      {gate === 'signIn' ? (
        <p className="mt-3 text-sm text-ink-soft">
          {copy.signIn}{' '}
          <Link href="/login" className="font-semibold text-saffron">
            {locale === 'hi' ? 'साइन इन' : 'Sign in'}
          </Link>
        </p>
      ) : null}
      {gate === 'forbidden' ? <p className="mt-3 text-sm text-ink-soft">{copy.forbidden}</p> : null}
      {gate === 'error' ? (
        <p className="mt-3 text-sm text-ink-muted">
          {locale === 'hi' ? 'समीक्षा कतार अभी उपलब्ध नहीं।' : 'Review queue is unavailable right now.'}
        </p>
      ) : null}
      {gate === 'ok' && schemes.length === 0 ? <p className="mt-3 text-sm text-ink-muted">{copy.empty}</p> : null}
      {notice ? <p className="mt-2 text-xs text-mint-deep">{notice}</p> : null}

      {schemes.length > 0 ? (
        <ul className="mt-3 max-h-[360px] space-y-2 overflow-y-auto">
          {schemes.map((scheme) => {
            const name = locale === 'hi' ? scheme.nameHi : scheme.name;
            const host = sourceHost(scheme.sourceUrl);
            return (
              <li key={scheme.id} className="rounded-xl border border-line px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{name}</p>
                    <p className="mt-1 text-[11px] text-ink-muted">
                      {scheme.versionNumber != null ? `v${scheme.versionNumber}` : null}
                      {scheme.versionNumber != null ? ' · ' : null}
                      {scheme.ruleCount ?? 0} {locale === 'hi' ? 'नियम' : 'rules'}
                      {host ? (
                        <>
                          {' · '}
                          <a href={scheme.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-saffron">
                            {host}
                          </a>
                        </>
                      ) : null}
                    </p>
                    <ul className="mt-1 text-[11px] text-amber-deep">
                      {(scheme.reasons ?? ['needs_review']).map((reason) => (
                        <li key={reason}>{reasonLabel(copy, reason)}</li>
                      ))}
                    </ul>
                  </div>
                  {canReview ? (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === scheme.id}
                        onClick={() => act(scheme.id, 'approve')}
                        className="rounded-pill bg-ink px-3 py-1 text-xs font-semibold text-canvas disabled:opacity-50"
                      >
                        {busyId === scheme.id ? copy.busy : copy.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === scheme.id}
                        onClick={() => act(scheme.id, 'reject')}
                        className="rounded-pill border border-line px-3 py-1 text-xs font-semibold disabled:opacity-50"
                      >
                        {copy.reject}
                      </button>
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default ReviewQueue;
