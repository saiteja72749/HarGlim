import { describe, expect, it } from "vitest";
import { isRoyaltyUnavailable, parseRoyaltyResponse } from "./author-royalties";

// The documented response of GET /authors/me/royalties.
const line = {
  orderNumber: "HM-12345678",
  bookId: "BOOK_OBJECT_ID",
  bookTitle: "Enterprise Publishing Systems",
  quantity: 2,
  unitPrice: 499,
  grossBookRevenue: 998,
  royaltyPercentageSnapshot: null,
  royaltyPerCopy: 319,
  royaltyPerCopySnapshot: 319,
  royaltyAmount: 638,
  royaltyStatus: "CALCULATED",
  status: "ACCRUED",
};
const response = {
  success: true,
  data: {
    balance: 638,
    accruedKnown: 638,
    accruedTotal: 638,
    currency: "INR",
    dataStatus: "COMPLETE",
    unresolvedLegacySales: 0,
    history: [line],
    pagination: { total: 12, page: 1, pages: 2, limit: 10 },
  },
};

describe("author royalties", () => {
  it("reads lines from data.history and the totals from the server", () => {
    expect(parseRoyaltyResponse(response)).toEqual({ entries: [line], totalRoyalty: 638, totalLines: 12, pages: 2 });
  });

  it("copes with an author who has no sales", () => {
    const empty = { success: true, data: { accruedKnown: 0, history: [], pagination: { total: 0, page: 1, pages: 0, limit: 10 } } };
    expect(parseRoyaltyResponse(empty)).toEqual({ entries: [], totalRoyalty: 0, totalLines: 0, pages: 0 });
  });

  it("marks only historical sales without a stored rate as unavailable", () => {
    expect(isRoyaltyUnavailable({ royaltyStatus: "HISTORICAL_RATE_UNAVAILABLE", royaltyAmount: 0 })).toBe(true);
    // A charge-based sale has no percentage snapshot, but its royalty is known.
    expect(isRoyaltyUnavailable(line)).toBe(false);
  });
});
