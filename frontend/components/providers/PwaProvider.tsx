'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface PwaContextValue {
  online: boolean;
  workerReady: boolean;
  installAvailable: boolean;
  install: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue | null>(null);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [workerReady, setWorkerReady] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    if ('serviceWorker' in navigator) {
      const host = window.location.hostname;
      const local = host === 'localhost' || host === '127.0.0.1';
      if (local || process.env.NODE_ENV !== 'production') {
        void navigator.serviceWorker.getRegistrations().then((regs) =>
          Promise.all(regs.map((reg) => reg.unregister())),
        );
        void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
        setWorkerReady(false);
      } else {
        void navigator.serviceWorker.register('/sw.js').then(() => setWorkerReady(true)).catch(() => {
          setWorkerReady(false);
        });
      }
    }

    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('beforeinstallprompt', onPrompt);
    };
  }, []);

  const value = useMemo<PwaContextValue>(
    () => ({
      online,
      workerReady,
      installAvailable: Boolean(installEvent),
      install: async () => {
        if (!installEvent) return;
        await installEvent.prompt();
        setInstallEvent(null);
      },
    }),
    [installEvent, online, workerReady],
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa(): PwaContextValue {
  const context = useContext(PwaContext);
  if (!context) throw new Error('usePwa must be used inside PwaProvider');
  return context;
}
