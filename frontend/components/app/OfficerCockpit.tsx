'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { WelfareGisConsole } from '@/components/app/WelfareGisConsole';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getHealth } from '@/lib/api';
import { getWelfareSummary, type AnalyticsSummary } from '@/lib/blockE';

export function OfficerCockpit() {
  const { locale, desk, app } = useLocale();
  const { session } = useExperience();
  const [fileName, setFileName] = useState<string | null>(null);
  const [cap, setCap] = useState(200000);
  const [postgis, setPostgis] = useState<boolean | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    void getHealth()
      .then((health) => {
        setPostgis(health.database.postgis_enabled);
        setHealthOk(health.database.connected);
      })
      .catch(() => {
        setPostgis(false);
        setHealthOk(false);
      });
    void getWelfareSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <Link href="/#gateways" className="text-sm font-semibold text-saffron">
          ← {locale === 'hi' ? 'होम' : 'Home'}
        </Link>
        <div>
          <p className="nd-eyebrow">{desk.welfare.eyebrow}</p>
          <h1 className="text-headline">{app.workspaces.officer.name}</h1>
        </div>
        <p className="text-xs text-ink-muted">
          {session?.displayName ?? (locale === 'hi' ? 'अतिथि' : 'Guest')}
          {' · '}
          API: {healthOk == null ? '…' : healthOk ? (locale === 'hi' ? 'कनेक्टेड' : 'connected') : locale === 'hi' ? 'ऑफ़लाइन' : 'offline'}
          {' · '}
          PostGIS: {postgis == null ? '…' : postgis ? (locale === 'hi' ? 'चालू' : 'on') : locale === 'hi' ? 'अभी नहीं' : 'not on'}
          {' · '}
          {locale === 'hi' ? 'प्रकाशित योजनाएँ' : 'published schemes'}: {summary ? summary.published_schemes : '—'}
        </p>
      </header>

      <WelfareGisConsole />

      <section className="mt-4 nd-card p-4">
        <h2 className="text-sm font-semibold">{locale === 'hi' ? 'न्याय-मित्र राजपत्र' : 'Nyay-Mitra gazette'}</h2>
        <label className="mt-3 flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-line px-3 py-8 text-center text-sm">
          <input
            type="file"
            accept="application/pdf"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
          />
          {fileName ?? (locale === 'hi' ? 'PDF यहाँ छोड़ें — पार्स अभी कतार में है' : 'Drop PDF here — parsing runs after gazette ingest')}
        </label>
        <EmptyState
          title={locale === 'hi' ? 'पुराना बनाम नया' : 'Old vs new'}
          body={locale === 'hi' ? 'क्लॉज अंतर तब जब NLP पाइपलाइन राजपत्र से JSON निकाले।' : 'Clause delta appears after the NLP pipeline extracts JSON from a gazette.'}
          status="Nyay-Mitra"
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
      </section>
    </div>
  );
}

export default OfficerCockpit;
