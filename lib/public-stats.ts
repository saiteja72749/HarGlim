import { getPublic } from "@/lib/api";

export type PublicStats = { booksCount: number; authorsCount: number };

/** The dedicated backend counters; failed requests must never become invented zero totals. */
export async function fetchPublicStats(): Promise<PublicStats> {
  const { data } = await getPublic("/stats/public");
  const stats = data?.data ?? data;
  if (!Number.isFinite(stats?.booksCount) || !Number.isFinite(stats?.authorsCount)) {
    throw new Error("The backend did not return valid public counts.");
  }
  return { booksCount: stats.booksCount, authorsCount: stats.authorsCount };
}
