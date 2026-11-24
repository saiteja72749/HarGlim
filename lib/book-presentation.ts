import type { Book } from '@/types';

/** Missing business values stay missing; zero is a legitimate published value. */
export function publishedNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function getCartUnitPrice(book: Pick<Book, "price" | "discountPrice" | "mrp">) {
  return publishedNumber(book.price) ?? publishedNumber(book.discountPrice) ?? publishedNumber(book.mrp);
}

export function bookPresentation(book: Pick<Book, 'price' | 'mrp' | 'rating' | 'ratings' | 'reviewCount' | 'totalReviews' | 'stock' | 'reservedStock'>) {
  const price = publishedNumber(book.price);
  const mrp = publishedNumber(book.mrp);
  const aggregate = publishedNumber(book.ratings ?? book.rating);
  const count = publishedNumber(book.reviewCount ?? book.totalReviews);
  const stock = publishedNumber(book.stock);
  const reserved = publishedNumber(book.reservedStock) ?? 0;
  return {
    price,
    mrp,
    rating: aggregate !== null && aggregate <= 5 ? aggregate : null,
    reviewCount: count !== null && Number.isInteger(count) ? count : null,
    outOfStock: stock !== null && stock - reserved <= 0,
  };
}
