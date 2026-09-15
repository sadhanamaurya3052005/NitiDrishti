'use client';

import { useEffect, useState } from 'react';

/**
 * Real connectivity state. Offline handling matters here because the platform
 * is meant to work at rural kiosks with unstable links. The PWA caches the
 * shell when a service worker is registered.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
