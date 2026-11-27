import { parseCollectionPage } from "@/lib/catalog-data";
import type { Book } from "@/types";

type CollectionBook = Partial<Book> & { cover?: string; purchasedAt?: string; orderNumber?: string };
type CollectionEntry<T> = T & { book?: T | string; order?: { orderNumber?: string } };

export function parseReaderCollection<T extends CollectionBook>(data: unknown, collection: "library" | "wishlist") {
  const page = parseCollectionPage<CollectionEntry<T>>(data, collection, collection === "library" ? "books" : undefined);
  const books = new Map<string, T>();
  for (const entry of page.items) {
    const book = entry.book === undefined ? entry : typeof entry.book === "object" ? entry.book : null;
    const id = book?._id || book?.id;
    if (!book || typeof id !== "string" || !id || books.has(id)) continue;
    books.set(id, {
      ...book,
      purchasedAt: entry.purchasedAt ?? book.purchasedAt ?? (entry.book ? entry.createdAt : undefined),
      orderNumber: entry.order?.orderNumber ?? entry.orderNumber ?? book.orderNumber,
    });
  }
  return { books: [...books.values()], pages: page.pages ?? 1, total: page.total };
}
