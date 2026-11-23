import { notFound } from 'next/navigation';
import { BookDetailView } from '@/components/books/book-detail-view';
import { fetchRecord, MISSING } from '@/lib/fetch-record';
import type { Book } from '@/types';

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await fetchRecord<Book>(`/books/${encodeURIComponent(slug)}`);
  if (book === MISSING) notFound();
  return <BookDetailView key={slug} initialBook={book} />;
}
