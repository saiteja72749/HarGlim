import { parseCollectionPage } from "@/lib/catalog-data";
import { publishedNumber } from "@/lib/book-presentation";
import { record, UnconfirmedWriteError } from "@/lib/api-error";
import api from "@/lib/api";
import { fetchAuthorLedgerRows } from "@/lib/author-royalties";
import { adminResponse } from "@/lib/admin-account-api";

/**
 * Manual royalty statements: admin types, per book, the royalty per copy (100% of it goes to
 * the author), how many copies sold and gets the line and grand totals. The statement is saved
 * against the author's user id and shown in that author's Royalties page.
 *
 * Deployed routes:
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
  replacementFor?: string;
  currency: string;
};

export const formatManualRoyalty = (amount: number, currency: string) =>
  /^[A-Z]{3}$/.test(currency)
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount)
    : amount.toLocaleString("en-IN");

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
  if (!row.bookId || !row.bookTitle.trim()) return "Choose a book from the author's catalog";
  if (!/^\d+(?:\.\d{1,2})?$/.test(row.royaltyPerBook) || amount(row.royaltyPerBook) === 0) return "Enter a positive amount with up to two decimal places";
  if (!Number.isSafeInteger(Number(row.unitsSold)) || Number(row.unitsSold) < 1) return "Books sold must be a whole number of 1 or more";
  return null;
};

type StatementLineInput = { bookId: string; bookTitle: string; royaltyPerBook: number; unitsSold: number };
export type ManualRoyaltyPayload = {
  authorId: string; periodStart?: string; periodEnd?: string; note?: string; replacementFor?: string; items: StatementLineInput[];
};

export const buildPayload = (
  authorId: string,
  rows: ManualRoyaltyRow[],
  extra: { periodStart?: string; periodEnd?: string; note?: string; replacementFor?: string }
): ManualRoyaltyPayload => ({
  authorId,
  replacementFor: extra.replacementFor || undefined,
  periodStart: extra.periodStart ? new Date(`${extra.periodStart}T00:00:00.000Z`).toISOString() : undefined,
  periodEnd: extra.periodEnd ? new Date(`${extra.periodEnd}T23:59:59.999Z`).toISOString() : undefined,
  note: extra.note?.trim() || undefined,
  items: filledRows(rows).map((row) => ({
    bookId: row.bookId,
    bookTitle: row.bookTitle.trim(),
    royaltyPerBook: round2(amount(row.royaltyPerBook)),
    unitsSold: Math.floor(amount(row.unitsSold)),
  })),
});

export function manualRoyaltyAttempt(payload: ManualRoyaltyPayload) {
  return { payload, idempotencyKey: `manual-royalty-${globalThis.crypto.randomUUID()}` };
}

export type ManualRoyaltyAttempt = ReturnType<typeof manualRoyaltyAttempt>;

export function normalizeStatement(input: unknown): ManualRoyaltyStatement {
  const raw = record(input);
  const id = raw._id ?? raw.id;
  const author = record(raw.author);
  const replacement = record(raw.replacementFor);
  const replacementFor = typeof raw.replacementFor === "string" ? raw.replacementFor : replacement._id ?? replacement.id;
  const authorId = author._id ?? author.id ?? (typeof raw.author === "string" ? raw.author : raw.authorId);
  const totalUnits = publishedNumber(raw.totalUnits);
  const totalRoyalty = publishedNumber(raw.totalRoyalty);
  if (typeof id !== "string" || !id || typeof authorId !== "string" || !authorId ||
      typeof raw.status !== "string" || !raw.status || totalUnits === null || !Number.isSafeInteger(totalUnits) ||
      totalRoyalty === null || !Array.isArray(raw.items)) {
    throw new Error("The backend returned an incomplete royalty statement.");
  }
  const items = raw.items.map((value): ManualRoyaltyItem => {
    const item = record(value);
    const book = record(item.book);
    const bookId = book._id ?? (typeof item.book === "string" ? item.book : item.bookId);
    const royaltyPerBook = publishedNumber(item.royaltyPerBook);
    const unitsSold = publishedNumber(item.unitsSold);
    const lineTotal = publishedNumber(item.totalRoyalty);
    if (royaltyPerBook === null || unitsSold === null || !Number.isSafeInteger(unitsSold) || lineTotal === null) {
      throw new Error("A royalty statement line omitted its financial values.");
    }
    return {
      bookId: typeof bookId === "string" ? bookId : null,
      bookTitle: String(item.bookTitle || book.title || "Book unavailable"),
      royaltyPerBook, unitsSold, totalRoyalty: lineTotal,
    };
  });
  return {
    id, authorId, items, totalUnits, totalRoyalty,
    authorName: String(author.name || raw.authorName || ""),
    periodStart: String(raw.periodStart || ""),
    periodEnd: String(raw.periodEnd || ""),
    note: String(raw.note || ""),
    status: raw.status.toUpperCase(),
    createdAt: String(raw.createdAt || ""),
    replacementFor: typeof replacementFor === "string" ? replacementFor : undefined,
    currency: typeof raw.currency === "string" ? raw.currency : "INR",
  };
}

export async function createManualRoyalty({ payload, idempotencyKey }: ManualRoyaltyAttempt) {
  const { data } = await api.post("/admin/manual-royalties", payload, { headers: { "Idempotency-Key": idempotencyKey } });
  const result = record(adminResponse(data));
  const created = record(result.statement ?? result);
  const id = created._id ?? created.id;
  if (typeof id !== "string" || !id) throw new UnconfirmedWriteError("The API acknowledged creation without returning a statement ID. Check the saved statements.");
  const saved = await fetchManualRoyalty(id).catch((cause: unknown) => {
    throw new UnconfirmedWriteError("The statement was acknowledged, but its saved record could not be verified.", { cause });
  });
  if (saved.authorId !== payload.authorId || saved.status !== "RECORDED" ||
      saved.replacementFor !== payload.replacementFor || saved.items.length !== payload.items.length || payload.items.some((item, index) => {
        const line = saved.items[index];
        return line.bookId !== item.bookId || line.unitsSold !== item.unitsSold || line.royaltyPerBook !== item.royaltyPerBook;
      })) {
    throw new UnconfirmedWriteError("The saved statement did not match the submitted author or line items. Check the saved statements.");
  }
  return saved;
}

export type ManualRoyaltyFilters = { authorId?: string; status?: "RECORDED" | "VOID"; from?: string; to?: string };

export async function listManualRoyalties(filters: ManualRoyaltyFilters, page: number, signal: AbortSignal) {
  const { data } = await api.get("/admin/manual-royalties", {
    params: { ...filters, page, limit: 20 },
    cache: "no-store", signal,
  });
  const result = parseCollectionPage<unknown>(data, "statements");
  const statements = result.items.map(normalizeStatement);
  if (statements.some((item) => (filters.authorId && item.authorId !== filters.authorId) ||
    (filters.status && item.status !== filters.status))) {
    throw new Error("The backend returned statements outside the requested filters.");
  }
  if (new Set(statements.map((item) => item.id)).size !== statements.length || result.pages === null) {
    throw new Error("The backend returned invalid statement pagination.");
  }
  return { statements, pages: result.pages };
}

export async function voidManualRoyalty(id: string, reason: string) {
  await api.post(`/admin/manual-royalties/${encodeURIComponent(id)}/void`, { reason });
  const saved = await fetchManualRoyalty(id);
  if (saved.status !== "VOID") throw new UnconfirmedWriteError("The API acknowledged the request, but the voided status could not be confirmed.");
}

async function fetchManualRoyalty(id: string) {
  try {
    const { data } = await api.get(`/admin/manual-royalties/${encodeURIComponent(id)}`, { cache: "no-store" });
    const result = record(adminResponse(data));
    const saved = normalizeStatement(result.statement ?? result);
    if (saved.id !== id) throw new Error("Statement ID did not match.");
    return saved;
  } catch (cause) {
    throw new UnconfirmedWriteError("The API acknowledged the request, but the saved statement could not be verified. Check the statement list.", { cause });
  }
}

export async function listMyManualRoyalties(authorId: string) {
  const rows = await fetchAuthorLedgerRows<unknown>("manual-royalties", "statements");
  const statements = rows.map(normalizeStatement);
  if (statements.some((item) => item.authorId !== authorId) || new Set(statements.map((item) => item.id)).size !== statements.length) {
    throw new Error("The backend returned an unexpected author or duplicate statement.");
  }
  return statements;
}
