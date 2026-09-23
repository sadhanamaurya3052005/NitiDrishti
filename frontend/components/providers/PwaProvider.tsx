'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  catalogCacheOptedOut,
  offlineCatalogFeatureOn,
  serviceWorkerSupported,
  setCatalogCacheOptOut,
} from '@/lib/offline/catalogCache';

interface PwaContextValue {
  online: boolean;
  workerReady: boolean;
  installAvailable: boolean;
  catalogCacheEnabled: boolean;
  optedOut: boolean;
  setOptOut: (optOut: boolean) => void;
  install: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

async function unregisterWorkers(): Promise<void> {
  if (!serviceWorkerSupported()) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((reg) => reg.unregister()));
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [workerReady, setWorkerReady] = useState(false);
  const [optedOut, setOptedOutState] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const featureOn = offlineCatalogFeatureOn();

  useEffect(() => {
    setOnline(navigator.onLine);
    setOptedOutState(catalogCacheOptedOut());
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  useEffect(() => {
    if (!serviceWorkerSupported()) {
      setWorkerReady(false);
      return;
    }
    const allow = featureOn && !optedOut;
    if (!allow) {
      void unregisterWorkers().then(() => setWorkerReady(false));
      return;
    }
    void navigator.serviceWorker
      .register('/sw.js')
      .then(() => setWorkerReady(true))
      .catch(() => {
        setWorkerReady(false);
      });
  }, [featureOn, optedOut]);

  const setOptOut = useCallback((next: boolean) => {
    setCatalogCacheOptOut(next);
    setOptedOutState(next);
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      online,
      workerReady,
      installAvailable: Boolean(installEvent),
      catalogCacheEnabled: featureOn && !optedOut,
      optedOut,
      setOptOut,
      install: async () => {
        if (!installEvent) return;
        await installEvent.prompt();
        setInstallEvent(null);
      },
    }),
    [featureOn, installEvent, online, optedOut, setOptOut, workerReady],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext);
  if (!context) throw new Error('usePwa must be used inside PwaProvider');
  return context;
}
