/**
 * Normalises GET /authors/me/dashboard and GET /admin/authors/{id}/dashboard.
 *
 * Live shape (grouped):
 *   { books: { total, published, draft, archived },
 *     sales: { unitsSold, grossBookRevenue },
 *     royalties: { accruedKnown, accrued, eligibleUnsettled, settledPendingPayment, paidLifetime,
 *                  currency, dataStatus, unresolvedLegacySales },
 *     topBooks: [{ bookId, title, coverImage, status, unitsSold, grossBookRevenue,
 *                  knownAccruedRoyalty, currentRoyaltyPercentage, unresolvedLegacySales }],
 *     recentSales: [{ orderNumber, bookId, bookTitle, quantity, unitPrice, grossRevenue,
 *                     royaltyPercentageSnapshot, accruedRoyalty, royaltyStatus, saleDate, status }] }
 */

export interface AuthorSale {
  orderNumber: string;
  bookId: string | null;
  bookTitle: string;
  /** false when the book record no longer exists (bookId null) */
  bookAvailable: boolean;
  quantity: number;
  unitPrice: number;
  grossRevenue: number;
  royaltyPercent: number | null;
  royalty: number;
  royaltyStatus: string;
  saleDate: string;
  orderStatus: string;
}

export interface AuthorTopBook {
  bookId: string | null;
  title: string;
  coverImage: string;
  status: string;
  unitsSold: number;
  grossRevenue: number;
  royalty: number;
  royaltyPercent: number | null;
  unresolvedLegacySales: number;
}

export interface AuthorDashboardSummary {
  books: { total: number; published: number; draft: number; archived: number };
  unitsSold: number;
  grossRevenue: number;
  accrued: number;
  eligibleUnsettled: number;
  pendingPayout: number;
  paidLifetime: number;
  currency: string;
  dataStatus: string;
  unresolvedLegacySales: number;
  topBooks: AuthorTopBook[];
  recentSales: AuthorSale[];
}

const num = (...values: any[]) => {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

const optionalNum = (v: any): number | null =>
  v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

/** Backend sends bookTitle "Book" + bookId null when the book was deleted. */
const resolveTitle = (title: any, bookId: any) => {
  const t = typeof title === "string" ? title.trim() : "";
  if (!bookId && (!t || t.toLowerCase() === "book")) return { title: "Book no longer available", available: false };
  return { title: t || "Untitled book", available: Boolean(bookId) };
};

export function normalizeAuthorDashboard(payload: any): AuthorDashboardSummary {
  const d = payload?.data?.data ?? payload?.data ?? payload ?? {};
  const books = typeof d.books === "object" && !Array.isArray(d.books) ? d.books : {};
  const sales = d.sales || {};
  const royalties = d.royalties || {};

  const topBooks: AuthorTopBook[] = (Array.isArray(d.topBooks) ? d.topBooks : []).map((b: any) => {
    const { title } = resolveTitle(b.title, b.bookId ?? b._id);
    return {
      bookId: b.bookId ?? b._id ?? null,
      title,
      coverImage: b.coverImage || "",
      status: String(b.status || ""),
      unitsSold: num(b.unitsSold),
      grossRevenue: num(b.grossBookRevenue, b.grossRevenue),
      royalty: num(b.knownAccruedRoyalty, b.accruedRoyalty, b.royalty),
      royaltyPercent: optionalNum(b.currentRoyaltyPercentage ?? b.royaltyPercentage),
      unresolvedLegacySales: num(b.unresolvedLegacySales),
    };
  });

  const recentSales: AuthorSale[] = (Array.isArray(d.recentSales) ? d.recentSales : []).map((s: any) => {
    const { title, available } = resolveTitle(s.bookTitle ?? s.title, s.bookId);
    return {
      orderNumber: String(s.orderNumber || ""),
      bookId: s.bookId ?? null,
      bookTitle: title,
      bookAvailable: available,
      quantity: num(s.quantity, 1),
      unitPrice: num(s.unitPrice, s.price),
      grossRevenue: num(s.grossRevenue, num(s.unitPrice) * num(s.quantity, 1)),
      royaltyPercent: optionalNum(s.royaltyPercentageSnapshot),
      royalty: num(s.accruedRoyalty, s.royaltyAmount),
      royaltyStatus: String(s.royaltyStatus || ""),
      saleDate: s.saleDate || s.createdAt || "",
      orderStatus: String(s.status || ""),
    };
  });

  return {
    books: {
      total: num(books.total, d.totalBooks),
      published: num(books.published, d.publishedBooks),
      draft: num(books.draft, d.draftBooks),
      archived: num(books.archived),
    },
    unitsSold: num(sales.unitsSold, d.unitsSold),
    grossRevenue: num(sales.grossBookRevenue, d.grossBookRevenue),
    accrued: num(royalties.accruedKnown, royalties.accrued, d.accruedKnown, d.accrued),
    eligibleUnsettled: num(royalties.eligibleUnsettled, d.eligibleUnsettled),
    pendingPayout: num(royalties.settledPendingPayment, d.settledPendingPayment),
    paidLifetime: num(royalties.paidLifetime, d.paidLifetime),
    currency: royalties.currency || "INR",
    dataStatus: String(royalties.dataStatus || "COMPLETE"),
    unresolvedLegacySales: num(royalties.unresolvedLegacySales),
    topBooks,
    recentSales,
  };
}

export const formatINR = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
