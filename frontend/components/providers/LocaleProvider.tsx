'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from '@/lib/config';
import { APP_COPY, type AppCopy } from '@/lib/i18n/app';
import { DESK_COPY, type DeskCopy } from '@/lib/i18n/desks';
import { HOME_COPY, type HomeCopy } from '@/lib/i18n/home';
import { LANDING_COPY, type LandingCopy } from '@/lib/i18n/landing';
import { SHOWCASE_COPY, type ShowcaseCopy } from '@/lib/i18n/showcase';

interface LocaleContextValue {
  locale: Locale;
  /** Copy for the public entry experience. */
  copy: LandingCopy;
  home: HomeCopy;
  showcase: ShowcaseCopy;
  /** Copy for the application shell. */
  app: AppCopy;
  desk: DeskCopy;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Bilingual state for the whole app. Hindi and English are a requirement, not a
 * setting, so the switch lives at the root and persists per browser.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'hi') {
      setLocaleState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => {
      const next: Locale = current === 'en' ? 'hi' : 'en';
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      copy: LANDING_COPY[locale],
      home: HOME_COPY[locale],
      showcase: SHOWCASE_COPY[locale],
      app: APP_COPY[locale],
      desk: DESK_COPY[locale],
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used inside <LocaleProvider>');
  }
  return context;
}
