'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { GazetteEvidence } from '@/components/site/GazetteEvidence';
import { CscApiStrip } from '@/components/app/CscApiStrip';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { usePwa } from '@/components/providers/PwaProvider';
import { useSchemes } from '@/hooks/useSchemes';
import { useServerEvaluations } from '@/hooks/useServerEvaluations';
import { enqueueKioskApplicant, listKioskQueue, type KioskQueuedApplicant } from '@/lib/offline/kioskQueue';
import { createApplication, getCscSummary, type ApplicationRecord } from '@/lib/blockE';
import { lastFourDigits, maskIdentity } from '@/lib/privacy/mask';
import type { CasteCategory } from '@/types';

export function CscIntake() {
  const { locale, app, home, desk } = useLocale();
  const { profile, patchProfile, enqueueDossier, session } = useExperience();
  const { online } = usePwa();
  const { schemes } = useSchemes();
  const schemeIds = useMemo(() => schemes.map((item) => item.id), [schemes]);
  const { byId, status: engineStatus } = useServerEvaluations(schemeIds, profile);
  const [name, setName] = useState('');
  const [idRaw, setIdRaw] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'thermal' | 'a4'>('thermal');
  const [queue, setQueue] = useState<KioskQueuedApplicant[]>([]);
  const [consent, setConsent] = useState(false);
  const [publishedSchemes, setPublishedSchemes] = useState<number | null>(null);
  const [lastFiled, setLastFiled] = useState<ApplicationRecord[]>([]);
  const [listTick, setListTick] = useState(0);

  const refreshQueue = useCallback(async () => {
    try {
      setQueue(await listKioskQueue());
    } catch {
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    void getCscSummary()
      .then((data) => setPublishedSchemes(data.published_schemes))
      .catch(() => setPublishedSchemes(null));
  }, []);

  useEffect(() => {
    if (picked.length === 0 && schemes[0]) setPicked([schemes[0].id]);
  }, [picked.length, schemes]);

  const evaluations = useMemo(
    () =>
      schemes.map((scheme) => ({
        scheme,
        evaluation: byId[scheme.id] ?? null,
      })),
    [byId, schemes],
  );

  const selected = evaluations.filter((item) => picked.includes(item.scheme.id));

  const addToQueue = async () => {
    if (!consent || !name.trim()) return;
    await enqueueKioskApplicant({
      id: `vle-${Date.now()}`,
      name: name.trim(),
      maskedId: maskIdentity(idRaw),
      age: profile.age,
      income: profile.income,
      createdAt: new Date().toISOString(),
      schemeIds: picked,
    });
    if (session?.accessToken) {
      const filed = (
        await Promise.all(
          picked.map((schemeId) => createApplication({ scheme_id: schemeId }).catch(() => undefined)),
        )
      ).filter((row): row is ApplicationRecord => Boolean(row));
      setLastFiled(filed);
      setListTick((tick) => tick + 1);
    }
    setName('');
    setIdRaw('');
    await refreshQueue();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'F9') {
        event.preventDefault();
        setPrintMode('thermal');
        window.print();
      }
      if (event.key === 'F10') {
        event.preventDefault();
        setPrintMode('a4');
        window.print();
      }
      if (event.altKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setName('');
        setIdRaw('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-navy px-4 py-3 text-canvas dark:bg-canvas-deep dark:text-ink">
        <Link href="/#gateways" className="text-sm font-semibold text-saffron">
          ← {locale === 'hi' ? 'होम' : 'Home'}
        </Link>
        <p className="text-sm font-semibold">{app.workspaces.csc.name}</p>
        <p className="text-xs">
          {session?.displayName ?? (locale === 'hi' ? 'अतिथि' : 'Guest')}
          {' · '}
          {online ? (locale === 'hi' ? 'ऑनलाइन' : 'Online') : locale === 'hi' ? 'नेटवर्क नहीं' : 'Offline'}
          {' · '}
          {locale === 'hi' ? 'स्थानीय कतार' : 'Local queue'}: {queue.length}
          {' · '}
          {locale === 'hi' ? 'प्रकाशित योजनाएँ' : 'published schemes'}: {publishedSchemes ?? '—'}
        </p>
        <p className="text-[11px] text-canvas/70 dark:text-ink-muted">Tab · Alt+N · F9 80mm · F10 A4 · F12 sync</p>
      </header>

      <CscApiStrip refreshKey={listTick} />
      {lastFiled.length > 0 ? (
        <section className="mb-4 nd-card p-4">
          <h2 className="text-sm font-semibold">
            {locale === 'hi' ? 'सरकारी पेज पर आवेदन' : 'Apply on the official page'}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {locale === 'hi'
              ? 'NitiDrishti स्वीकृति नहीं देती। नीचे सरकारी apply लिंक खोलें। अधिकारी तहसील/विभाग का परिणाम Welfare desk पर दर्ज करता है।'
              : 'NitiDrishti does not sanction. Open the official apply link. An officer records the tehsil/department outcome on the Welfare desk.'}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {lastFiled.map((item) => (
              <li key={item.id}>
                <span className="font-semibold">{item.scheme_name}</span>
                <span className="text-xs text-ink-muted"> · {item.stage}</span>
                {item.official_apply_url ? (
                  <a
                    href={item.official_apply_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs font-semibold text-saffron"
                  >
                    {locale === 'hi' ? 'सरकारी apply' : 'Official apply'}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[25%_45%_30%]">
        <section className="nd-card p-4">
          <h2 className="text-sm font-semibold">{locale === 'hi' ? 'त्वरित इनटेक' : 'Rapid intake'}</h2>
          <label className="mt-3 block text-xs font-semibold text-ink-muted">
            {locale === 'hi' ? 'नाम' : 'Full name'}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-ink-muted">
            {locale === 'hi' ? 'पहचान (केवल अंतिम 4 अंक रखे जाते हैं)' : 'Identity (only last 4 kept)'}
            <input
              value={idRaw}
              onChange={(event) => setIdRaw(lastFourDigits(event.target.value))}
              inputMode="numeric"
              autoComplete="off"
              placeholder="XXXX-XXXX-1234"
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-[11px] text-ink-muted">{maskIdentity(idRaw) || '—'}</span>
          </label>
          <label className="mt-3 block text-xs font-semibold text-ink-muted">
            Age
            <input
              type="number"
              value={profile.age}
              onChange={(event) => patchProfile({ age: Number(event.target.value) })}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-ink-muted">
            Income
            <input
              type="number"
              value={profile.income}
              onChange={(event) => patchProfile({ income: Number(event.target.value) })}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs font-semibold text-ink-muted">
            Category
            <select
              value={profile.category}
              onChange={(event) => patchProfile({ category: event.target.value as CasteCategory })}
              className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm"
            >
              {(['GEN', 'EWS', 'OBC', 'SC', 'ST'] as const).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />
            {session?.accessToken
              ? locale === 'hi'
                ? 'सहमति: साइन-इन खाते पर आवेदन पंक्ति बनेगी। नाम और पहचान अंक सर्वर पर नहीं जाते।'
                : 'Consent: a signed-in application row will be stored. Name and ID digits stay off the server.'
              : desk.csc.consent}
          </label>
          <button
            type="button"
            disabled={!consent || !name.trim()}
            onClick={() => void addToQueue()}
            className="mt-4 w-full rounded-xl bg-saffron py-2 text-sm font-semibold text-navy-deep disabled:opacity-40"
          >
            {locale === 'hi' ? 'कतार में जोड़ें (Alt+N)' : 'Add to queue (Alt+N)'}
          </button>
        </section>

        <section className="nd-card p-4">
          <h2 className="text-sm font-semibold">{locale === 'hi' ? 'नियतात्मक मैट्रिक्स' : 'Deterministic matrix'}</h2>
          {engineStatus === 'error' ? (
            <p className="mt-2 text-xs text-ink-muted">{desk.eligibility.engineDown}</p>
          ) : null}
          <ul className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
            {evaluations.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-ink-muted">{home.schemes.emptyCatalog}</li>
            ) : null}
            {evaluations.map(({ scheme, evaluation }) => (
              <li key={scheme.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-line px-3 py-2">
                  <input
                    type="checkbox"
                    checked={picked.includes(scheme.id)}
                    onChange={(event) =>
                      setPicked((current) =>
                        event.target.checked ? [...current, scheme.id] : current.filter((id) => id !== scheme.id),
                      )
                    }
                  />
                  <span>
                    <span className="block text-sm font-semibold">{locale === 'hi' ? scheme.nameHi : scheme.name}</span>
                    <span
                      className={
                        evaluation?.status === 'ELIGIBLE'
                          ? 'text-xs text-mint-deep'
                          : evaluation?.status === 'INELIGIBLE'
                            ? 'text-xs text-rose-deep'
                            : evaluation?.status === 'PARTIAL_INFO'
                              ? 'text-xs text-amber-deep'
                              : 'text-xs text-ink-muted'
                      }
                    >
                      {evaluation ? `${evaluation.status} · ${evaluation.score}%` : '—'}
                    </span>
                    <GazetteEvidence evaluation={evaluation} fallbackUrl={scheme.sourceUrl} compact className="mt-0.5" />
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="nd-card p-4 print:border-0 print:shadow-none">
          <h2 className="text-sm font-semibold">{locale === 'hi' ? 'प्रिंट कंसोल' : 'Dispatch console'}</h2>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setPrintMode('thermal')}
              className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold ${printMode === 'thermal' ? 'border-saffron bg-saffron-soft' : 'border-line'}`}
            >
              80mm
            </button>
            <button
              type="button"
              onClick={() => setPrintMode('a4')}
              className={`flex-1 rounded-xl border px-2 py-2 text-xs font-semibold ${printMode === 'a4' ? 'border-saffron bg-saffron-soft' : 'border-line'}`}
            >
              A4
            </button>
          </div>
          <div className={`mt-3 rounded-xl border border-dashed border-line bg-canvas px-3 py-4 ${printMode === 'thermal' ? 'max-w-[240px]' : ''}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">NitiDrishti · {printMode}</p>
            <p className="mt-2 text-sm font-semibold">{name || '—'}</p>
            <p className="text-xs text-ink-muted">{maskIdentity(idRaw) || 'XXXX-XXXX-****'}</p>
            <ul className="mt-3 space-y-1 text-xs">
              {selected.map((item) => (
                <li key={item.scheme.id}>
                  {locale === 'hi' ? item.scheme.nameHi : item.scheme.name} — {item.evaluation?.status ?? '—'}
                  {item.evaluation?.versionNumber != null ? ` · v${item.evaluation.versionNumber}` : ''}
                  {item.evaluation?.asOf ? ` · ${item.evaluation.asOf}` : ''}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-ink-muted">
              {locale === 'hi' ? 'QR / हस्ताक्षर प्रिंट वर्कर आने पर।' : 'QR / stamp when the print worker is live.'}
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="mt-3 w-full rounded-xl bg-ink py-2 text-sm font-semibold text-canvas">
            {printMode === 'thermal' ? 'F9 · 80mm' : 'F10 · A4'}
          </button>
          <button
            type="button"
            onClick={() => selected.forEach((item) => enqueueDossier(item.scheme.name, item.scheme.id))}
            className="mt-2 w-full rounded-xl border border-line py-2 text-sm"
          >
            {locale === 'hi' ? 'डोज़ियर कतार' : 'Queue dossiers'}
          </button>
          <p className="mt-4 text-xs text-ink-muted">
            F12{' '}
            {session?.accessToken
              ? locale === 'hi'
                ? 'साइन-इन: डोज़ियर और आवेदन API पर; नाम IndexedDB में।'
                : 'signed-in: dossiers and applications go to the API; the name stays in IndexedDB.'
              : locale === 'hi'
                ? 'सिंक: सर्वर पंक्तियाँ अतिथि मोड में 0। कतार IndexedDB में है।'
                : 'sync: guest writes 0 server rows. Queue is IndexedDB only.'}
          </p>
        </section>
      </div>
    </div>
  );
}

export default CscIntake;
