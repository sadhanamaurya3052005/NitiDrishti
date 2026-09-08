'use client';

import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { SplashScreen } from '@/components/brand/SplashScreen';
import { SPLASH_SESSION_KEY } from '@/lib/config';

export const EMBLEM_LAYOUT_ID = 'nd-emblem';

interface SplashContextValue {
  /** True once the boot sequence has handed over to the application shell. */
  booted: boolean;
  emblemLayoutId: string;
}

const SplashContext = createContext<SplashContextValue>({
  booted: true,
  emblemLayoutId: EMBLEM_LAYOUT_ID,
});

/**
 * Owns the cinematic entry. The splash and the header share one emblem through
 * a Framer layout id, so the logo physically travels into the header instead of
 * the page cutting to a new screen.
 *
 * It plays once per browser session; repeat views are hidden before first paint
 * by the inline script in the root layout.
 */
export function SplashProvider({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SPLASH_SESSION_KEY) === '1') {
      setBooted(true);
    }
  }, []);

  const handleDone = useCallback(() => {
    window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    document.documentElement.classList.add('nd-splash-seen');
    setBooted(true);
  }, []);

  const value = useMemo<SplashContextValue>(
    () => ({ booted, emblemLayoutId: EMBLEM_LAYOUT_ID }),
    [booted],
  );

  return (
    <SplashContext.Provider value={value}>
      <LayoutGroup>
        <AnimatePresence>
          {!booted && <SplashScreen onDone={handleDone} emblemLayoutId={EMBLEM_LAYOUT_ID} />}
        </AnimatePresence>
        {children}
      </LayoutGroup>
    </SplashContext.Provider>
  );
}

export function useSplash(): SplashContextValue {
  return useContext(SplashContext);
}
