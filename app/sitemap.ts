import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { lastModified } from '@/lib/seo-data';

type PublicRecord = { slug?: string; _id?: string; updatedAt?: string };
const publicCollections = ['books', 'authors'] as const;
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

async function publicRecords(collection: typeof publicCollections[number]): Promise<PublicRecord[]> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';
  const records = new Map<string, PublicRecord>();
  try {
    for (let page = 1; page <= 1000; page++) {
      const response = await fetch(`${base}/${collection}?page=${page}&limit=100`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      const envelope = object(payload), data = object(envelope.data);
      const items = [data[collection], envelope.data, envelope[collection], payload].find(Array.isArray);
      if (!Array.isArray(items)) throw new Error('Invalid public list envelope');
      const previous = records.size;
      for (const item of items) {
        const value = object(item);
        const key = typeof value._id === 'string' ? value._id : typeof value.slug === 'string' ? value.slug : null;
        if (key) records.set(key, value as PublicRecord);
      }
      const pagination = object(envelope.pagination ?? data.pagination);
      const pages = pagination.pages ?? pagination.totalPages;
      if (typeof pages === 'number' ? page >= pages : items.length < 100) break;
      if (records.size === previous) throw new Error('Public pagination did not advance');
    }
  } catch (error) {
    // Keep already verified public URLs if a later page is temporarily unavailable.
    console.error(`sitemap: ${collection} incomplete`, error instanceof Error ? error.message : 'Request failed');
  }
  return [...records.values()];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/+$/, '');
  const paths = ['', '/about', '/author-guidelines', '/careers', '/contact', '/faq', '/publish', '/royalty-info', '/returns', '/terms', '/privacy', '/books', '/authors', '/spotlight'];
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${base}${path || '/'}` }));
  const collections = await Promise.all(publicCollections.map(publicRecords));
  for (const [index, items] of collections.entries()) {
    const name = publicCollections[index];
    for (const item of items) {
      const identity = name === 'authors' ? item._id : item.slug;
      if (!identity) continue;
      const modified = lastModified(item.updatedAt);
      entries.push({ url: `${base}/${name}/${encodeURIComponent(identity)}`, ...(modified ? { lastModified: modified } : {}) });
    }
  }
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}
