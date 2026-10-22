import api from "@/lib/api";

/**
 * Manual royalty statements: admin types, per book, the royalty per copy (100% of it goes to
 * the author), how many copies sold and gets the line and grand totals. The statement is saved
 * against the author's user id and shown in that author's Royalties page.
 *
 * Backend contract (to be built, see BACKEND_ALIGNMENT_REPORT.md §1):
 *   POST   /admin/manual-royalties                { authorId, periodStart?, periodEnd?, note?, items[] }
 *   GET    /admin/manual-royalties?authorId=      list (admin)
 *   POST   /admin/manual-royalties/{id}/void      { reason }
 *   GET    /authors/me/manual-royalties           list (author's own)
 * The server recomputes every total; the client values are only a preview.
 */

export type ManualRoyaltyRow = {
  key: string;
  bookId: string;
  bookTitle: string;
  royaltyPerBook: string;
  unitsSold: string;
};

export type ManualRoyaltyItem = {
  bookId: string | null;
  bookTitle: string;
  royaltyPerBook: number;
  unitsSold: number;
  totalRoyalty: number;
};

export type ManualRoyaltyStatement = {
  id: string;
  authorId: string;
  authorName: string;
  periodStart: string;
  periodEnd: string;
  note: string;
  status: string;
  items: ManualRoyaltyItem[];
  totalUnits: number;
  totalRoyalty: number;
  createdAt: string;
};

let rowSeq = 0;
export const emptyRow = (): ManualRoyaltyRow => ({
  key: `row-${Date.now()}-${rowSeq++}`,
  bookId: "",
  bookTitle: "",
  royaltyPerBook: "",
  unitsSold: "",
});

const amount = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

export const rowTotal = (row: Pick<ManualRoyaltyRow, "royaltyPerBook" | "unitsSold">) =>
  round2(amount(row.royaltyPerBook) * Math.floor(amount(row.unitsSold)));

export const grandTotals = (rows: Pick<ManualRoyaltyRow, "royaltyPerBook" | "unitsSold">[]) => ({
  units: rows.reduce((sum, row) => sum + Math.floor(amount(row.unitsSold)), 0),
  royalty: round2(rows.reduce((sum, row) => sum + rowTotal(row), 0)),
});

/** Rows the admin actually filled in; a row needs a book, a royalty and at least one copy. */
export const filledRows = (rows: ManualRoyaltyRow[]) =>
  rows.filter((row) => row.bookTitle.trim() || row.bookId || row.royaltyPerBook || row.unitsSold);

export const rowError = (row: ManualRoyaltyRow): string | null => {
  if (!row.bookTitle.trim()) return "Pick or type a book";
  if (amount(row.royaltyPerBook) === 0) return "Royalty per book must be more than 0";
  if (!Number.isInteger(Number(row.unitsSold)) || Number(row.unitsSold) < 1) return "Books sold must be a whole number of 1 or more";
  return null;
};

export const buildPayload = (
  authorId: string,
  rows: ManualRoyaltyRow[],
  extra: { periodStart?: string; periodEnd?: string; note?: string }
) => ({
  authorId,
  periodStart: extra.periodStart ? new Date(`${extra.periodStart}T00:00:00.000Z`).toISOString() : undefined,
  periodEnd: extra.periodEnd ? new Date(`${extra.periodEnd}T23:59:59.999Z`).toISOString() : undefined,
  note: extra.note?.trim() || undefined,
  items: filledRows(rows).map((row) => ({
    bookId: row.bookId || undefined,
    bookTitle: row.bookTitle.trim(),
    royaltyPerBook: round2(amount(row.royaltyPerBook)),
    unitsSold: Math.floor(amount(row.unitsSold)),
  })),
});

const listFrom = (payload: any): any[] => {
  const candidates = [payload?.data?.statements, payload?.data?.items, payload?.data, payload?.statements, payload];
  return candidates.find(Array.isArray) || [];
};

export function normalizeStatement(raw: any): ManualRoyaltyStatement {
  const items: ManualRoyaltyItem[] = (Array.isArray(raw?.items) ? raw.items : []).map((item: any) => {
    const royaltyPerBook = amount(item?.royaltyPerBook);
    const unitsSold = Math.floor(amount(item?.unitsSold));
    return {
      bookId: (typeof item?.book === "object" ? item.book?._id : item?.book) || item?.bookId || null,
      bookTitle: item?.bookTitle || item?.book?.title || "Book",
      royaltyPerBook,
      unitsSold,
      totalRoyalty: item?.totalRoyalty != null ? amount(item.totalRoyalty) : round2(royaltyPerBook * unitsSold),
    };
  });
  const author = typeof raw?.author === "object" ? raw.author : null;
  return {
    id: String(raw?._id || raw?.id || ""),
    authorId: String(author?._id || raw?.author || raw?.authorId || ""),
    authorName: author?.name || raw?.authorName || "",
    periodStart: raw?.periodStart || "",
    periodEnd: raw?.periodEnd || "",
    note: raw?.note || "",
    status: String(raw?.status || "RECORDED").toUpperCase(),
    items,
    totalUnits: raw?.totalUnits != null ? amount(raw.totalUnits) : items.reduce((s, i) => s + i.unitsSold, 0),
    totalRoyalty: raw?.totalRoyalty != null ? amount(raw.totalRoyalty) : round2(items.reduce((s, i) => s + i.totalRoyalty, 0)),
    createdAt: raw?.createdAt || "",
  };
}

/** 404 = the backend has not shipped these routes yet. */
export const isMissingEndpoint = (err: any) => err?.response?.status === 404;

export async function createManualRoyalty(payload: ReturnType<typeof buildPayload>) {
  const { data } = await api.post("/admin/manual-royalties", payload);
  return normalizeStatement(data?.data ?? data);
}

export async function listManualRoyalties(authorId?: string) {
  const { data } = await api.get("/admin/manual-royalties", {
    params: { limit: 100, ...(authorId ? { authorId } : {}) },
    cache: "no-store",
  } as any);
  return listFrom(data).map(normalizeStatement);
}

export async function voidManualRoyalty(id: string, reason: string) {
  await api.post(`/admin/manual-royalties/${id}/void`, { reason });
}

export async function listMyManualRoyalties() {
  const { data } = await api.get("/authors/me/manual-royalties", { params: { limit: 100 }, cache: "no-store" } as any);
  return listFrom(data).map(normalizeStatement);
}
