import type { RoyaltyLine } from "@/types/royalty-api";
import { record } from "@/lib/api-error";
import api from "@/lib/api";
import { parseCollectionPage } from "@/lib/catalog-data";

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
  entries: RoyaltyLine[];
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

export function parseRoyaltyResponse(payload: unknown): RoyaltyHistory {
  const wrapper = record(payload);
  const data = record(wrapper.data ?? payload);
  const list = [data.history, data.earnings, data.items, data.royalties, data.lines, wrapper.data, payload].find(Array.isArray) || [];
  const pagination = record(data.pagination ?? wrapper.pagination);
  return {
    entries: list as RoyaltyLine[],
    totalRoyalty: firstNumber(data.accruedKnown, data.accruedTotal, data.balance, data.totalEarned, data.totalRoyalty),
    totalLines: firstNumber(pagination.total) ?? list.length,
    pages: firstNumber(pagination.pages) ?? 1,
  };
}

/** The whole royalty history, page by page (the list is paginated; totals come from the server). */
export async function fetchRoyaltyHistory(): Promise<RoyaltyHistory> {
  const load = async (page: number) =>
    parseRoyaltyResponse((await api.get("/authors/me/royalties", { params: { page, limit: 100 }, cache: "no-store" })).data);
  const first = await load(1);
  if (!Number.isInteger(first.pages) || first.pages < 0 || first.pages > 1_000) throw new Error("The backend returned invalid royalty pagination.");
  const entries = [...first.entries];
  for (let page = 2; page <= first.pages; page++) entries.push(...(await load(page)).entries);
  if (entries.length !== first.totalLines) throw new Error("Royalty history changed or was incomplete. Refresh before exporting.");
  return { ...first, entries };
}

export async function fetchAuthorLedgerRows<T>(collection: "royalty-settlements" | "manual-royalties", listKey: "settlements" | "statements") {
  const list: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const { data } = await api.get(`/authors/me/${collection}`, { params: { page, limit: 100 }, cache: "no-store" });
    const result = parseCollectionPage<T>(data, listKey);
    list.push(...result.items);
    if (result.pages !== null ? page >= result.pages : result.items.length < 100) return list;
  }
  throw new Error("The author ledger exceeded the supported pagination limit.");
}

/** A sale recorded before rates were stored: show "Unavailable", never ₹0. */
export const isRoyaltyUnavailable = (line: unknown) =>
  String(record(line).royaltyStatus || "").toUpperCase() === "HISTORICAL_RATE_UNAVAILABLE";
