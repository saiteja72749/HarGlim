import { useSyncExternalStore } from 'react';
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function useHydration() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
