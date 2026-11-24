import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { Role, UserContextData } from '@/types';
import { record } from '@/lib/api-error';

export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string;
  profilePicture?: string;
  bio?: string;
  emailVerified?: boolean;
  createdAt?: string;
  isActive?: boolean;
}

export type AuthStatus = 'idle' | 'authenticating' | 'context-loading' | 'authenticated' | 'error';
export type ContextStatus = 'idle' | 'loading' | 'ready' | 'error';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  userContext: UserContextData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authStatus: AuthStatus;
  /** Freshness of userContext in THIS page load (not persisted). The cached role can be stale until "ready". */
  contextStatus: ContextStatus;
  /** In-memory verification only; never trust this flag from persisted browser data. */
  contextVerified: boolean;
  
  // Actions
  login: (user: User, token: string, refreshToken?: string, refreshTokenExpiresAt?: string) => void;
  setUserContext: (context: UserContextData) => void;
  setAuthStatus: (status: AuthStatus) => void;
  setContextStatus: (status: ContextStatus) => void;
  setUser: (user: User) => void;
  setLoading: (isLoading: boolean) => void;
  logout: (options?: { redirectToHome?: boolean; revoke?: boolean }) => void;
}

export const createAuthStore = (getStorage: () => StateStorage = () => window.localStorage) => create<AuthState>()(
  persist(
    (set, get): AuthState => ({
      user: null,
      token: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
      userContext: null,
      isAuthenticated: false,
      isLoading: false,
      authStatus: 'idle',
      contextStatus: 'idle',
      contextVerified: false,
      
      login: (user: User, token: string, refreshToken?: string, refreshTokenExpiresAt?: string) => 
        set({ 
          user, 
          token, 
          refreshToken: refreshToken || null,
          refreshTokenExpiresAt: refreshTokenExpiresAt || null,
          isAuthenticated: true,
          authStatus: 'context-loading',
          contextVerified: get().isAuthenticated && get().user?._id === user._id ? get().contextVerified : false,
        }),

      setUserContext: (userContext: UserContextData) =>
        set((state: AuthState) => {
          const role = userContext.user.role || state.user?.role;
          const id = userContext.user._id || userContext.user.id;
          const profileImage = userContext.user.profilePicture ?? undefined;
          // Keep the same object when nothing changed: pages refetch on [user], and a 403 refreshes
          // the context, so a new object each time would loop 403 → refresh → refetch → 403.
          const unchanged = state.user?._id === id && state.user?.role === role && state.user?.profileImage === profileImage && state.user?.profilePicture === profileImage && state.user?.name === userContext.user.name && state.user?.email === userContext.user.email && state.user?.isActive === userContext.user.isActive;
          return {
            userContext,
            user: state.user ? (unchanged ? state.user : { ...state.user, _id: id, id, role, profileImage, profilePicture: profileImage, name: userContext.user.name, email: userContext.user.email, isActive: userContext.user.isActive }) : null,
            authStatus: 'authenticated',
            contextVerified: true,
          };
        }),

      setAuthStatus: (authStatus: AuthStatus) =>
        set({ authStatus }),

      setContextStatus: (contextStatus: ContextStatus) =>
        set({ contextStatus }),

      setUser: (user: User) => 
        set({ user }),
        
      setLoading: (isLoading: boolean) => 
        set({ isLoading }),

      logout: (options) => {
        const finish = () => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem('cart-storage');
            window.localStorage.removeItem('harglim_shared_royalties');
          }
          set({
            user: null,
            token: null,
            refreshToken: null,
            refreshTokenExpiresAt: null,
            userContext: null,
            isAuthenticated: false,
            isLoading: false,
            authStatus: 'idle',
            contextStatus: 'idle',
            contextVerified: false,
          });
          if (options?.redirectToHome && typeof window !== 'undefined') {
            // End the session with a document navigation, avoiding the route-guard race.
            window.location.replace('/');
          }
        };
        const session = get();
        let revocation: Promise<unknown> = Promise.resolve();
        if (options?.revoke !== false && typeof window !== 'undefined' && (session.token || session.refreshToken)) {
          const apiURL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';
          revocation = fetch(`${apiURL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}) },
            body: JSON.stringify({ refreshToken: session.refreshToken || undefined }),
            signal: AbortSignal.timeout(15_000),
            keepalive: true,
          }).then((response) => {
            if (!response.ok) console.warn('The backend session could not be revoked.');
          }).catch(() => console.warn('The backend session could not be revoked.'));
        }
        if (options?.redirectToHome) {
          // Keep the document alive until revocation completes, with a bounded wait.
          set({ isLoading: true });
          void revocation.then(finish);
        } else {
          // Expired sessions must disappear immediately, even if the network is unavailable.
          finish();
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(getStorage),
        merge: (persisted, current) => {
          const data = record(persisted), cached = record(data.user);
          const id = typeof cached._id === 'string' ? cached._id : typeof cached.id === 'string' ? cached.id : '';
          const role = cached.role;
          const validRole = role === 'visitor' || role === 'reader' || role === 'author' || role === 'admin';
          if (!id || !validRole || typeof cached.name !== 'string' || typeof cached.email !== 'string' || typeof data.token !== 'string' || !data.token || data.isAuthenticated !== true) {
            return { ...current, user: null, token: null, refreshToken: null, refreshTokenExpiresAt: null, userContext: null, contextStatus: 'idle', contextVerified: false, isAuthenticated: false };
          }
          const user: User = {
            _id: id, id, name: cached.name, email: cached.email, role,
            profileImage: typeof cached.profileImage === 'string' ? cached.profileImage : undefined,
            profilePicture: typeof cached.profilePicture === 'string' ? cached.profilePicture : undefined,
            isActive: typeof cached.isActive === 'boolean' ? cached.isActive : undefined,
            emailVerified: typeof cached.emailVerified === 'boolean' ? cached.emailVerified : undefined,
          };
          return { ...current, user, token: data.token,
            refreshToken: typeof data.refreshToken === 'string' ? data.refreshToken : null,
            refreshTokenExpiresAt: typeof data.refreshTokenExpiresAt === 'string' ? data.refreshTokenExpiresAt : null,
            isAuthenticated: true,
            userContext: current.user?._id === id ? current.userContext : null,
            contextVerified: current.user?._id === id && current.contextVerified,
          };
        },
      partialize: (state: AuthState) => ({ 
        user: state.user, 
        token: state.token, 
        refreshToken: state.refreshToken,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

export const useAuthStore = createAuthStore();
