'use client';
import { useCallback, useSyncExternalStore } from 'react';
import type { UseEmblaCarouselType } from 'embla-carousel-react';

const zero = () => 0;
const no = () => false;

/** Subscribe to Embla as an external system, including reinitialization and cleanup. */
export function useCarouselState(api: UseEmblaCarouselType[1]) {
  const subscribe = useCallback((changed: () => void) => {
    if (!api) return () => {};
    api.on('select', changed);
    api.on('reInit', changed);
    return () => { api.off('select', changed); api.off('reInit', changed); };
  }, [api]);
  const index = useCallback(() => api?.selectedScrollSnap() ?? 0, [api]);
  const prev = useCallback(() => api?.canScrollPrev() ?? false, [api]);
  const next = useCallback(() => api?.canScrollNext() ?? false, [api]);
  return {
    selectedIndex: useSyncExternalStore(subscribe, index, zero),
    canScrollPrev: useSyncExternalStore(subscribe, prev, no),
    canScrollNext: useSyncExternalStore(subscribe, next, no),
  };
}
