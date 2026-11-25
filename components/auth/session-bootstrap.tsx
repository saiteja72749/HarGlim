"use client";

import { useEffect, useRef } from "react";
import { bootstrapUserContext } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { record } from '@/lib/api-error';
import { onLiveChange } from "@/lib/live-sync";
import { useSWRConfig } from 'swr';

/**
 * Re-fetches GET /users/me/context on load and when a signed-in user returns to the tab.
 * The persisted role/capabilities are only a cache: an admin can approve an
 * author application (or suspend a user) at any time, and the backend context
 * is the authoritative source for author dashboard access.
 */
export function SessionBootstrap() {
  const token = useAuthStore((state) => state.token);
  const previousToken = useRef(token);
  const { cache, mutate } = useSWRConfig();

  useEffect(() => {
    if (previousToken.current && !token) {
      void mutate(() => true, undefined, { revalidate: false }).then(() => {
        for (const key of cache.keys()) cache.delete(key);
      });
    }
    previousToken.current = token;
  }, [token, cache, mutate]);

  useEffect(() => {
    if (!token) return;
    void bootstrapUserContext();
    return onLiveChange("account-access", () => { void bootstrapUserContext(); }, 30_000);
  }, [token]);

  useEffect(() => {
    const syncSession = async (event: StorageEvent) => {
      if (event.key !== 'auth-storage' && event.key !== null) return;
      if (!event.newValue) {
        useAuthStore.getState().logout({ revoke: false });
        return;
      }
      try {
        const incoming = record(record(JSON.parse(event.newValue)).state);
        const current = useAuthStore.getState();
        // Context-only updates must not bounce between tabs or restart verification.
        if (incoming.token === current.token && incoming.isAuthenticated === current.isAuthenticated) return;
        // Rehydrate before changing local state; a persisted update beforehand would
        // overwrite the other tab's login/logout with this tab's old session.
        await useAuthStore.persist.rehydrate();
        const incomingUser = record(incoming.user);
        const sameUser = incomingUser._id === current.user?._id;
        useAuthStore.setState({ contextStatus: 'idle', userContext: sameUser ? current.userContext : null, contextVerified: sameUser && current.contextVerified });
      } catch {
        useAuthStore.getState().logout({ revoke: false });
      }
    };
    window.addEventListener('storage', syncSession);
    return () => window.removeEventListener('storage', syncSession);
  }, []);

  return null;
}
