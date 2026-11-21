'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (changed: () => void) => {
  window.addEventListener('online', changed);
  window.addEventListener('offline', changed);
  return () => { window.removeEventListener('online', changed); window.removeEventListener('offline', changed); };
};
const snapshot = () => navigator.onLine;
const serverSnapshot = () => true;

export function NetworkStatus() {
  const online = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (online) return null;
  return <div role="alert" className="fixed top-0 left-0 right-0 z-[110] border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950">You are offline. Reconnect before loading new information or saving changes.</div>;
}
