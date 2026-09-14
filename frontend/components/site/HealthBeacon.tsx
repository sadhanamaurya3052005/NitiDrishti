'use client';

import { useCallback, useEffect, useState } from 'react';

import { getHealth } from '@/lib/api';
import { cn } from '@/lib/cn';
import { APP } from '@/lib/config';
import type { HealthResponse } from '@/types';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; health: HealthResponse; latencyMs: number }
  | { kind: 'unreachable'; latencyMs: number };

export function HealthBeacon({ compact = false, className }: { compact?: boolean; className?: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const probe = useCallback(async () => {
    const started = performance.now();
    try {
      const health = await getHealth();
      setState({ kind: 'ready', health, latencyMs: Math.round(performance.now() - started) });
    } catch {
      setState({ kind: 'unreachable', latencyMs: Math.round(performance.now() - started) });
    }
  }, []);

  useEffect(() => {
    void probe();
    const timer = window.setInterval(() => void probe(), 15000);
    return () => window.clearInterval(timer);
  }, [probe]);

  if (state.kind === 'loading') {
    return <span className={cn('nd-skeleton h-7 w-48', className)} aria-hidden />;
  }

  const ok = state.kind === 'ready' && state.health.database.connected;
  const postgis = state.kind === 'ready' && state.health.database.postgis_enabled;
  const version = state.kind === 'ready' ? state.health.version : APP.version;

  const label = ok
    ? compact
      ? `PostgreSQL${postgis ? ' + PostGIS' : ''} · v${version}`
      : `PostgreSQL connected${postgis ? ' · PostGIS' : ''} | v${version}`
    : state.kind === 'ready'
      ? `API up · database down | v${version}`
      : 'API unreachable';

  return (
    <button
      type="button"
      onClick={() => void probe()}
      title={state.kind === 'ready' ? `${state.health.environment} · ${state.latencyMs} ms` : 'Retry health probe'}
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-pill border px-2.5 py-1 text-[11px] font-semibold',
        ok
          ? 'border-mint/30 bg-mint-soft text-mint-deep'
          : 'border-rose/30 bg-rose-soft text-rose-deep',
        className,
      )}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-70',
            ok ? 'animate-ping bg-mint' : 'bg-rose',
          )}
        />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', ok ? 'bg-mint' : 'bg-rose')} />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

export default HealthBeacon;
