import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { UserContextData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  headers: {
    'Content-Type': 'application/json',
  },
});

const GET_CACHE_MS = 30 * 1000;
const inflightGetRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, { response: any; expiresAt: number }>();

const getCacheKey = (url?: string, params?: any) => {
  const serializedParams = params ? JSON.stringify(params, Object.keys(params).sort()) : '';
  return `${url || ''}?${serializedParams}`;
};

export function invalidateApiCache(match: string | RegExp) {
  for (const key of responseCache.keys()) {
    const matched = typeof match === 'string' ? key.includes(match) : match.test(key);
    if (matched) {
      responseCache.delete(key);
      inflightGetRequests.delete(key);
    }
  }
}

const rawGet = api.get.bind(api);
api.get = ((url: string, config: any = {}) => {
  const noStore = config?.cache === 'no-store' || config?.headers?.['Cache-Control'] === 'no-store';
  const cacheKey = getCacheKey(url, config?.params);

  if (!noStore) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.response);
    }

    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) {
      return inflight;
    }
  }

  const request = rawGet(url, {
    ...config,
    metadata: { ...(config?.metadata || {}), cacheKey },
  })
    .then((response) => {
      if (response.status === 304) {
        const cached = responseCache.get(cacheKey);
        if (cached) return cached.response;
      }
      if (!noStore && response.status >= 200 && response.status < 300) {
        responseCache.set(cacheKey, { response, expiresAt: Date.now() + GET_CACHE_MS });
      }
      return response;
    })
    .finally(() => {
      inflightGetRequests.delete(cacheKey);
    });

  if (!noStore) {
    inflightGetRequests.set(cacheKey, request);
  }

  return request;
}) as typeof api.get;

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor to add JWT token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const state = useAuthStore.getState();
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 token refresh
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url || '';

    if (method && method !== 'get') {
      const baseResource = url.split('?')[0].split('/').slice(0, 3).join('/');
      if (baseResource) invalidateApiCache(baseResource);
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/google') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, login, user } = useAuthStore.getState();

      if (!refreshToken) {
        logout();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data?.data?.token || data?.token;
        const newRefreshToken = data?.data?.refreshToken || data?.refreshToken || refreshToken;
        const expiresAt = data?.data?.refreshTokenExpiresAt || data?.refreshTokenExpiresAt;

        if (newAccessToken && user) {
          login(user, newAccessToken, newRefreshToken, expiresAt);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('Refresh response missing token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    const status = error.response?.status;
    const method = originalRequest?.method?.toUpperCase?.() || 'REQUEST';
    const url = originalRequest?.url || 'unknown URL';

    if (typeof window !== 'undefined') {
      if (error.name === 'CanceledError' || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.info(`[api] AbortError: frontend cancelled ${method} ${url}`);
      } else if (status === 401) {
        console.warn(`[api] 401 expired/missing token for ${method} ${url}`);
      } else if (status === 403) {
        const errorCode = error.response?.data?.error;
        console.warn(`[api] 403 ${errorCode || 'insufficient permission'} for ${method} ${url}`);
        if (errorCode === 'AUTHOR_DASHBOARD_ACCESS_REQUIRED') {
          // Should not happen for an approved author while paid access is disabled:
          // the cached context is stale, so refresh it instead of showing a paywall.
          if (!url.includes('/users/me/context')) bootstrapUserContext();
        } else if (errorCode === 'AUTHOR_ROLE_REQUIRED') {
          toast.error('This area is for approved authors only.', { id: 'author-role-required' });
        } else {
          toast.error(
            url.startsWith('/admin') ? 'Admin access required.' : 'You do not have permission to do that.',
            { id: 'permission-denied' }
          );
        }
      } else if (status === 409 && error.response?.data?.error === 'AUTHOR_DASHBOARD_PAID_ACCESS_DISABLED') {
        // Expected configuration response, not a failure: the dashboard is free.
        console.info(`[api] 409 paid author dashboard access disabled for ${method} ${url}`);
      } else if (status === 429) {
        console.warn(`[api] 429 too many requests for ${method} ${url}`);
        toast.error('Too many requests. Please wait a few seconds and try again.', {
          id: 'rate-limit-toast',
        });
      } else if (status >= 500) {
        console.error(`[api] ${status} backend/server failure for ${method} ${url}`);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Bootstrap / Sync User Context (Capabilities, States, User info)
 * Call this immediately after Google or Password login.
 */
let contextRequest: Promise<UserContextData | null> | null = null;

export async function bootstrapUserContext(overrideToken?: string): Promise<UserContextData | null> {
  // Collapse concurrent callers (layout mount + page action) into one request.
  if (contextRequest && !overrideToken) return contextRequest;

  const { setContextStatus } = useAuthStore.getState();
  setContextStatus('loading');

  const request = (async () => {
    try {
      const headers: Record<string, string> = {};
      if (overrideToken) {
        headers.Authorization = `Bearer ${overrideToken}`;
      }

      // no-store: role/capabilities change on admin approval and must never come from the GET cache.
      const { data } = await api.get('/users/me/context', { headers, cache: 'no-store' } as any);
      const contextData: UserContextData = data?.data || data;

      if (contextData && contextData.capabilities) {
        useAuthStore.getState().setUserContext(contextData);
        setContextStatus('ready');
        return contextData;
      }
      setContextStatus('error');
      return null;
    } catch (error) {
      console.error('Failed to fetch user context:', error);
      setContextStatus('error');
      return null;
    } finally {
      contextRequest = null;
    }
  })();

  contextRequest = request;
  return request;
}

export default api;
