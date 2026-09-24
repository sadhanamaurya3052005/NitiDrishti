'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { GazetteEvidence } from '@/components/site/GazetteEvidence';
import { CscApiStrip } from '@/components/app/CscApiStrip';
import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { usePwa } from '@/components/providers/PwaProvider';
import { useSchemes } from '@/hooks/useSchemes';
import { useServerEvaluations } from '@/hooks/useServerEvaluations';
import type { QueueState } from '@/lib/offline/kioskPolicy';
import {
  applicantState,
  buildQueuedApplicant,
  deleteKioskApplicant,
  enqueueKioskApplicant,
  listKioskQueue,
  resetKioskRetry,
  type KioskQueuedApplicant,
} from '@/lib/offline/kioskQueue';
import { requestKioskSync, syncKioskQueue } from '@/lib/offline/kioskSync';
import { getCscSummary, type ApplicationRecord } from '@/lib/blockE';
import { lastFourDigits, maskIdentity } from '@/lib/privacy/mask';
import type { CasteCategory } from '@/types';

function queueStateLabel(state: QueueState, hi: boolean): string {
  if (state === 'SYNCING') return hi ? 'सिंक हो रहा है' : 'Syncing';
  if (state === 'SYNCED') return hi ? 'सिंक हो गया' : 'Synced';
  if (state === 'RETRY_REQUIRED') return hi ? 'फिर कोशिश करें' : 'Retry required';
  if (state === 'FAILED') return hi ? 'असफल' : 'Failed';
  if (state === 'CONFLICT') return hi ? 'टकराव' : 'Conflict';
  return hi ? 'कतार में' : 'Queued';
}

function queueStateClass(state: QueueState): string {
  if (state === 'SYNCED') return 'text-mint-deep';
  if (state === 'SYNCING') return 'text-ink';
  if (state === 'RETRY_REQUIRED') return 'text-amber-deep';
  if (state === 'FAILED' || state === 'CONFLICT') return 'text-rose-deep';
  return 'text-ink-muted';
}

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
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const queueLock = useRef(false);

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
    const onSync = () => {
      void refreshQueue();
    };
    window.addEventListener('nd-kiosk-sync', onSync);
    window.addEventListener('online', onSync);
    return () => {
      window.removeEventListener('nd-kiosk-sync', onSync);
      window.removeEventListener('online', onSync);
    };
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

  const runSync = useCallback(async () => {
    if (!session?.accessToken) return { filed: [] as ApplicationRecord[], pending: 0, failed: 0 };
    setSyncing(true);
    try {
      const result = await syncKioskQueue();
      if (result.filed.length > 0) {
        setLastFiled(result.filed);
        setListTick((tick) => tick + 1);
      }
      await refreshQueue();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refreshQueue, session?.accessToken]);

  const addToQueue = useCallback(async () => {
    if (queueLock.current || !consent || !name.trim()) return;
    queueLock.current = true;
    try {
      const row = buildQueuedApplicant({
        name: name.trim(),
        maskedId: maskIdentity(idRaw),
        age: profile.age,
        income: profile.income,
        schemeIds: picked,
      });
      await enqueueKioskApplicant(row);
      setName('');
      setIdRaw('');
      await refreshQueue();
      if (!session?.accessToken) {
        setQueueNotice(
          locale === 'hi'
            ? 'स्थानीय कतार में सहेजा। अतिथि मोड सर्वर पर पंक्ति नहीं लिखता।'
            : 'Saved to this device. Guest mode writes zero server rows.',
        );
        setLastFiled([]);
        return;
      }
      if (!online) {
        setQueueNotice(
          locale === 'hi'
            ? 'ऑफ़लाइन कतार में सहेजा। नेट आने पर वही अनुरोध-आईडी से सिंक होगा।'
            : 'Queued offline. It will sync with the same request ID when the network returns.',
        );
        setLastFiled([]);
        return;
      }
      setQueueNotice(null);
      const result = await runSync();
      if (result.pending > 0) {
        setQueueNotice(
          locale === 'hi'
            ? 'कुछ पंक्तियाँ कतार में रह गईं। F12 या Retry से फिर भेजें।'
            : 'Some items remain queued. Use F12 or Retry.',
        );
      }
    } finally {
      queueLock.current = false;
    }
  }, [
    consent,
    idRaw,
    locale,
    name,
    online,
    picked,
    profile.age,
    profile.income,
    refreshQueue,
    runSync,
    session?.accessToken,
  ]);

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
        void addToQueue();
      }
      if (event.key === 'F12') {
        event.preventDefault();
        requestKioskSync();
        void runSync();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addToQueue, runSync]);

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
      {queueNotice ? (
        <p className="mb-4 text-xs font-semibold text-amber-deep" role="status">
          {queueNotice}
        </p>
      ) : null}
      {queue.length > 0 ? (
        <section className="mb-4 nd-card p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{locale === 'hi' ? 'स्थानीय कतार' : 'Local queue'}</h2>
            <button
              type="button"
              onClick={() => {
                requestKioskSync();
                void runSync();
              }}
              disabled={syncing || !session?.accessToken}
              className="rounded-xl border border-line px-3 py-1 text-xs font-semibold disabled:opacity-40"
            >
              {syncing
                ? locale === 'hi'
                  ? 'सिंक…'
                  : 'Syncing…'
                : locale === 'hi'
                  ? 'अभी सिंक (F12)'
                  : 'Sync now (F12)'}
            </button>
          </div>
          <ul className="mt-2 space-y-2">
            {queue.map((row) => {
              const state = applicantState(row);
              return (
                <li key={row.id} className="rounded-xl border border-line px-3 py-2">
                  <p className="text-sm font-semibold">{row.name || '—'}</p>
                  <p className={`text-xs font-semibold ${queueStateClass(state)}`}>
                    {queueStateLabel(state, locale === 'hi')}
                    {row.ops.some((item) => item.serverApplicationId)
                      ? ` · ${row.ops.filter((item) => item.serverApplicationId).length} ${locale === 'hi' ? 'आवेदन' : 'application(s)'}`
                      : ''}
                  </p>
                  {row.ops
                    .filter((item) => item.lastError)
                    .map((item) => (
                      <p key={item.requestId} className="mt-1 text-[11px] text-ink-muted">
                        {item.lastError}
                      </p>
                    ))}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {state === 'RETRY_REQUIRED' || state === 'FAILED' || state === 'CONFLICT' ? (
                      <button
                        type="button"
                        onClick={() => {
                          void resetKioskRetry(row.id).then(() => {
                            requestKioskSync();
                            void runSync();
                          });
                        }}
                        className="rounded-xl border border-line px-2 py-1 text-[11px] font-semibold"
                      >
                        {locale === 'hi' ? 'फिर कोशिश' : 'Retry'}
                      </button>
                    ) : null}
                    {state === 'SYNCED' || state === 'FAILED' ? (
                      <button
                        type="button"
                        onClick={() => {
                          void deleteKioskApplicant(row.id).then(() => refreshQueue());
                        }}
                        className="rounded-xl border border-line px-2 py-1 text-[11px]"
                      >
                        {locale === 'hi' ? 'हटाएँ' : 'Remove'}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
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
