"use client";

import { useEffect, useState } from "react";

/**
 * Tracks location.hash and scrolls the matching element into view once `ready`
 * (pages render a loader first, so the browser's native anchor jump misses).
 * Used by the author sidebar deep links, e.g. /author/settings#payout.
 */
export function useHashSection(ready = true) {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace("#", ""));
    sync();
    window.addEventListener("hashchange", sync);
    // App Router same-page hash navigation uses pushState without "hashchange".
    window.addEventListener("popstate", sync);
    const interval = window.setInterval(sync, 400);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!ready || !hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ready, hash]);

  return hash;
}
