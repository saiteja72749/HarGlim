'use client';

import { useCallback, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useAuthStore } from '@/store/auth-store';
import { describeApiError, type ApiFailure } from '@/lib/api-error';

/** Real backend resources with session-scoped, memory-only request state. */
export function useApiResource<T>(key: string | readonly unknown[] | null, fetcher: () => Promise<T>, privateResource = true) {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);
  const scopedKey = key === null || (privateResource && !token) ? null
    : privateResource ? ['authenticated', userId, token, key] : ['public', key];
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const active = scopedKey !== null;
  useEffect(() => () => clearTimeout(retryTimer.current), [active, token, userId]);
  const resource = useSWR<T, ApiFailure>(scopedKey, async () => {
    try {
      const data = await fetcher();
      const current = useAuthStore.getState();
      if (privateResource && (current.token !== token || (current.user?._id || current.user?.id) !== userId)) throw new Error('The session changed during this request.');
      return data;
    } catch (error) { throw describeApiError(error); }
  }, {
    dedupingInterval: 15_000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: (error) => error.response?.status === 429,
    onErrorRetry(error, _key, _config, revalidate, options) {
      if (options.retryCount > 1 || !error.retryAt) return;
      const delay = Math.max(1000, error.retryAt - Date.now());
      if (delay > 120_000) return;
      clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => {
        if (privateResource && useAuthStore.getState().token !== token) return;
        void revalidate({ ...options, dedupe: true });
      }, delay);
    },
    keepPreviousData: !privateResource,
  });
  const mutate = resource.mutate;
  const reload = useCallback(() => mutate().catch(() => undefined), [mutate]);
  return { ...resource, loading: resource.isLoading || resource.isValidating, reload };
}
