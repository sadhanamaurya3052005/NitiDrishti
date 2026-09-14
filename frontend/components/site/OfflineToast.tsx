'use client';

import { usePwa } from '@/components/providers/PwaProvider';
import { useLocale } from '@/components/providers/LocaleProvider';

export function OfflineToast() {
  const { online } = usePwa();
  const { locale } = useLocale();
  if (online) return null;

  return (
    <div className="nd-no-print pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
      <p className="rounded-pill border border-amber/40 bg-surface/95 px-4 py-2 text-xs font-semibold text-amber-deep shadow-lift backdrop-blur">
        {locale === 'hi'
          ? 'नेटवर्क नहीं। लोकल AST और IndexedDB सक्रिय।'
          : 'Network disconnected. Local AST and IndexedDB cache active.'}
      </p>
    </div>
  );
}
