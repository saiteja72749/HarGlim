import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { lastModified } from '@/lib/seo-data';
import { API_URL } from '@/config/backend.mjs';
import { parseCollectionPage } from '@/lib/catalog-data';
import { isRejectedEnvelope, record } from '@/lib/api-error';

type PublicRecord = { slug?: string; _id?: string; updatedAt?: string };
const publicCollections = ['books', 'authors'] as const;

async function publicRecords(collection: typeof publicCollections[number]): Promise<PublicRecord[]> {
  const records = new Map<string, PublicRecord>();
  try {
    for (let page = 1; page <= 1000; page++) {
      const response = await fetch(`${API_URL}/${collection}?page=${page}&limit=100`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload: unknown = await response.json();
      if (isRejectedEnvelope(payload)) throw new Error('The backend rejected the public list request');
      const { items, pages } = parseCollectionPage<unknown>(payload, collection);
      const previous = records.size;
      for (const item of items) {
        const value = record(item);
        const key = typeof value._id === 'string' ? value._id : typeof value.slug === 'string' ? value.slug : null;
        if (key) records.set(key, {
          _id: typeof value._id === 'string' ? value._id : undefined,
          slug: typeof value.slug === 'string' ? value.slug : undefined,
          updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
        });
      }
      if (pages !== null ? page >= pages : items.length < 100) break;
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
