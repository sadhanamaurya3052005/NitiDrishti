'use client';

import { usePwa } from '@/components/providers/PwaProvider';
import { useLocale } from '@/components/providers/LocaleProvider';

export function OfflineToast() {
  const { online, workerReady, catalogCacheEnabled } = usePwa();
  const { locale } = useLocale();
  if (online) return null;

  const snapshot =
    workerReady && catalogCacheEnabled
      ? locale === 'hi'
        ? 'नेटवर्क नहीं। पिछली सफल कैटलॉग प्राप्ति ऑफ़लाइन पढ़ी जा सकती है। पात्रता के लिए API चाहिए।'
        : 'Network disconnected. A catalog snapshot from the last successful fetch may be readable. Eligibility still needs the API.'
      : locale === 'hi'
        ? 'नेटवर्क नहीं। कैटलॉग स्नैपशॉट उपलब्ध नहीं — IndexedDB में केवल कियोस्क कतार हो सकती है।'
        : 'Network disconnected. No catalog snapshot on this device — IndexedDB may hold a kiosk queue.';

  return (
    <div className="nd-no-print pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
      <p className="rounded-pill border border-amber/40 bg-surface/95 px-4 py-2 text-xs font-semibold text-amber-deep shadow-lift backdrop-blur">
        {snapshot}
      </p>
    </div>
  );
}
