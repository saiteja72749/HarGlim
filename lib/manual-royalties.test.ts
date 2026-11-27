import { describe, expect, it, vi } from "vitest";
import api from "./api";
import { UnconfirmedWriteError } from "./api-error";
import { buildPayload, createManualRoyalty, grandTotals, manualRoyaltyAttempt, normalizeStatement, rowError, rowTotal, type ManualRoyaltyRow } from "./manual-royalties";

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
    row({ bookId: "b2", bookTitle: "Poems", royaltyPerBook: "50", unitsSold: "3" }),
    row({}),
  ];

  it("totals each row and the whole table", () => {
    expect(rowTotal(rows[0])).toBe(995);
    expect(grandTotals(rows)).toEqual({ units: 13, royalty: 1145 });
  });

  it("validates filled rows", () => {
    expect(rowError(rows[0])).toBeNull();
    expect(rowError(row({ bookId: "b1", bookTitle: "First", royaltyPerBook: "10", unitsSold: "1.5" }))).toMatch(/whole number/);
    expect(rowError(row({ bookTitle: "X", royaltyPerBook: "10", unitsSold: "1" }))).toMatch(/catalog/);
    expect(rowError(row({ royaltyPerBook: "10", unitsSold: "1" }))).toMatch(/book/);
  });

  it("sends only filled rows with the author id", () => {
    const payload = buildPayload("a1", rows, { periodStart: "2026-09-01", note: " fair ", replacementFor: "s0" });
    expect(payload.authorId).toBe("a1");
    expect(payload.note).toBe("fair");
    expect(payload.periodStart).toBe("2026-09-01T00:00:00.000Z");
    expect(payload.items).toEqual([
      { bookId: "b1", bookTitle: "Still Becoming", royaltyPerBook: 99.5, unitsSold: 10 },
      { bookId: "b2", bookTitle: "Poems", royaltyPerBook: 50, unitsSold: 3 },
    ]);
    expect(payload.replacementFor).toBe("s0");
  });

  it("reuses the payload and key after a transport failure", async () => {
    const payload = buildPayload("a1", [rows[0]], { replacementFor: "s0" });
    const attempt = manualRoyaltyAttempt(payload);
    const post = vi.spyOn(api, "post")
      .mockRejectedValueOnce(new Error("Network failed"))
      .mockResolvedValueOnce({ data: { data: { _id: "s1" } } });
    const get = vi.spyOn(api, "get").mockResolvedValueOnce({ data: { data: {
      _id: "s1", author: "a1", status: "RECORDED", replacementFor: "s0", currency: "INR", totalUnits: 10,
      totalRoyalty: 995, items: [{ book: "b1", bookTitle: "Backend title", royaltyPerBook: 99.5, unitsSold: 10, totalRoyalty: 995 }],
    } } });
    try {
      await expect(createManualRoyalty(attempt)).rejects.toThrow("Network failed");
      await expect(createManualRoyalty(attempt)).resolves.toMatchObject({
        id: "s1", replacementFor: "s0", totalRoyalty: 995, items: [{ bookTitle: "Backend title" }],
      });
      const request = ["/admin/manual-royalties", payload, { headers: { "Idempotency-Key": attempt.idempotencyKey } }];
      expect(post.mock.calls).toEqual([request, request]);
      expect(manualRoyaltyAttempt(payload).idempotencyKey).not.toBe(attempt.idempotencyKey);
    } finally {
      post.mockRestore();
      get.mockRestore();
    }
  });

  it("rejects statements without authoritative amounts", () => {
    expect(() => normalizeStatement({ _id: "s1", author: "a1", status: "RECORDED", items: [] })).toThrow();
  });

  it("preserves a retryable outcome when an acknowledged write cannot be read back", async () => {
    const attempt = manualRoyaltyAttempt(buildPayload("a1", [rows[0]], {}));
    const post = vi.spyOn(api, "post").mockResolvedValue({ data: { data: { _id: "s1" } } });
    const get = vi.spyOn(api, "get").mockRejectedValue(new Error("Readback unavailable"));
    try {
      await expect(createManualRoyalty(attempt)).rejects.toBeInstanceOf(UnconfirmedWriteError);
      expect(post).toHaveBeenCalledExactlyOnceWith("/admin/manual-royalties", attempt.payload, {
        headers: { "Idempotency-Key": attempt.idempotencyKey },
      });
    } finally {
      post.mockRestore();
      get.mockRestore();
    }
  });

  it("uses confirmed server statement totals", () => {
    const s = normalizeStatement({
      _id: "s1", status: "RECORDED", totalUnits: 2, totalRoyalty: 200,
      author: { _id: "a1", name: "Maria" },
      items: [{ book: { _id: "b1", title: "Still Becoming" }, royaltyPerBook: 100, unitsSold: 2, totalRoyalty: 200 }],
    });
    expect(s).toMatchObject({ id: "s1", authorId: "a1", authorName: "Maria", totalUnits: 2, totalRoyalty: 200, status: "RECORDED" });
    expect(s.items[0]).toMatchObject({ bookId: "b1", bookTitle: "Still Becoming", totalRoyalty: 200 });
  });
});
