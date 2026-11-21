'use client';

import { useCallback } from 'react';
import useSWR from 'swr';
import { useAuthStore } from '@/store/auth-store';
import { describeApiError, type ApiFailure } from '@/lib/api-error';

/** Real backend resources with session-scoped, memory-only request state. */
export function useApiResource<T>(key: string | readonly unknown[] | null, fetcher: () => Promise<T>, privateResource = true) {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);
  const scopedKey = key === null || (privateResource && !token) ? null
    : privateResource ? ['authenticated', userId, token, key] : ['public', key];
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
    shouldRetryOnError: false,
    keepPreviousData: !privateResource,
  });
  const mutate = resource.mutate;
  const reload = useCallback(() => mutate().catch(() => undefined), [mutate]);
  return { ...resource, loading: resource.isLoading || resource.isValidating, reload };
}
