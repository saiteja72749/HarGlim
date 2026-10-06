"use client";

import { useEffect } from "react";
import { bootstrapUserContext } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

/**
 * Re-fetches GET /users/me/context once per page load for signed-in users.
 * The persisted role/capabilities are only a cache: an admin can approve an
 * author application (or suspend a user) at any time, and the backend context
 * is the authoritative source for author dashboard access.
 */
export function SessionBootstrap() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (token) bootstrapUserContext();
    // Run on load and whenever a different session token appears; login flows call it themselves too.
  }, [token]);

  return null;
}
