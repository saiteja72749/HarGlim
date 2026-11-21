import type { AuthorBook } from '@/types/author-api';
import api from '@/lib/api';

/** Retrieve the author's whole backend list, including pages beyond the first 100 records. */
export async function fetchAuthorBooks(params: Record<string, string | number> = {}): Promise<AuthorBook[]> {
  const books: AuthorBook[] = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const { data } = await api.get('/authors/me/books', { params: { ...params, page, limit: 100 }, cache: 'no-store' });
    const body = data?.data ?? data;
    const list = [body?.books, body?.items, body].find(Array.isArray);
    if (!list) throw new Error('The backend returned an invalid author book list.');
    books.push(...list);
    const pagination = body?.pagination ?? data?.pagination;
    const totalPages = Number(pagination?.pages ?? pagination?.totalPages ?? (pagination?.total !== undefined ? Math.ceil(Number(pagination.total) / 100) : 1));
    if (!Number.isFinite(totalPages) || totalPages > 100) throw new Error('The backend returned invalid author book pagination.');
    pages = Math.max(1, totalPages);
  }
  return books;
}
