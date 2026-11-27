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

export function bookPresentation(book: Pick<Book, 'price' | 'mrp' | 'stock' | 'reservedStock'>) {
  const price = publishedNumber(book.price);
  const mrp = publishedNumber(book.mrp);
  const stock = publishedNumber(book.stock);
  const reserved = publishedNumber(book.reservedStock) ?? 0;
  return {
    price,
    mrp,
    outOfStock: stock !== null && stock - reserved <= 0,
  };
}
