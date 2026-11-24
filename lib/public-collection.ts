import { getPublic } from '@/lib/api';
import { parseCollectionPage } from '@/lib/catalog-data';

/** Real public pages; reject nonadvancing pagination instead of returning an incomplete success. */
export async function fetchPublicCollection<T extends { _id?: string; id?: string }>(path: string, collection: string, signal: AbortSignal, params: Record<string, string> = {}): Promise<T[]> {
  const records = new Map<string, T>();
  let page = 1;
  while (!signal.aborted) {
    const response = await getPublic(path, { params: { ...params, page, limit: 100 }, signal });
    const parsed = parseCollectionPage<T>(response.data, collection);
    const previousSize = records.size;
    for (const item of parsed.items) {
      const id = item._id || item.id;
      if (!id) throw new Error('A backend record is missing its identity. Please retry.');
      records.set(id, item);
    }
    if (parsed.pages !== null ? page >= parsed.pages : parsed.items.length < 100) break;
    if (records.size === previousSize || page >= 1000) throw new Error('Public pagination did not advance. Please retry.');
    page++;
  }
  signal.throwIfAborted();
  return [...records.values()];
}
