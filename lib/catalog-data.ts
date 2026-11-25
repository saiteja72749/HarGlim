import { publishedNumber } from '@/lib/book-presentation';

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export function parseCollectionPage<T>(payload: unknown, collection: string) {
  const envelope = record(payload), data = record(envelope.data);
  const items = [data[collection], envelope.data, envelope[collection], payload].find(Array.isArray);
  if (!Array.isArray(items) || items.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error('Invalid book list response. Please retry.');
  const pagination = record(envelope.pagination ?? data.pagination);
  const pages = publishedNumber(pagination.pages ?? pagination.totalPages);
  const total = publishedNumber(pagination.total);
  const limit = publishedNumber(pagination.limit);
  return { items: items as T[], pages: pages !== null ? Math.max(1, Math.ceil(pages)) : total !== null && limit ? Math.max(1, Math.ceil(total / limit)) : null };
}

export type CatalogTag = "all" | "featured" | "bestseller" | "newRelease";

const sortValues: Record<string, string> = {
  "price-low": "price_asc",
  "price-high": "price_desc",
  newest: "newest",
  featured: "featured",
};

export type CatalogQuery = {
  q?: string;
  category?: string;
  page: number;
  limit: number;
  format?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  tag?: CatalogTag;
};

export function catalogParams({ q, category, page, limit, format, minPrice, maxPrice, sort, tag }: CatalogQuery) {
  return {
    q: q?.trim() || undefined,
    category: category || undefined,
    page, limit, format, minPrice, maxPrice,
    sort: sortValues[sort || ""] || "newest",
    ...(tag && tag !== "all" ? { [tag]: true } : {}),
  };
}
