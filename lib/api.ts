import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth-store';
import { UserContextData } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 25000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  (response) => response,
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

    if (typeof window !== 'undefined') {
      if (status === 403) {
        toast.error('Admin access required or permission denied.', { id: 'admin-access-required' });
      } else if (status === 429) {
        toast.error('Too many requests. Please wait a few seconds and try again.', {
          id: 'rate-limit-toast',
        });
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Bootstrap / Sync User Context (Capabilities, States, User info)
 * Call this immediately after Google or Password login.
 */
export async function bootstrapUserContext(overrideToken?: string): Promise<UserContextData | null> {
  try {
    const headers: Record<string, string> = {};
    if (overrideToken) {
      headers.Authorization = `Bearer ${overrideToken}`;
    }
    
    const { data } = await api.get('/users/me/context', { headers });
    const contextData: UserContextData = data?.data || data;

    if (contextData && contextData.capabilities) {
      useAuthStore.getState().setUserContext(contextData);
      return contextData;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch user context:', error);
    return null;
  }
}

/**
 * Categories change rarely, but nearly every page (home, books catalog,
 * categories index, admin book forms) fetches them independently on mount.
 * This caches the resolved list in memory for a short window so navigating
 * between those pages doesn't re-issue the same request every time.
 */
let categoriesCache: { data: any[]; expiresAt: number } | null = null;
const CATEGORIES_CACHE_MS = 5 * 60 * 1000;

export async function getCachedCategories(): Promise<any[]> {
  if (categoriesCache && categoriesCache.expiresAt > Date.now()) {
    return categoriesCache.data;
  }
  const { data } = await api.get('/categories');
  const items = data?.data?.categories || data?.data || data || [];
  const list = Array.isArray(items) ? items : [];
  categoriesCache = { data: list, expiresAt: Date.now() + CATEGORIES_CACHE_MS };
  return list;
}

export default api;
