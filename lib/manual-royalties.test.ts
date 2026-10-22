import { describe, expect, it } from "vitest";
import { buildPayload, grandTotals, normalizeStatement, rowError, rowTotal, type ManualRoyaltyRow } from "./manual-royalties";

const row = (patch: Partial<ManualRoyaltyRow>): ManualRoyaltyRow => ({
  key: "k",
  bookId: "",
  bookTitle: "",
  royaltyPerBook: "",
  unitsSold: "",
  ...patch,
});

describe("manual royalties", () => {
  const rows = [
    row({ bookId: "b1", bookTitle: "Still Becoming", royaltyPerBook: "99.5", unitsSold: "10" }),
    row({ bookTitle: "Poems", royaltyPerBook: "50", unitsSold: "3" }),
    row({}),
  ];

  it("totals each row and the whole table", () => {
    expect(rowTotal(rows[0])).toBe(995);
    expect(grandTotals(rows)).toEqual({ units: 13, royalty: 1145 });
  });

  it("validates filled rows", () => {
    expect(rowError(rows[0])).toBeNull();
    expect(rowError(row({ bookTitle: "X", royaltyPerBook: "10", unitsSold: "1.5" }))).toMatch(/whole number/);
    expect(rowError(row({ royaltyPerBook: "10", unitsSold: "1" }))).toMatch(/book/);
  });

  it("sends only filled rows with the author id", () => {
    const payload = buildPayload("a1", rows, { periodStart: "2026-09-01", note: " fair " });
    expect(payload.authorId).toBe("a1");
    expect(payload.note).toBe("fair");
    expect(payload.periodStart).toBe("2026-09-01T00:00:00.000Z");
    expect(payload.items).toEqual([
      { bookId: "b1", bookTitle: "Still Becoming", royaltyPerBook: 99.5, unitsSold: 10 },
      { bookId: undefined, bookTitle: "Poems", royaltyPerBook: 50, unitsSold: 3 },
    ]);
  });

  it("reads server statements and fills missing totals", () => {
    const s = normalizeStatement({
      _id: "s1",
      author: { _id: "a1", name: "Maria" },
      items: [{ book: { _id: "b1", title: "Still Becoming" }, royaltyPerBook: 100, unitsSold: 2 }],
    });
    expect(s).toMatchObject({ id: "s1", authorId: "a1", authorName: "Maria", totalUnits: 2, totalRoyalty: 200, status: "RECORDED" });
    expect(s.items[0]).toMatchObject({ bookId: "b1", bookTitle: "Still Becoming", totalRoyalty: 200 });
  });
});
