import { MetadataRoute } from 'next';

type SitemapRecord = {
  slug?: string;
  _id?: string;
  updatedAt?: string;
  name?: string;
};

function isSitemapRecord(value: unknown): value is SitemapRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.slug === undefined || typeof record.slug === 'string') &&
    (record._id === undefined || typeof record._id === 'string') &&
    (record.updatedAt === undefined || typeof record.updatedAt === 'string') &&
    (record.name === undefined || typeof record.name === 'string')
  );
}

function getRecords(value: unknown): SitemapRecord[] {
  if (Array.isArray(value)) return value.filter(isSitemapRecord);
  if (typeof value === 'object' && value !== null && 'data' in value) {
    return getRecords(value.data);
  }
  return [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com').replace(/\/+$/, '');
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';

  try {
    // Fetch all books, categories, and authors for the sitemap
    const [booksRes, categoriesRes, authorsRes] = await Promise.all([
      fetch(`${API_URL}/books?limit=1000`, { next: { revalidate: 3600 } }).catch((e) => {
        console.error('sitemap: failed to fetch books', e);
        return null;
      }),
      fetch(`${API_URL}/categories?limit=100`, { next: { revalidate: 3600 } }).catch((e) => {
        console.error('sitemap: failed to fetch categories', e);
        return null;
      }),
      fetch(`${API_URL}/authors?limit=1000`, { next: { revalidate: 3600 } }).catch((e) => {
        console.error('sitemap: failed to fetch authors', e);
        return null;
      }),
    ]);

    if (booksRes && !booksRes.ok) console.error(`sitemap: books request returned ${booksRes.status}`);
    if (categoriesRes && !categoriesRes.ok) console.error(`sitemap: categories request returned ${categoriesRes.status}`);
    if (authorsRes && !authorsRes.ok) console.error(`sitemap: authors request returned ${authorsRes.status}`);

    const [booksData, categoriesData, authorsData] = await Promise.all([
      booksRes?.ok ? booksRes.json() as Promise<unknown> : [],
      categoriesRes?.ok ? categoriesRes.json() as Promise<unknown> : [],
      authorsRes?.ok ? authorsRes.json() as Promise<unknown> : [],
    ]);
    const books = getRecords(booksData);
    const categories = getRecords(categoriesData);
    const authors = getRecords(authorsData);

    const sitemapEntries: MetadataRoute.Sitemap = [
      { url: `${baseUrl}/` },
      { url: `${baseUrl}/about` },
      { url: `${baseUrl}/author-guidelines` },
      { url: `${baseUrl}/careers` },
      { url: `${baseUrl}/contact` },
      { url: `${baseUrl}/faq` },
      { url: `${baseUrl}/publish` },
      { url: `${baseUrl}/royalty-info` },
      { url: `${baseUrl}/returns` },
      { url: `${baseUrl}/terms` },
      { url: `${baseUrl}/privacy` },
      { url: `${baseUrl}/books` },
      { url: `${baseUrl}/authors` },
      { url: `${baseUrl}/categories` },
    ];

    // Add books
    books.forEach((book) => {
      if (book.slug || book._id) {
        sitemapEntries.push({
          url: `${baseUrl}/books/${book.slug || book._id}`,
          ...(book.updatedAt ? { lastModified: new Date(book.updatedAt) } : {}),
        });
      }
    });

    // Add categories
    categories.forEach((cat) => {
      const slug = cat.slug || cat.name?.toLowerCase().replace(/ /g, '-');
      if (slug) {
        sitemapEntries.push({
          url: `${baseUrl}/categories/${slug}`,
          ...(cat.updatedAt ? { lastModified: new Date(cat.updatedAt) } : {}),
        });
      }
    });

    // Add authors
    authors.forEach((author) => {
      if (author._id) {
        sitemapEntries.push({
          url: `${baseUrl}/authors/${author._id}`,
          ...(author.updatedAt ? { lastModified: new Date(author.updatedAt) } : {}),
        });
      }
    });

    return sitemapEntries;
  } catch (error) {
    console.error('sitemap: falling back to static sitemap after unexpected error', error);
    return [
      { url: `${baseUrl}/` },
      { url: `${baseUrl}/books` },
    ];
  }
}
