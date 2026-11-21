// @vitest-environment node
import { describe, expect, it } from "vitest";
import { normalizeAuthorDashboard } from "./author-dashboard";

// Synthetic numeric inputs exercise the documented grouped dashboard contract; no account data is required.
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
        bookId: "000000000000000000000001",
        title: "Example Book",
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
        orderNumber: "ORDER-UNIT-1",
        bookId: "000000000000000000000001",
        bookTitle: "Example Book",
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

describe("normalizeAuthorDashboard (grouped payload)", () => {
  const s = normalizeAuthorDashboard(live);

  it("handles missing grouped book totals without crashing the dashboard", () => {
    expect(normalizeAuthorDashboard({ data: { books: null, totalBooks: 2 } }).books.total).toBe(2);
  });

  it("reads the grouped totals", () => {
    expect(s.books).toEqual({ total: 1, published: 1, draft: 0, archived: 0 });
    expect(s.unitsSold).toBe(6);
    expect(s.grossRevenue).toBe(813);
    expect(s.accrued).toBe(243.9);
    expect(s.paidLifetime).toBe(0);
  });

  it("names the book on each sale", () => {
    expect(s.recentSales[0]).toMatchObject({
      orderNumber: "ORDER-UNIT-1",
      bookTitle: "Example Book",
      bookAvailable: true,
      royalty: 81,
      royaltyPercent: 30,
    });
  });

  it("labels sales whose book was deleted instead of showing 'Book'", () => {
    expect(s.recentSales[1]).toMatchObject({ bookId: null, bookTitle: "Book no longer available", bookAvailable: false });
  });

  it("maps top books", () => {
    expect(s.topBooks[0]).toMatchObject({ title: "Example Book", unitsSold: 3, royalty: 243, royaltyPercent: 30 });
  });
});
