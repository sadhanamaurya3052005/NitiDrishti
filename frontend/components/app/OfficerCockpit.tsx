'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { AdminStrip } from '@/components/app/AdminStrip';
import { DisasterStrip } from '@/components/app/DisasterStrip';
import { EmptyState } from '@/components/shared/EmptyState';
import { FunnelStrip } from '@/components/app/FunnelStrip';
import { GazetteOcrStrip } from '@/components/app/GazetteOcrStrip';
import { OfficialOutcomeStrip } from '@/components/app/OfficialOutcomeStrip';
import { PipelineStrip } from '@/components/app/PipelineStrip';
import { ReviewQueue } from '@/components/app/ReviewQueue';
import { WelfareGisConsole } from '@/components/app/WelfareGisConsole';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { getHealth } from '@/lib/api';
import { getWelfareSummary, type AnalyticsSummary } from '@/lib/blockE';

export function OfficerCockpit() {
  const { locale, desk, app } = useLocale();
  const { session } = useExperience();
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
          {locale === 'hi' ? 'नक्शा' : 'map'}: TopoJSON
          {' · '}
          PostGIS: {postgis == null ? '…' : postgis ? (locale === 'hi' ? 'चालू' : 'on') : locale === 'hi' ? 'नहीं' : 'off'}
          {' · '}
          {locale === 'hi' ? 'प्रकाशित योजनाएँ' : 'published schemes'}: {summary ? summary.published_schemes : '—'}
        </p>
      </header>

      <ReviewQueue />

      <PipelineStrip />

      <AdminStrip />

      <DisasterStrip />

      <FunnelStrip summary={summary} />

      <OfficialOutcomeStrip />

      <WelfareGisConsole />

      <section className="mt-4 nd-card p-4">
        <h2 className="text-sm font-semibold">{locale === 'hi' ? 'न्याय-मित्र राजपत्र' : 'Nyay-Mitra gazette'}</h2>
        <GazetteOcrStrip className="mt-3 border-0 p-0 shadow-none" />
        <EmptyState
          title={locale === 'hi' ? 'पुराना बनाम नया' : 'Old vs new'}
          body={
            locale === 'hi'
              ? 'इस ड्रॉप से पार्स नहीं होता। राजपत्र अंतर Nyay-Mitra डेस्क पर ingested संस्करणों से आता है।'
              : 'This drop does not parse. Gazette diffs live on the Nyay-Mitra desk from ingested versions.'
          }
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
          {locale === 'hi' ? 'प्रभाव' : 'Impact'}: —
          {' · '}
          {locale === 'hi'
            ? 'यह स्लाइडर लाइव जनसंख्या नहीं चलाता। आधिकारिक आवेदन पंक्तियाँ आने पर प्रभाव गिना जाएगा।'
            : 'This slider does not invent a population. Impact counts wait on official application rows.'}
        </p>
      </section>
    </div>
  );
}

export default OfficerCockpit;
