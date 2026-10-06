import { describe, expect, it } from "vitest";
import { normalizeAuthorDashboard } from "./author-dashboard";

// Trimmed copy of the live GET /authors/me/dashboard response (2026-10-06).
const live = {
  success: true,
  data: {
    books: { total: 1, published: 1, draft: 0, archived: 0 },
    sales: { unitsSold: 6, grossBookRevenue: 813 },
    royalties: {
      accruedKnown: 243.9,
      accrued: 243.9,
      eligibleUnsettled: 0,
      settledPendingPayment: 0,
      paidLifetime: 0,
      currency: "INR",
      dataStatus: "COMPLETE",
      unresolvedLegacySales: 0,
    },
    topBooks: [
      {
        bookId: "6aad6dbd504e3c9247d4dfee",
        title: "I Thought I Found Me in You",
        coverImage: "https://res.cloudinary.com/x.png",
        status: "published",
        unitsSold: 3,
        grossBookRevenue: 810,
        knownAccruedRoyalty: 243,
        unresolvedLegacySales: 0,
        currentRoyaltyPercentage: 30,
      },
    ],
    recentSales: [
      {
        orderNumber: "HM-D37E358E",
        bookId: "6aad6dbd504e3c9247d4dfee",
        bookTitle: "I Thought I Found Me in You",
        quantity: 1,
        unitPrice: 270,
        grossRevenue: 270,
        royaltyPercentageSnapshot: 30,
        accruedRoyalty: 81,
        royaltyStatus: "CALCULATED",
        saleDate: "2026-10-03T05:28:07.628Z",
        status: "SHIPPED",
      },
      {
        orderNumber: "HM-DB5F916F",
        bookId: null,
        bookTitle: "Book",
        quantity: 1,
        unitPrice: 1,
        grossRevenue: 1,
        royaltyPercentageSnapshot: 30,
        accruedRoyalty: 0.3,
        royaltyStatus: "CALCULATED",
        saleDate: "2026-09-24T12:22:25.886Z",
        status: "SHIPPED",
      },
    ],
  },
};

describe("normalizeAuthorDashboard (live payload)", () => {
  const s = normalizeAuthorDashboard(live);

  it("reads the grouped totals", () => {
    expect(s.books).toEqual({ total: 1, published: 1, draft: 0, archived: 0 });
    expect(s.unitsSold).toBe(6);
    expect(s.grossRevenue).toBe(813);
    expect(s.accrued).toBe(243.9);
    expect(s.paidLifetime).toBe(0);
  });

  it("names the book on each sale", () => {
    expect(s.recentSales[0]).toMatchObject({
      orderNumber: "HM-D37E358E",
      bookTitle: "I Thought I Found Me in You",
      bookAvailable: true,
      royalty: 81,
      royaltyPercent: 30,
    });
  });

  it("labels sales whose book was deleted instead of showing 'Book'", () => {
    expect(s.recentSales[1]).toMatchObject({ bookId: null, bookTitle: "Book no longer available", bookAvailable: false });
  });

  it("maps top books", () => {
    expect(s.topBooks[0]).toMatchObject({ title: "I Thought I Found Me in You", unitsSold: 3, royalty: 243, royaltyPercent: 30 });
  });
});
