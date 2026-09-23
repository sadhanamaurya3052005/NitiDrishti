'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { listDossiers, type DossierRecord } from '@/lib/api';
import { getAlerts, listApplications, type AlertItem, type ApplicationRecord } from '@/lib/blockE';

export function CscApiStrip({ refreshKey = 0 }: { refreshKey?: number }) {
  const { locale, desk } = useLocale();
  const { session } = useExperience();
  const authed = Boolean(session?.accessToken);
  const [dossiers, setDossiers] = useState<DossierRecord[] | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authed) {
      setDossiers([]);
      setAlerts([]);
      setApplications([]);
      setError(null);
      return;
    }
    let cancelled = false;
    void Promise.all([
      listDossiers().catch(() => null),
      getAlerts().catch(() => null),
      listApplications().catch(() => null),
    ]).then(([dossierPayload, alertPayload, appPayload]) => {
        if (cancelled) return;
        if (!dossierPayload && !alertPayload && !appPayload) {
          setError(locale === 'hi' ? 'सर्वर कतार नहीं खुली।' : 'Server queue unreachable.');
          setDossiers([]);
          setAlerts([]);
          setApplications([]);
          return;
        }
        setDossiers(dossierPayload?.dossiers ?? []);
        setAlerts(alertPayload?.alerts ?? []);
        setApplications(appPayload?.applications ?? []);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [authed, locale, refreshKey]);

  return (
    <section className="mb-4 nd-card p-4">
      <h2 className="text-sm font-semibold">{desk.csc.api.title}</h2>
      {!authed ? (
        <p className="mt-2 text-xs text-ink-muted">
          {desk.csc.api.guest}{' '}
          <Link href="/login" className="font-semibold text-saffron">
            {locale === 'hi' ? 'साइन इन' : 'Sign in'}
          </Link>
        </p>
      ) : error ? (
        <p className="mt-2 text-xs text-ink-muted">{error}</p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {locale === 'hi' ? 'आवेदन' : 'Applications'}
              {applications ? ` · ${applications.length}` : ''}
            </p>
            <p className="mt-1 text-[11px] text-ink-muted">
              {locale === 'hi'
                ? 'स्वीकृति सरकारी पेज पर। यहाँ केवल ट्रैक।'
                : 'Approval is on the official page. This is tracking only.'}
            </p>
            {applications == null ? (
              <p className="mt-2 text-xs text-ink-muted">…</p>
            ) : applications.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">{desk.csc.api.empty}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {applications.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold">{item.scheme_name}</span>
                    <span className="text-xs text-ink-muted"> · {item.stage}</span>
                    {item.official_apply_url ? (
                      <a
                        href={item.official_apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-1 text-xs font-semibold text-saffron"
                      >
                        {locale === 'hi' ? 'सरकारी apply' : 'Official apply'}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {desk.csc.api.dossiers}
              {dossiers ? ` · ${dossiers.length}` : ''}
            </p>
            {dossiers == null ? (
              <p className="mt-2 text-xs text-ink-muted">…</p>
            ) : dossiers.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">{desk.csc.api.empty}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {dossiers.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold">{item.scheme_name}</span>
                    <span className="text-xs text-ink-muted"> · {item.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {desk.csc.api.alerts}
              {alerts ? ` · ${alerts.length}` : ''}
            </p>
            {alerts == null ? (
              <p className="mt-2 text-xs text-ink-muted">…</p>
            ) : alerts.length === 0 ? (
              <p className="mt-2 text-xs text-ink-muted">{desk.csc.api.empty}</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {alerts.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <span className="font-semibold">{item.alert_type}</span>
                    <span className="text-xs text-ink-muted">
                      {' '}
                      · {String(item.payload.scheme_name ?? item.payload.note ?? '')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default CscApiStrip;
