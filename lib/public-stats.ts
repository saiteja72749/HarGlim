import api from "@/lib/api";

export type PublicStats = { booksCount: number; authorsCount: number };

const total = (payload: any): number | null => {
  const value = payload?.pagination?.total ?? payload?.data?.pagination?.total;
  return typeof value === "number" ? value : null;
};

/**
 * Published books and active authors for the public counters.
 * GET /stats/public is the dedicated route (BACKEND_ALIGNMENT_REPORT.md §7); until it exists the
 * counts come from the pagination totals of the public book and author lists.
 */
export async function fetchPublicStats(): Promise<PublicStats> {
  try {
    const { data } = await api.get("/stats/public");
    const stats = data?.data ?? data;
    if (typeof stats?.booksCount === "number" && typeof stats?.authorsCount === "number") {
      return { booksCount: stats.booksCount, authorsCount: stats.authorsCount };
    }
  } catch {
    // Route not deployed yet: fall back below.
  }

  const [booksRes, authorsRes] = await Promise.allSettled([api.get("/books?limit=1"), api.get("/authors?limit=1")]);
  return {
    booksCount: (booksRes.status === "fulfilled" && total(booksRes.value.data)) || 0,
    authorsCount: (authorsRes.status === "fulfilled" && total(authorsRes.value.data)) || 0,
  };
}
