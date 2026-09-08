'use client';

import { useCallback, useEffect, useState } from 'react';

import { getHealth } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { HealthResponse } from '@/types';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; health: HealthResponse }
  | { kind: 'unreachable' };

/**
 * Live backend probe. It reports exactly what /health returns — including the
 * "degraded" case where the API is up but PostgreSQL is not.
 */
export function BackendStatusPill({ className }: { className?: string }) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  const probe = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      setState({ kind: 'ready', health: await getHealth() });
    } catch {
      setState({ kind: 'unreachable' });
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  if (state.kind === 'loading') {
    return <span className={cn('nd-skeleton h-7 w-40', className)} aria-hidden />;
  }

  const unreachable = state.kind === 'unreachable';
  const dbConnected = !unreachable && state.health.database.connected;
  const tone = unreachable
    ? 'border-rose/25 bg-rose-soft text-rose-deep'
    : dbConnected
      ? 'border-mint/25 bg-mint-soft text-mint-deep'
      : 'border-amber/25 bg-amber-soft text-amber-deep';

  const label = unreachable
    ? 'API unreachable'
    : dbConnected
      ? `API ok · PostgreSQL${state.health.database.postgis_enabled ? ' + PostGIS' : ''}`
      : 'API ok · database down';

  return (
    <button
      type="button"
      onClick={() => void probe()}
      title={
        unreachable
          ? 'Start the backend: uvicorn app.main:app --reload'
          : `${state.health.app} ${state.health.version} · ${state.health.environment}`
      }
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs font-medium transition hover:brightness-[0.98]',
        tone,
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full opacity-70',
            unreachable ? 'bg-rose' : dbConnected ? 'animate-ping bg-mint' : 'bg-amber',
          )}
        />
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            unreachable ? 'bg-rose' : dbConnected ? 'bg-mint' : 'bg-amber',
          )}
        />
      </span>
      {label}
    </button>
  );
}

export default BackendStatusPill;
