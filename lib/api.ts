
import { describeApiError } from "@/lib/api-error";
import axios, { type AxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { UserContextData } from '@/types';
import { isTrustedApiTarget } from '@/lib/api-origin';
import { record } from '@/lib/api-error';
import { createPublicApiCache } from '@/lib/public-api-cache';
import { notifyLiveChange, onLiveChange } from '@/lib/live-sync';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  validateStatus: (status) => status >= 200 && status < 300,
});

const rawGet = api.get.bind(api);
const publicCache = createPublicApiCache(rawGet, (url, config) => {
  const params = new URL(api.getUri({ url, params: config.params })).searchParams;
  params.sort();
  return `${url.split('?')[0]}?${params.toString()}`;
});

export const getPublic = publicCache.get;
export const invalidateApiCache = publicCache.invalidate;

if (typeof window !== 'undefined') {
  onLiveChange('books', (reason) => {
    if (reason === 'change') {
      invalidateApiCache('/books');
      invalidateApiCache('/search');
      invalidateApiCache('/authors');
    }
  });
}

api.get = ((url: string, config: AxiosRequestConfig = {}) => {
  const headers = config.headers;
  const cacheControl = headers instanceof axios.AxiosHeaders
    ? headers.get('Cache-Control')
    : headers?.['Cache-Control'] ?? headers?.['cache-control'];
  const noStore = config.cache === 'no-store' || cacheControl === 'no-store';
  return rawGet(url, noStore ? {
    ...config,
    adapter: config.adapter ?? 'fetch',
    fetchOptions: { ...config.fetchOptions, cache: 'no-store' },
  } : config);
}) as typeof api.get;

let isRefreshing = false;
let refreshingSessionToken: string | null = null;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
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
    if ((config.baseURL || API_URL).replace(/\/$/, '') !== API_URL.replace(/\/$/, '')) throw new Error('The request base URL cannot override the configured backend API.');
    if (!isTrustedApiTarget(config.url || '', API_URL)) throw new Error('The request target is outside the configured backend API.');
    if (typeof window !== 'undefined' && !config.publicRead) {
      const state = useAuthStore.getState();
      if (state.token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    // The browser must set the multipart boundary for uploads.
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      config.headers.setContentType(false);
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
      const resource = url.replace(/^\/admin(?=\/)/, '').split(/[/?]/)[1];
      if (resource) invalidateApiCache(`/${resource}`);
      if (resource === 'books' && /^\/(?:admin\/)?books(?:\/[^/?]+)?(?:\?|$)/.test(url)) {
        invalidateApiCache('/search');
        notifyLiveChange('books');
      }
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest && !originalRequest._retry && !originalRequest.publicRead &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/google') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      const currentSession = useAuthStore.getState();
      const canReplay = /^(get|head|options)$/i.test(originalRequest.method ?? 'get');
      originalRequest._retry = true;
      if (isRefreshing) {
        if (currentSession.refreshToken !== refreshingSessionToken) {
          return Promise.reject(error);
        }
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return canReplay ? api(originalRequest) : Promise.reject(error);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      const { refreshToken, logout, login, user } = currentSession;

      if (!refreshToken) {
        logout();
        isRefreshing = false;
        return Promise.reject(error);
      }
      refreshingSessionToken = refreshToken;

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { timeout: 15_000 });
        const newAccessToken = data?.data?.token || data?.token;
        const newRefreshToken = data?.data?.refreshToken || data?.refreshToken || refreshToken;
        const expiresAt = data?.data?.refreshTokenExpiresAt || data?.refreshTokenExpiresAt;

        if (useAuthStore.getState().refreshToken !== refreshToken) {
          throw new Error('Session changed during token refresh');
        }

        if (newAccessToken && user) {
          login(user, newAccessToken, newRefreshToken, expiresAt);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return canReplay ? api(originalRequest) : Promise.reject(error);
        } else {
          throw new Error('Refresh response missing token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        if (useAuthStore.getState().refreshToken === refreshToken) {
          logout();
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
        refreshingSessionToken = null;
      }
    }

    const status = error.response?.status;
    const method = originalRequest?.method?.toUpperCase?.() || 'REQUEST';
    const url = originalRequest?.url || 'unknown URL';
    if (status === 401 && originalRequest?._retry) {
      const current = useAuthStore.getState();
      if (current.token && originalRequest.headers?.Authorization === `Bearer ${current.token}`) {
        void current.logout();
      }
    }

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
          if (!url.includes('/users/me/context')) void bootstrapUserContext();
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
        console.warn('[api] Rate-limited request', { method, requestId: describeApiError(error).response?.headers['x-request-id'] });
        if (!originalRequest?.publicRead) {
          toast.error('Too many requests. Please wait before trying again.', { id: 'rate-limit-toast' });
        }
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
let contextRequest: {
  token: string;
  promise: Promise<UserContextData | null>;
} | null = null;

export async function bootstrapUserContext(overrideToken?: string): Promise<UserContextData | null> {
  const requestToken = overrideToken || useAuthStore.getState().token;
  if (!requestToken) return null;
  if (contextRequest?.token === requestToken) return contextRequest.promise;

  const { setContextStatus } = useAuthStore.getState();
  setContextStatus('loading');

  const request = (async () => {
    try {
      const headers: Record<string, string> = {};
      if (overrideToken) {
        headers.Authorization = `Bearer ${overrideToken}`;
      }

      // no-store: role/capabilities change on admin approval and must never come from the GET cache.
      const { data } = await api.get('/users/me/context', { headers, cache: 'no-store' });
      const contextData: UserContextData = data?.data || data;
      const contextRecord = record(contextData), backendUser = record(contextRecord.user), capabilities = record(contextRecord.capabilities);
      if (!['reader', 'author', 'admin', 'visitor'].includes(String(backendUser.role)) || typeof backendUser.isActive !== 'boolean' || typeof (backendUser._id || backendUser.id) !== 'string' || !['canPublish', 'canAccessAuthorDashboard', 'canAdminister'].every((key) => typeof capabilities[key] === 'boolean')) throw new Error('The backend returned an invalid session context.');

      if (useAuthStore.getState().token !== requestToken) return null;

      if (contextData && contextData.capabilities) {
        useAuthStore.getState().setUserContext(contextData);
        setContextStatus('ready');
        return contextData;
      }
      setContextStatus('error');
      return null;
    } catch (error) {
      const current = useAuthStore.getState();
      if (current.token === requestToken) {
        const failure = describeApiError(error);
        const code = failure.response?.data.error;
        if (failure.response?.status === 403 && (code === 'USER_INACTIVE' || code === 'ACCOUNT_DISABLED')) {
          current.logout({ revoke: false });
          toast.error('Your account is inactive. Contact support for assistance.', { id: 'inactive-account' });
          return null;
        }
        console.error('Failed to fetch user context:', failure);
        setContextStatus('error');
      }
      return null;
    }
  })();

  contextRequest = { token: requestToken, promise: request };
  try {
    return await request;
  } finally {
    if (contextRequest?.promise === request) contextRequest = null;
  }
}

export default api;
