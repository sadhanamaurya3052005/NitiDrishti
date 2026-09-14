'use client';

import { useEffect, useState } from 'react';

import { EmptyPhase } from '@/components/shared/EmptyPhase';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getHealth } from '@/lib/api';

export function OfficerCockpit() {
  const { locale, desk, app } = useLocale();
  const [fileName, setFileName] = useState<string | null>(null);
  const [cap, setCap] = useState(200000);
  const [postgis, setPostgis] = useState<boolean | null>(null);

  useEffect(() => {
    void getHealth()
      .then((health) => setPostgis(health.database.postgis_enabled))
      .catch(() => setPostgis(false));
  }, []);

  const stages = desk.welfare.stages;

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <div>
          <p className="nd-eyebrow">{desk.welfare.eyebrow}</p>
          <h1 className="text-headline">{app.workspaces.officer.name}</h1>
        </div>
        <p className="text-xs text-ink-muted">
          PostGIS: {postgis == null ? '…' : postgis ? locale === 'hi' ? 'कनेक्टेड' : 'connected' : locale === 'hi' ? 'अभी नहीं' : 'not on'}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[55%_45%]">
        <section className="nd-card overflow-hidden p-0">
          <div className="relative min-h-[340px] bg-canvas-deep">
            <svg viewBox="0 0 400 280" className="h-full w-full opacity-80" aria-hidden>
              <rect x="20" y="20" width="360" height="240" rx="16" fill="none" stroke="currentColor" className="text-line" />
              <path d="M80 200 C120 80, 180 70, 220 140 S300 220, 340 120" fill="none" stroke="currentColor" className="text-ink-faint" strokeWidth="2" />
              <circle cx="160" cy="150" r="18" className="fill-mint/30 stroke-mint" />
              <circle cx="250" cy="110" r="14" className="fill-rose/20 stroke-rose" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <p className="max-w-md rounded-2xl bg-surface/90 px-4 py-3 text-center text-sm text-ink-soft backdrop-blur">
                {desk.analytics.map}
              </p>
            </div>
          </div>
          <p className="px-4 py-3 text-xs text-ink-muted">
            {locale === 'hi'
              ? 'तहसील रंग तभी जब आधिकारिक GeoJSON + आवेदन पंक्तियाँ हों। लाल/हरे गिनती गढ़ी नहीं गई।'
              : 'Tehsil colour waits on official GeoJSON plus application rows. No invented red/green counts.'}
          </p>
        </section>

        <section className="space-y-4">
          <div className="nd-card p-4">
            <h2 className="text-sm font-semibold">{locale === 'hi' ? '5-चरण वितरण फ़नल' : '5-stage delivery funnel'}</h2>
            <ol className="mt-3 space-y-2">
              {stages.map((stage, index) => (
                <li key={stage} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                  <span>
                    {index + 1}. {stage}
                  </span>
                  <span className="font-mono text-ink-muted">—</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] text-ink-muted">
              {locale === 'hi' ? 'गिनती डेटाबेस क्वेरी से आएगी, मार्केटिंग से नहीं।' : 'Counts will be queries, not marketing.'}
            </p>
          </div>

          <div className="nd-card p-4">
            <h2 className="text-sm font-semibold">{locale === 'hi' ? 'न्याय-मित्र राजपत्र' : 'Nyay-Mitra gazette'}</h2>
            <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm">
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
              />
              {fileName ?? (locale === 'hi' ? 'PDF यहाँ छोड़ें — पार्स फेज़ 13' : 'Drop PDF here — parse is Phase 13')}
            </label>
            <EmptyPhase
              title={locale === 'hi' ? 'पुराना बनाम नया' : 'Old vs new'}
              body={locale === 'hi' ? 'क्लॉज अंतर तब जब NLP पाइपलाइन राजपत्र से JSON निकाले।' : 'Clause delta appears after the NLP pipeline extracts JSON from a gazette.'}
              phase="Phase 13–14"
            />
            <label className="mt-4 block text-xs font-semibold text-ink-muted">
              {locale === 'hi' ? 'काल्पनिक आय छत' : 'Hypothetical income cap'} ₹{cap.toLocaleString('en-IN')}
              <input
                type="range"
                min={100000}
                max={400000}
                step={10000}
                value={cap}
                onChange={(event) => setCap(Number(event.target.value))}
                className="mt-2 w-full"
              />
            </label>
            <p className="mt-2 text-xs text-ink-muted">
              {locale === 'hi'
                ? 'यह स्लाइडर लाइव जनसंख्या नहीं चलाता। आधिकारिक आवेदन पंक्तियाँ आने पर प्रभाव गिना जाएगा।'
                : 'This slider does not invent a population. Impact counts wait on official application rows.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default OfficerCockpit;
