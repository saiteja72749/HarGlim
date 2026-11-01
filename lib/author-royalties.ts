import api from "@/lib/api";

/**
 * GET /authors/me/royalties →
 *   { data: { balance, accruedKnown, accruedTotal, currency, dataStatus, unresolvedLegacySales,
 *             history: [{ orderNumber, bookId, bookTitle, quantity, unitPrice, grossBookRevenue,
 *                         royaltyPercentageSnapshot, royaltyPerCopy, royaltyPerCopySnapshot,
 *                         royaltyAmount, royaltyStatus, status, ... }],
 *             pagination: { total, page, pages, limit } } }
 *
 * Totals and amounts are the server's; old sales use their snapshots and are never recalculated
 * from a book's current values.
 */

export type RoyaltyHistory = {
  entries: any[];
  /** Lifetime known royalty from the server, independent of how many lines are loaded. */
  totalRoyalty: number | null;
  /** Number of sale lines on the server. */
  totalLines: number;
  pages: number;
};

const firstNumber = (...values: unknown[]): number | null => {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export function parseRoyaltyResponse(payload: any): RoyaltyHistory {
  const data = payload?.data ?? payload ?? {};
  const list = [data.history, data.earnings, data.items, data.royalties, data.lines, data].find(Array.isArray) || [];
  const pagination = data.pagination ?? payload?.pagination ?? {};
  return {
    entries: list,
    totalRoyalty: firstNumber(data.accruedKnown, data.accruedTotal, data.balance, data.totalEarned, data.totalRoyalty),
    totalLines: firstNumber(pagination.total) ?? list.length,
    pages: firstNumber(pagination.pages) ?? 1,
  };
}

/** The whole royalty history, page by page (the list is paginated; totals come from the server). */
export async function fetchRoyaltyHistory(): Promise<RoyaltyHistory> {
  const load = async (page: number) =>
    parseRoyaltyResponse((await api.get("/authors/me/royalties", { params: { page, limit: 100 }, cache: "no-store" } as any)).data);
  const first = await load(1);
  const entries = [...first.entries];
  for (let page = 2; page <= Math.min(first.pages, 50); page++) entries.push(...(await load(page)).entries);
  return { ...first, entries };
}

/** A sale recorded before rates were stored: show "Unavailable", never ₹0. */
export const isRoyaltyUnavailable = (line: any) =>
  String(line?.royaltyStatus || "").toUpperCase() === "HISTORICAL_RATE_UNAVAILABLE";
