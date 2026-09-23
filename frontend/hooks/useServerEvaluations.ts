'use client';

import { useEffect, useMemo, useState } from 'react';

import type { CitizenProfile } from '@/components/providers/ExperienceProvider';
import {
  compareSchemes,
  evaluateEligibility,
  evaluateWhatIf,
  type EligibilityItem,
  type WhatIfHint,
} from '@/lib/api';
import { declaredFromProfile, profileKey } from '@/lib/eligibility/declared';
import type { SchemeEvaluation } from '@/lib/schemes/evaluate';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

function indexEvaluations(items: EligibilityItem[]): Record<string, SchemeEvaluation> {
  const next: Record<string, SchemeEvaluation> = {};
  for (const item of items) {
    const evaluation = item.evaluation;
    if (!evaluation) continue;
    if (evaluation.schemeId) next[evaluation.schemeId] = evaluation;
    if (item.scheme?.id) next[item.scheme.id] = evaluation;
  }
  return next;
}

export function useServerEvaluations(schemeIds: string[], profile: CitizenProfile) {
  const idsKey = useMemo(() => schemeIds.filter(Boolean).join(','), [schemeIds]);
  const facts = profileKey(profile);
  const [byId, setById] = useState<Record<string, SchemeEvaluation>>({});
  const [status, setStatus] = useState<EngineStatus>('idle');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (!ids.length) {
      setById({});
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === 'ready' ? current : 'loading'));
      void evaluateEligibility({
        scheme_ids: ids,
        profile: declaredFromProfile(profile),
      })
        .then((payload) => {
          if (cancelled) return;
          setById(indexEvaluations(payload.evaluations));
          setStatus('ready');
        })
        .catch(() => {
          if (cancelled) return;
          setById({});
          setStatus('error');
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // profile is read inside timeout via latest closure from facts/idsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, idsKey]);

  return { byId, status };
}

export function useServerCompare(leftId: string, rightId: string, profile: CitizenProfile) {
  const facts = profileKey(profile);
  const [byId, setById] = useState<Record<string, SchemeEvaluation>>({});
  const [status, setStatus] = useState<EngineStatus>('idle');

  useEffect(() => {
    if (!leftId || !rightId || leftId === rightId) {
      setById({});
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === 'ready' ? current : 'loading'));
      void compareSchemes({
        scheme_ids: [leftId, rightId],
        profile: declaredFromProfile(profile),
      })
        .then((payload) => {
          if (cancelled) return;
          setById(indexEvaluations(payload.items));
          setStatus('ready');
        })
        .catch(() => {
          if (cancelled) return;
          setById({});
          setStatus('error');
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, leftId, rightId]);

  return { byId, status };
}

export function useServerWhatIf(schemeId: string, profile: CitizenProfile) {
  const facts = profileKey(profile);
  const [evaluation, setEvaluation] = useState<SchemeEvaluation | null>(null);
  const [hints, setHints] = useState<WhatIfHint[]>([]);
  const [status, setStatus] = useState<EngineStatus>('idle');

  useEffect(() => {
    if (!schemeId) {
      setEvaluation(null);
      setHints([]);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === 'ready' ? current : 'loading'));
      void evaluateWhatIf({
        scheme_ids: [schemeId],
        profile: declaredFromProfile(profile),
      })
        .then((payload) => {
          if (cancelled) return;
          const item = payload.evaluations[0];
          setEvaluation(item?.evaluation ?? null);
          setHints(item?.hints ?? []);
          setStatus('ready');
        })
        .catch(() => {
          if (cancelled) return;
          setEvaluation(null);
          setHints([]);
          setStatus('error');
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts, schemeId]);

  return { evaluation, hints, status };
}
