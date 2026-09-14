'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  CONTRAST_STORAGE_KEY,
  FONT_STORAGE_KEY,
  type ContrastMode,
  type FontScale,
} from '@/lib/config';

interface A11yContextValue {
  font: FontScale;
  contrast: ContrastMode;
  setFont: (font: FontScale) => void;
  setContrast: (contrast: ContrastMode) => void;
  toggleContrast: () => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

export function A11yProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontScale>('md');
  const [contrast, setContrastState] = useState<ContrastMode>('default');

  useEffect(() => {
    const storedFont = window.localStorage.getItem(FONT_STORAGE_KEY);
    const storedContrast = window.localStorage.getItem(CONTRAST_STORAGE_KEY);
    if (storedFont === 'sm' || storedFont === 'md' || storedFont === 'lg') {
      setFontState(storedFont);
    }
    if (storedContrast === 'default' || storedContrast === 'high') {
      setContrastState(storedContrast);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.font = font;
    window.localStorage.setItem(FONT_STORAGE_KEY, font);
  }, [font]);

  useEffect(() => {
    document.documentElement.dataset.contrast = contrast;
    window.localStorage.setItem(CONTRAST_STORAGE_KEY, contrast);
  }, [contrast]);

  const setFont = useCallback((next: FontScale) => setFontState(next), []);
  const setContrast = useCallback((next: ContrastMode) => setContrastState(next), []);
  const toggleContrast = useCallback(() => {
    setContrastState((current) => (current === 'default' ? 'high' : 'default'));
  }, []);

  const value = useMemo(
    () => ({ font, contrast, setFont, setContrast, toggleContrast }),
    [font, contrast, setFont, setContrast, toggleContrast],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y(): A11yContextValue {
  const context = useContext(A11yContext);
  if (!context) throw new Error('useA11y must be used inside A11yProvider');
  return context;
}
