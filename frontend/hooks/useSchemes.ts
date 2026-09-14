'use client';

import { useEffect, useState } from 'react';

import { getSchemes } from '@/lib/api_client';
import { OFFICIAL_SCHEME_CATALOG } from '@/lib/schemes/catalog';
import type { SchemeRecord } from '@/types';

export function useSchemes(params?: { category?: string; q?: string }) {
  const [schemes, setSchemes] = useState<SchemeRecord[]>(OFFICIAL_SCHEME_CATALOG);
  const [source, setSource] = useState<'api' | 'catalog'>('catalog');

  useEffect(() => {
    let cancelled = false;
    void getSchemes(params).then((result) => {
      if (cancelled) return;
      setSchemes(result.schemes);
      setSource(result.source);
    });
    return () => {
      cancelled = true;
    };
  }, [params?.category, params?.q]);

  return { schemes, source };
}
