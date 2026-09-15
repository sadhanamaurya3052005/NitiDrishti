'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { geoBounds, geoCentroid } from 'd3-geo';
import { MapPin, Radio } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';

import { useExperience } from '@/components/providers/ExperienceProvider';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import {
  dispatchCscCamp,
  getDistrictAnalytics,
  getDistrictDetail,
  type DistrictAnalytics,
  type DistrictDetail,
  type DistrictMetric,
  type DistrictMetricRow,
} from '@/lib/blockE';
import {
  INDIA_DISTRICTS_MAP,
  geoDistrictName,
  geoPlaceKey,
  geoStateName,
  normalizeState,
  placeKey,
} from '@/lib/geo/indiaDistricts';
import { ApiError } from '@/lib/api';
import { easings } from '@/lib/motion';

const METRICS: { id: DistrictMetric; en: string; hi: string }[] = [
  { id: 'coverage_saturation', en: 'Coverage saturation', hi: 'कवरेज संतृप्ति' },
  { id: 'application_dropoff', en: 'Application drop-off', hi: 'आवेदन ड्रॉप-ऑफ' },
  { id: 'cohort_gap', en: 'Gender/caste cohort gap', hi: 'लिंग/जाति अंतर' },
  { id: 'disbursement_velocity', en: 'Fund disbursement velocity', hi: 'निधि वितरण गति' },
];

const INDIA_VIEW = { center: [82.8, 22.6] as [number, number], scale: 1080 };

function fillFor(pct: number | null): string {
  if (pct == null) return '#C8C0B0';
  if (pct >= 75) return '#0E9F6E';
  if (pct >= 45) return '#C2740A';
  return '#D22A4C';
}

function dash(value: number | null | undefined, empty = '—'): string {
  return value == null ? empty : String(value);
}

function districtsCollection(raw: Topology): FeatureCollection<Geometry> {
  const object = (raw.objects.districts ?? Object.values(raw.objects)[0]) as GeometryCollection;
  return feature(raw, object) as FeatureCollection<Geometry>;
}

function viewFor(collection: FeatureCollection<Geometry> | null): { center: [number, number]; scale: number } {
  if (!collection?.features.length) return INDIA_VIEW;
  const [[minX, minY], [maxX, maxY]] = geoBounds(collection);
  const [cx, cy] = geoCentroid(collection);
  const span = Math.max(maxX - minX, maxY - minY, 1);
  return {
    center: [cx || INDIA_VIEW.center[0], cy || INDIA_VIEW.center[1]],
    scale: Math.min(4600, Math.max(1000, Math.round(2600 / span))),
  };
}

export function WelfareGisConsole() {
  const { locale } = useLocale();
  const { session } = useExperience();
  const reduceMotion = useReducedMotion();
  const hi = locale === 'hi';

  const [metric, setMetric] = useState<DistrictMetric>('coverage_saturation');
  const [stateId, setStateId] = useState('');
  const [bundle, setBundle] = useState<DistrictAnalytics | null>(null);
  const [collection, setCollection] = useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<{ row: DistrictMetricRow | null; name: string; state: string; x: number; y: number } | null>(
    null,
  );
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistrictDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const canDispatch = Boolean(
    session?.accessToken && session.roles?.some((role) => role === 'WELFARE_OFFICER' || role === 'ADMIN'),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [analytics, raw] = await Promise.all([
        getDistrictAnalytics({ metric, stateId: stateId || undefined }),
        collection
          ? Promise.resolve(null)
          : fetch(INDIA_DISTRICTS_MAP).then((response) => {
              if (!response.ok) throw new Error('map');
              return response.json() as Promise<Topology>;
            }),
      ]);
      setBundle(analytics);
      if (raw) setCollection(districtsCollection(raw));
    } catch {
      setError(hi ? 'ज़िला आँकड़े या मानचित्र नहीं खुला।' : 'District analytics or the map file failed to load.');
    } finally {
      setLoading(false);
    }
  }, [collection, hi, metric, stateId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!lockedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void getDistrictDetail(lockedId)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch(() => {
        if (!cancelled) setDetailError(hi ? 'ज़िला विवरण नहीं मिला।' : 'District detail could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hi, lockedId]);

  const byKey = useMemo(() => {
    const map = new Map<string, DistrictMetricRow>();
    for (const row of bundle?.districts ?? []) {
      map.set(placeKey(row.state_name, row.name), row);
    }
    return map;
  }, [bundle]);

  const filtered = useMemo(() => {
    if (!collection) return null;
    if (!stateId || !bundle) return collection;
    const state = bundle.states.find((item) => item.id === stateId);
    if (!state) return collection;
    const want = normalizeState(state.name);
    return {
      type: 'FeatureCollection' as const,
      features: collection.features.filter((item) => normalizeState(geoStateName(item.properties)) === want),
    };
  }, [bundle, collection, stateId]);

  const projection = useMemo(() => viewFor(filtered), [filtered]);
  const selected = (bundle?.districts ?? []).find((row) => row.id === lockedId) ?? detail;
  const metricMeta = bundle?.metrics[metric];

  const onDispatch = async () => {
    if (!lockedId) return;
    setDispatching(true);
    try {
      const result = await dispatchCscCamp(lockedId);
      setToast({
        kind: 'ok',
        text: hi
          ? `${result.created} CSC संचालक को सूचना। एसएमएस नहीं।`
          : `${result.created} CSC operator notice(s) written. No SMS.`,
      });
      setConfirmOpen(false);
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 0;
      setToast({
        kind: 'err',
        text:
          status === 401
            ? hi
              ? 'अतिथि शिविर नहीं भेज सकते। साइन इन करें।'
              : 'Guest cannot dispatch. Sign in as a welfare officer.'
            : status === 403
              ? hi
                ? 'केवल कल्याण अधिकारी या प्रशासक।'
                : 'Only a welfare officer or admin can dispatch.'
              : hi
                ? 'शिविर सूचना नहीं लिखी गई।'
                : 'Camp notice could not be written.',
      });
    } finally {
      setDispatching(false);
    }
  };

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,60%)_minmax(0,40%)]">
      <div className="nd-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            <p className="nd-eyebrow">{hi ? 'राष्ट्रीय प्रशासनिक इंजन' : 'National administrative engine'}</p>
            <h2 className="text-sm font-semibold text-ink">{hi ? 'ज़िला कोरोप्लेथ' : 'District choropleth'}</h2>
          </div>
          <label className="text-xs font-medium text-ink-soft">
            <span className="sr-only">{hi ? 'राज्य चुनें' : 'Select state'}</span>
            <select
              value={stateId}
              onChange={(event) => {
                setStateId(event.target.value);
                setLockedId(null);
              }}
              className="mt-1 h-10 min-w-[12rem] rounded-pill border border-line bg-canvas px-3 text-sm text-ink outline-none ring-mint/40 focus-visible:ring-2"
            >
              <option value="">{hi ? 'पूरा भारत' : 'All India'}</option>
              {(bundle?.states ?? []).map((state) => (
                <option key={state.id} value={state.id}>
                  {hi ? state.name_hi : state.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 py-3" role="radiogroup" aria-label={hi ? 'मेट्रिक' : 'Metric'}>
          {METRICS.map((item) => {
            const available = bundle?.metrics[item.id]?.available ?? false;
            const active = metric === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                aria-disabled={!available}
                onClick={() => setMetric(item.id)}
                className={cn(
                  'nd-chip transition',
                  active && available && 'border-mint bg-mint-soft text-mint-deep',
                  active && !available && 'border-line-strong bg-canvas-deep text-ink-muted',
                  !available && 'opacity-70',
                )}
              >
                {hi ? item.hi : item.en}
                {!available ? <span className="text-[10px]">{hi ? 'बंद' : 'off'}</span> : null}
              </button>
            );
          })}
        </div>
        <p className="px-4 pb-2 text-[11px] leading-relaxed text-ink-muted">
          {metricMeta?.available
            ? metricMeta.reason
            : hi
              ? 'इस मेट्रिक के लिए टेलीमेट्री नहीं। ज़िले धूसर रहेंगे — कोई गढ़ा प्रतिशत नहीं।'
              : 'No telemetry yet for this metric. Districts stay grey — no invented percentages.'}
        </p>

        <div className="relative min-h-[360px] bg-canvas-deep">
          {loading ? (
            <div className="grid h-[360px] place-items-center p-6" aria-busy>
              <div className="nd-skeleton h-full min-h-[280px] w-full" />
            </div>
          ) : error ? (
            <div className="flex h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-ink-soft">{error}</p>
              <Button variant="ghost" onClick={() => void load()}>
                {hi ? 'फिर कोशिश' : 'Retry'}
              </Button>
            </div>
          ) : !filtered?.features.length ? (
            <div className="flex h-[360px] flex-col items-center justify-center px-6 text-center">
              <p className="text-sm text-ink-soft">
                {hi ? 'इस राज्य के लिए मानचित्र बहुभुज नहीं मिले।' : 'No map polygons for this state.'}
              </p>
            </div>
          ) : (
            <ComposableMap
              key={`${projection.center.join(',')}-${projection.scale}`}
              projection="geoMercator"
              projectionConfig={{ center: projection.center, scale: projection.scale }}
              width={800}
              height={640}
              className="h-auto w-full"
              role="img"
              aria-label={hi ? 'भारत के ज़िलों का मानचित्र' : 'India district map'}
            >
              <ZoomableGroup zoom={1} filterZoomEvent={reduceMotion ? () => false : undefined}>
                <Geographies geography={filtered}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const props = (geo.properties ?? {}) as Record<string, unknown>;
                      const row = byKey.get(geoPlaceKey(props)) ?? null;
                      const active = row?.id === lockedId;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          tabIndex={0}
                          role="button"
                          aria-label={`${geoDistrictName(props)}, ${geoStateName(props)}`}
                          fill={fillFor(row?.saturation_pct ?? null)}
                          stroke={active ? '#0B1B3A' : '#F3EEE4'}
                          strokeWidth={active ? 1.4 : 0.45}
                          className="cursor-pointer outline-none transition-[stroke-width] hover:stroke-[#0B1B3A] focus-visible:stroke-[#0B1B3A]"
                          onMouseEnter={(event) => {
                            setHover({
                              row,
                              name: geoDistrictName(props),
                              state: geoStateName(props),
                              x: event.clientX,
                              y: event.clientY,
                            });
                          }}
                          onMouseMove={(event) => {
                            setHover((current) =>
                              current
                                ? { ...current, x: event.clientX, y: event.clientY }
                                : current,
                            );
                          }}
                          onMouseLeave={() => setHover(null)}
                          onClick={() => {
                            if (row) {
                              setLockedId(row.id);
                              setConfirmOpen(false);
                            }
                          }}
                          onKeyDown={(event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && row) {
                              event.preventDefault();
                              setLockedId(row.id);
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 flex gap-2 text-[10px] font-semibold">
            <span className="rounded-pill bg-mint px-2 py-0.5 text-white">≥75%</span>
            <span className="rounded-pill bg-amber px-2 py-0.5 text-white">45–74%</span>
            <span className="rounded-pill bg-rose px-2 py-0.5 text-white">&lt;45%</span>
            <span className="rounded-pill border border-line bg-surface px-2 py-0.5 text-ink-muted">
              {hi ? 'कोई टेलीमेट्री नहीं' : 'No telemetry'}
            </span>
          </div>
        </div>
      </div>

      <aside className="nd-card flex min-h-[360px] flex-col p-4">
        {!lockedId ? (
          <EmptyAdmin hi={hi} />
        ) : detailLoading ? (
          <div className="space-y-3" aria-busy>
            <div className="nd-skeleton h-8 w-2/3" />
            <div className="nd-skeleton h-24 w-full" />
            <div className="nd-skeleton h-32 w-full" />
          </div>
        ) : detailError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-ink-soft">{detailError}</p>
            <Button variant="ghost" onClick={() => lockedId && setLockedId(lockedId)}>
              {hi ? 'फिर कोशिश' : 'Retry'}
            </Button>
          </div>
        ) : selected ? (
          <AdminPanel
            hi={hi}
            row={selected}
            detail={detail}
            canDispatch={canDispatch}
            confirmOpen={confirmOpen}
            dispatching={dispatching}
            onAsk={() => setConfirmOpen(true)}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => void onDispatch()}
          />
        ) : null}
      </aside>

      <AnimatePresence>
        {hover ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: easings.civic }}
            className="nd-glass pointer-events-none fixed z-30 max-w-xs px-3 py-2 text-xs text-ink shadow-lift"
            style={{ left: Math.min(hover.x + 12, window.innerWidth - 280), top: hover.y + 12 }}
            role="tooltip"
          >
            <p className="font-semibold">
              {hover.name || (hi ? 'अज्ञात ज़िला' : 'Unnamed district')}
            </p>
            <p className="text-ink-muted">{hover.state}</p>
            {hover.row ? (
              <ul className="mt-1 space-y-0.5 text-ink-soft">
                <li>
                  {hi ? 'कैटलॉग योजनाएँ' : 'Catalog schemes'}: {hover.row.catalog_schemes ?? hover.row.national_schemes}
                </li>
                <li>
                  {hi ? 'राज्य-संबद्ध / राष्ट्रीय' : 'State-linked / national'}: {hover.row.published_schemes} / {hover.row.national_schemes}
                </li>
                <li>
                  {hi ? 'इंटर्नशिप / छात्रवृत्ति' : 'Internships / scholarships'}: {hover.row.internships} / {hover.row.scholarships}
                </li>
                <li>
                  {hi ? 'सहमति प्रोफ़ाइल' : 'Consented profiles'}: {hover.row.consented_profiles}
                </li>
                <li>
                  {hi ? 'अलर्ट' : 'Alerts'}: {hover.row.alerts}
                </li>
                <li className="text-[10px] text-ink-muted">{hover.row.bottleneck}</li>
              </ul>
            ) : (
              <p className="mt-1 text-ink-muted">
                {hi ? 'इस बहुभुज से कोई कैटलॉग पंक्ति नहीं जुड़ी।' : 'No catalog row joined to this polygon.'}
              </p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              'fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-pill px-4 py-2 text-sm font-semibold text-white shadow-lift',
              toast.kind === 'ok' ? 'bg-mint' : 'bg-rose',
            )}
            role="status"
          >
            {toast.text}
            <button type="button" className="ml-3 underline" onClick={() => setToast(null)}>
              {hi ? 'ठीक' : 'OK'}
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function EmptyAdmin({ hi }: { hi: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-canvas-deep text-ink-muted">
        <MapPin className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-ink">{hi ? 'ज़िला चुनें' : 'Select a district'}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        {hi
          ? 'मानचित्र पर ज़िले पर क्लिक करें। गिनती केवल PostgreSQL से आएगी।'
          : 'Click a district on the map. Counts come only from PostgreSQL.'}
      </p>
    </div>
  );
}

function AdminPanel({
  hi,
  row,
  detail,
  canDispatch,
  confirmOpen,
  dispatching,
  onAsk,
  onCancel,
  onConfirm,
}: {
  hi: boolean;
  row: DistrictMetricRow;
  detail: DistrictDetail | null;
  canDispatch: boolean;
  confirmOpen: boolean;
  dispatching: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const heatmap = detail?.heatmap;
  const maxCell = Math.max(0, ...(heatmap?.cells.flat() ?? [0]));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="nd-eyebrow">{hi ? row.state_name_hi : row.state_name}</p>
        <h3 className="text-headline">{hi ? row.name_hi : row.name}</h3>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <Stat
          label={hi ? 'कैटलॉग योजनाएँ' : 'Catalog schemes'}
          value={row.catalog_schemes ?? row.national_schemes}
        />
        <Stat
          label={hi ? 'राज्य-संबद्ध / राष्ट्रीय' : 'State-linked / national'}
          value={`${row.published_schemes} / ${row.national_schemes}`}
        />
        <Stat label={hi ? 'इंटर्नशिप' : 'Internships'} value={row.internships} />
        <Stat label={hi ? 'छात्रवृत्ति' : 'Scholarships'} value={row.scholarships} />
        <Stat label={hi ? 'अलर्ट' : 'Alerts'} value={row.alerts} />
        <Stat
          label={hi ? 'लक्ष्य / नामांकित' : 'Target / enrolled'}
          value={`${dash(detail?.target_population)} / ${dash(detail?.enrolled)}`}
          caption={detail?.population_note ?? (hi ? 'आवेदन रजिस्ट्री नहीं' : 'Not tracked (no application registry)')}
        />
      </dl>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {hi ? '5-चरण आवेदन फ़नल' : '5-stage application funnel'}
        </h4>
        <ol className="mt-2 space-y-1.5">
          {(detail?.application_funnel ?? []).map((stage, index) => (
            <li key={stage.stage} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
              <span>
                {index + 1}. {stage.stage}
              </span>
              <span className="nd-numeric text-ink-muted">{dash(stage.count)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[11px] text-ink-muted">{detail?.application_funnel_note}</p>
        {detail?.dossier_stages?.length ? (
          <div className="mt-3 rounded-xl border border-dashed border-line px-3 py-2">
            <p className="text-[11px] font-semibold text-ink-soft">{hi ? 'डोज़ियर चरण (प्रॉक्सी)' : 'Dossier stages (proxy)'}</p>
            <p className="mt-1 text-[11px] text-ink-muted">{detail.dossier_note}</p>
            <ul className="mt-1 flex flex-wrap gap-2 text-xs">
              {detail.dossier_stages.map((stage) => (
                <li key={stage.stage} className="nd-chip">
                  {stage.stage}: {stage.count}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {hi ? 'आयु × आय' : 'Age × income'}
        </h4>
        {!heatmap || heatmap.sparse ? (
          <p className="mt-2 text-[11px] text-ink-muted">
            {heatmap?.note ?? (hi ? 'सहमति प्रोफ़ाइल बहुत कम हैं।' : 'Too few consented profiles for a dense heatmap.')}
          </p>
        ) : null}
        {heatmap ? (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[240px] border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="p-1 text-left font-medium text-ink-muted"> </th>
                  {heatmap.income_bins.map((label) => (
                    <th key={label} className="p-1 font-medium text-ink-muted">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.age_bins.map((age, rowIndex) => (
                  <tr key={age}>
                    <th className="p-1 text-left font-medium text-ink-muted">{age}</th>
                    {heatmap.cells[rowIndex]?.map((count, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        className="p-0.5 text-center"
                        style={{
                          background:
                            count === 0
                              ? 'rgb(243 238 228)'
                              : `rgb(14 159 110 / ${0.18 + (maxCell ? count / maxCell : 0) * 0.72})`,
                          color: count === 0 ? '#63739A' : '#0B1B3A',
                        }}
                      >
                        {count || '·'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-[10px] text-ink-muted">
              n={heatmap.sample_size}. {heatmap.note}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 border-t border-line pt-3">
        {!canDispatch ? (
          <p className="text-[11px] text-ink-muted">
            {hi
              ? 'अतिथि शिविर नहीं भेज सकते। कल्याण अधिकारी के रूप में साइन इन करें।'
              : 'Guest cannot dispatch. Sign in as a welfare officer — no fake SMS gateway.'}
          </p>
        ) : null}
        {confirmOpen ? (
          <div className="rounded-xl border border-amber/40 bg-amber-soft/40 p-3 text-sm">
            <p>
              {hi
                ? `${row.name} के CSC संचालकों को इन-ऐप सूचना? एसएमएस नहीं।`
                : `Notify CSC operators for ${row.name}? In-app alert only — no SMS.`}
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="primary" disabled={dispatching} onClick={onConfirm}>
                {dispatching ? (hi ? 'भेज रहे…' : 'Dispatching…') : hi ? 'पुष्टि' : 'Confirm'}
              </Button>
              <Button variant="ghost" onClick={onCancel}>
                {hi ? 'रद्द' : 'Cancel'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="saffron" disabled={!canDispatch} onClick={onAsk} className="w-full">
            <Radio className="h-4 w-4" />
            {hi ? 'लक्षित CSC शिविर भेजें' : 'Dispatch Targeted CSC Camp'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, caption }: { label: string; value: string | number; caption?: string }) {
  return (
    <div className="rounded-xl border border-line bg-canvas px-3 py-2">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="nd-numeric mt-0.5 text-base font-semibold text-ink">{value}</dd>
      {caption ? <p className="mt-1 text-[10px] leading-snug text-ink-muted">{caption}</p> : null}
    </div>
  );
}

export default WelfareGisConsole;
