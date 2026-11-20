"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAllCategories, fetchBackendCategories, type BackendCategory } from "@/lib/categories";
import { onLiveChange } from "@/lib/live-sync";

/** Admin forms include inactive categories so existing relationships remain visible. */
export function useBookCategories(admin = true) {
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try { setCategories(admin ? await fetchAllCategories(true) : await fetchBackendCategories(true)); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [admin]);
  useEffect(() => {
    void reload();
    return onLiveChange("categories", () => { void reload(); });
  }, [reload]);
  return { categories, loading, error, reload };
}
