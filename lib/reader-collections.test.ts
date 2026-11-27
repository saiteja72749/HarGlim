import { expect, it } from "vitest";
import { parseReaderCollection } from "@/lib/reader-collections";

it("uses backend pagination and unique book IDs for joined and direct records", () => {
  const book = { _id: "book-1", title: "First" };
  const result = parseReaderCollection({
    success: true,
    data: [{ _id: "wishlist-entry", book }, book, { _id: "dangling-entry", book: "missing-book" }],
    pagination: { total: 40, pages: 2, page: 2, limit: 24 },
  }, "wishlist");
  expect(result).toEqual({ books: [book], total: 40, pages: 2 });
});

it("preserves library purchase information and detects invalid responses", () => {
  expect(parseReaderCollection({ data: { books: [{
    book: { id: "digital-book", title: "Digital" }, createdAt: "2026-11-26", order: { orderNumber: "ORDER-1" },
  }] } }, "library").books).toEqual([{
    id: "digital-book", title: "Digital", purchasedAt: "2026-11-26", orderNumber: "ORDER-1",
  }]);
  expect(parseReaderCollection({ data: [], pagination: { total: 0, pages: 0 } }, "library"))
    .toEqual({ books: [], total: 0, pages: 1 });
  expect(() => parseReaderCollection({ data: { unexpected: true } }, "library")).toThrow();
});
