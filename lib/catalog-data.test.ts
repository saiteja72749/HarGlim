import { describe, expect, it } from "vitest";
import { catalogParams, parseCollectionPage } from "./catalog-data";

describe("deployed catalog contract", () => {
  it("puts the category, text, format and price filters on the same page request", () => {
    expect(catalogParams({ q: " poetry ", category: "history", format: "paperback", page: 2, limit: 12,
      minPrice: 0, maxPrice: 800, tag: "featured", sort: "price-low" }))
      .toMatchObject({ q: "poetry", category: "history", format: "paperback", page: 2, limit: 12,
        minPrice: 0, maxPrice: 800, featured: true, sort: "price_asc" });
  });

  it("does not cap an open-ended price range or send an all-books flag", () => {
    const params = catalogParams({ page: 1, limit: 12, minPrice: 800, tag: "all" });
    expect(params.maxPrice).toBeUndefined();
    expect(params).not.toHaveProperty("featured");
  });

  it("preserves supported sorts and tags and ignores legacy rating sort", () => {
    expect(catalogParams({ page: 1, limit: 12, sort: "price-high", tag: "bestseller" }))
      .toMatchObject({ sort: "price_desc", bestseller: true });
    expect(catalogParams({ page: 1, limit: 12, sort: "rating", tag: "newRelease" }))
      .toMatchObject({ sort: "newest", newRelease: true });
  });

  it("handles deployed nested and top-level pagination", () => {
    expect(parseCollectionPage({ data: { books: [{ _id: "a" }], pagination: { totalPages: 2 } } }, "books").pages).toBe(2);
    expect(parseCollectionPage({ data: [], pagination: { total: 0, pages: 0 } }, "books")).toEqual({ items: [], pages: 1 });
  });

  it("rejects malformed responses instead of reporting empty results", () => {
    expect(() => parseCollectionPage({ message: "Unavailable" }, "books")).toThrow();
  });
});
