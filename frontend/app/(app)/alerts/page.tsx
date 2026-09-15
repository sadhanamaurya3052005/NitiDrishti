'use client';

import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { MetricBadge } from '@/components/ui/MetricBadge';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getAlerts, markAlertRead, scanPublishedAlerts, type AlertItem } from '@/lib/blockE';

export default function AlertsPage() {
  const { locale, desk } = useLocale();
  const { session } = useExperience();
  const authed = Boolean(session?.accessToken);
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authed) {
      setAlerts([]);
      return;
    }
    let cancelled = false;
    void getAlerts()
      .then((data) => {
        if (!cancelled) setAlerts(data.alerts);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'unavailable');
        setAlerts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const onScan = async () => {
    setBusy(true);
    try {
      const data = await scanPublishedAlerts();
      setAlerts(data.alerts);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'unavailable');
    } finally {
      setBusy(false);
    }
  };

  const onRead = async (id: string) => {
    const updated = await markAlertRead(id);
    setAlerts((current) => current?.map((item) => (item.id === id ? updated.alert : item)) ?? []);
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="nd-eyebrow">{desk.alerts.eyebrow}</p>
          <h1 className="mt-1 text-headline">{desk.alerts.title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{desk.alerts.lede}</p>
        </div>
        <MetricBadge label="Alerts" note={alerts ? String(alerts.length) : undefined} />
      </header>
      {authed ? (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onScan()}
            className="rounded-xl border border-line px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {locale === 'hi' ? 'प्रकाशित योजनाएँ जाँचें' : 'Check published schemes'}
          </button>
        </div>
      ) : null}
      <div className="mt-8">
        {!authed ? (
          <EmptyState
            title={desk.alerts.empty}
            body={
              locale === 'hi'
                ? 'अलर्ट केवल साइन-इन खाते पर बनते हैं। अतिथि मोड सर्वर पर शून्य पंक्ति लिखता है।'
                : 'Alerts are for signed-in accounts. Guest mode writes zero server rows.'
            }
            status="Alerts"
          />
        ) : error ? (
          <EmptyState title={locale === 'hi' ? 'अलर्ट नहीं मिले' : 'Alerts unreachable'} body={error} status="Alerts" />
        ) : alerts == null ? (
          <EmptyState title={locale === 'hi' ? 'लोड हो रहा है' : 'Loading'} body={desk.alerts.lede} status="Alerts" />
        ) : alerts.length === 0 ? (
          <EmptyState title={desk.alerts.empty} body={desk.alerts.lede} status="Alerts" />
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.id} className="nd-card flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold">{alert.alert_type}</p>
                  <p className="mt-1 text-xs text-ink-soft">{String(alert.payload.scheme_name ?? alert.payload.note ?? '')}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{new Date(alert.created_at).toLocaleString(locale === 'hi' ? 'hi-IN' : 'en-IN')}</p>
                </div>
                {alert.read_at ? (
                  <span className="text-[11px] text-ink-muted">{locale === 'hi' ? 'पढ़ा' : 'Read'}</span>
                ) : (
                  <button type="button" className="text-xs font-semibold underline" onClick={() => void onRead(alert.id)}>
                    {locale === 'hi' ? 'पढ़ा चिह्नित करें' : 'Mark read'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
