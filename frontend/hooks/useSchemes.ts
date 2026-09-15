'use client';

import { useEffect, useState } from 'react';

import { getSchemes } from '@/lib/api_client';
import type { SchemeRecord } from '@/types';

export function useSchemes(params?: { category?: string; q?: string }) {
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [source, setSource] = useState<'api' | 'catalog'>('catalog');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    void getSchemes(params)
      .then((result) => {
        if (cancelled) return;
        setSchemes(result.schemes);
        setSource(result.source);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setSchemes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params?.category, params?.q]);

  return { schemes, source, loading, error };
}
