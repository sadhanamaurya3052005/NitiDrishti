'use client';

import { useEffect, useState } from 'react';

/**
 * Real connectivity state. CSC can queue dossiers in IndexedDB.
 * When the catalog service worker is registered, the last successful
 * published-scheme fetch may be readable offline. Eligibility still needs the API.
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
