import type { Metadata } from 'next';

/** The backend answered 404: the record does not exist. */
export const MISSING = 'missing' as const;

/** Title for a 404 caused by a missing book, author or category. */
export const notFoundMetadata: Metadata = { title: { absolute: 'Page Not Found | Harglim Publishers' } };

/**
 * One public record for a server layout (metadata, JSON-LD and the 404 decision).
 * Returns MISSING on a backend 404 so the layout can call notFound() before anything streams,
 * and null on network or server errors so the page still renders and loads the data itself.
 */
export async function fetchRecord(path: string): Promise<any | null | typeof MISSING> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 300 } }).catch(() => null);
  if (res?.status === 404) return MISSING;
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    return data?.data || data;
  } catch {
    return null;
  }
}
