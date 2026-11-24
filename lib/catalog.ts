import { getPublic } from "@/lib/api";
import { catalogParams, parseCollectionPage, type CatalogQuery } from "@/lib/catalog-data";
import type { Book } from "@/types";

export function uniqueBooks(books: Book[]): Book[] {
  const ids = new Set<string>();
  const slugs = new Set<string>();
  return books.filter((book) => {
    const id = book._id || book.id;
    if ((!id && !book.slug) || (id && ids.has(id)) || (book.slug && slugs.has(book.slug))) return false;
    if (id) ids.add(id);
    if (book.slug) slugs.add(book.slug);
    return true;
  });
}

export async function fetchCatalogPage(query: CatalogQuery, signal: AbortSignal) {
  const { data } = await getPublic("/books", { params: catalogParams(query), signal });
  const { items, pages } = parseCollectionPage<Book>(data, "books");
  if (pages === null) throw new Error("The catalog response omitted pagination.");
  return { books: uniqueBooks(items), pages };
}

export async function fetchSearchBooks(query: string, page: number, signal: AbortSignal) {
  const limit = 12;
  const { data } = await getPublic("/search", { params: { q: query.trim(), page, limit }, signal });
  const { items, pages } = parseCollectionPage<Book>(data, "books");
  return { books: uniqueBooks(items), pages: pages ?? (items.length === limit ? page + 1 : page) };
}
