'use client';

import { useCallback, useEffect, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import {
  listApplicationQueue,
  recordApplicationStage,
  type ApplicationRecord,
} from '@/lib/blockE';
import { ApiError } from '@/lib/api';
import type { Role } from '@/types';

const OFFICER: readonly Role[] = ['WELFARE_OFFICER', 'ADMIN'];

const NEXT: Record<string, ApplicationRecord['stage'] | null> = {
  Discovered: 'Submitted',
  Submitted: 'Tehsil Verified',
  'Tehsil Verified': 'Sanctioned',
  Sanctioned: 'DBT Disbursed',
  'DBT Disbursed': null,
};

export function OfficialOutcomeStrip() {
  const { locale } = useLocale();
  const { session } = useExperience();
  const allowed = Boolean(session?.roles?.some((role) => OFFICER.includes(role)));
  const authed = Boolean(session?.accessToken);
  const [rows, setRows] = useState<ApplicationRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const copy = locale === 'hi'
    ? {
        title: 'आधिकारिक परिणाम',
        lede: 'NitiDrishti sanction नहीं करती। नागरिक सरकारी पेज पर apply करते हैं। अधिकारी तहसील/विभाग का परिणाम यहाँ दर्ज करता है — ministry API नहीं, auto-DBT नहीं।',
        guest: 'आधिकारिक चरण दर्ज करने के लिए अधिकारी के रूप में साइन इन करें।',
        forbidden: 'यह खाता आधिकारिक परिणाम नहीं लिख सकता।',
        empty: 'अभी कोई आवेदन पंक्ति नहीं।',
        next: 'अगला आधिकारिक चरण',
        apply: 'सरकारी पेज',
      }
    : {
        title: 'Official outcome',
        lede: 'NitiDrishti does not sanction. The citizen applies on the official government page. An officer records the tehsil/department outcome here — not a ministry API, not auto-DBT.',
        guest: 'Sign in as an officer to record the official stage.',
        forbidden: 'This account cannot record an official outcome.',
        empty: 'No application rows yet.',
        next: 'Record next official stage',
        apply: 'Official page',
      };

  const load = useCallback(() => {
    if (!authed || !allowed) {
      setRows([]);
      return;
    }
    void listApplicationQueue()
      .then((data) => setRows(data.applications))
      .catch(() => setRows([]));
  }, [allowed, authed]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = (row: ApplicationRecord) => {
    const stage = NEXT[row.stage];
    if (!stage) return;
    setBusyId(row.id);
    setNotice(null);
    void recordApplicationStage(row.id, stage as 'Submitted' | 'Tehsil Verified' | 'Sanctioned' | 'DBT Disbursed')
      .then((updated) => {
        setRows((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        load();
      })
      .catch((error: unknown) => {
        setNotice(error instanceof ApiError ? error.message : copy.forbidden);
      })
      .finally(() => setBusyId(null));
  };

  return (
    <section className="mt-4 nd-card p-4">
      <h2 className="text-sm font-semibold">{copy.title}</h2>
      <p className="mt-1 text-xs text-ink-muted">{copy.lede}</p>
      {!authed ? <p className="mt-2 text-sm text-ink-soft">{copy.guest}</p> : null}
      {authed && !allowed ? <p className="mt-2 text-sm text-ink-soft">{copy.forbidden}</p> : null}
      {authed && allowed && rows.length === 0 ? <p className="mt-2 text-sm text-ink-muted">{copy.empty}</p> : null}
      {notice ? <p className="mt-2 text-xs text-ink-soft">{notice}</p> : null}
      {rows.length > 0 ? (
        <ul className="mt-3 max-h-[240px] space-y-2 overflow-y-auto">
          {rows.map((row) => {
            const stage = NEXT[row.stage];
            return (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <span>
                  <span className="block text-sm font-semibold">{row.scheme_name || row.scheme_id}</span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">{row.stage}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {row.official_apply_url ? (
                    <a
                      href={row.official_apply_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-pill border border-line px-3 py-1 text-xs font-semibold"
                    >
                      {copy.apply}
                    </a>
                  ) : null}
                  {stage ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => advance(row)}
                      className="rounded-pill border border-line px-3 py-1 text-xs font-semibold disabled:opacity-50"
                    >
                      {copy.next}: {stage}
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default OfficialOutcomeStrip;
