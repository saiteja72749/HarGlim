"use client";

import { useCallback, useEffect } from "react";
import { fetchAllCategories, fetchBackendCategories, type BackendCategory } from "@/lib/categories";
import { onLiveChange } from "@/lib/live-sync";
import { useApiResource } from "@/hooks/use-api-resource";

/** Admin forms include inactive categories so existing relationships remain visible. */
export function useBookCategories(admin = true) {
  const fetcher = useCallback(() => admin ? fetchAllCategories(true) : fetchBackendCategories(true), [admin]);
  const resource = useApiResource<BackendCategory[]>(admin ? 'admin-book-categories' : 'public-book-categories', fetcher, admin);
  const { reload } = resource;
  useEffect(() => onLiveChange("categories", () => { void reload(); }), [reload]);
  return { categories: resource.data ?? [], loading: resource.loading, error: Boolean(resource.error), reload: resource.reload };
}
