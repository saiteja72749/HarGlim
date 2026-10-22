import { describe, expect, it } from "vitest";
import { bookRoyaltyPerCopy, readCosts, royaltyPerCopy, royaltyPercentFromCosts } from "./royalty";

const costs = readCosts({ printingCost: "120", platformCharges: 30, deliveryCharges: "50" });

describe("royalty", () => {
  it("is MRP minus printing, platform and delivery charges", () => {
    expect(royaltyPerCopy(299, costs)).toBe(99);
    expect(royaltyPerCopy(150, costs)).toBe(0);
  });

  it("sends the percentage that reproduces the per-copy amount at MRP", () => {
    const pct = royaltyPercentFromCosts(299, costs);
    expect(Math.round(299 * pct) / 100).toBeCloseTo(99, 1);
    expect(royaltyPercentFromCosts(0, costs)).toBe(0);
  });

  it("falls back to the stored percentage for books without charges", () => {
    expect(bookRoyaltyPerCopy({ mrp: 299, royaltyPercentage: 30 })).toBe(89.7);
    expect(bookRoyaltyPerCopy({ mrp: 299, ...costs })).toBe(99);
    expect(bookRoyaltyPerCopy({ mrp: 299 })).toBeNull();
  });
});
