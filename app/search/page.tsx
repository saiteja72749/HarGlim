"use client";
import { describeApiError, publicApiMessage, publicRetryAt } from "@/lib/api-error";


import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { CompactBookCard } from '@/components/books/book-card';
import { BookCardSkeleton } from '@/components/books/book-card-skeleton';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import type { Book } from '@/types';
import { fetchSearchBooks } from '@/lib/catalog';

export default function SearchPage() {
  return <Suspense fallback={<p className="p-8">Loading search...</p>}><SearchContent /></Suspense>;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const requestedQuery = searchParams.get('q') || '';
  return <SearchResults key={requestedQuery} initialQuery={requestedQuery} />;
}

function SearchResults({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [retry, setRetry] = useState(0);
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(Boolean(initialQuery.trim()));
  const [loadedQuery, setLoadedQuery] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const search = query.trim();


  useEffect(() => {
    if (!search) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchSearchBooks(search, page, controller.signal);
        if (!controller.signal.aborted) {
          setResults(result.books);
          setPages(result.pages);
          setLoadedQuery(search);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to search books:", describeApiError(err));
        setError(err);
        setLoadedQuery(search);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, page, retry]);

  return (
    <div className="bg-background min-h-screen py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-6 lg:p-8 shadow-sm">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Search Books</h1>
              <p className="text-muted-foreground mt-2">
                Find books by title, author, or keyword.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-full border border-border bg-background px-4 py-3 shadow-sm">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                aria-label="Search books"
                aria-busy={Boolean(query.trim()) && (loading || loadedQuery !== query.trim())}
                placeholder="Search for a book or author..."
                value={query}
                onChange={(event) => {
                  if (event.target.value.trim() !== search) setPage(1);
                  setQuery(event.target.value);
                }}
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-6">
            {query.trim().length === 0 ? (
              <div className="rounded-3xl border border-dashed border-muted p-10 text-center text-muted-foreground">
                Start typing to search our catalog, or browse all books.
              </div>
            ) : loading || loadedQuery !== query.trim() ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => <BookCardSkeleton key={i} />)}
              </div>
            ) : error ? (
              <ErrorState 
                title="Search failed"
                message={publicApiMessage(error, 'Search results could not load. Please try again.')}
                retryAt={publicRetryAt(error)}
                onRetry={() => setRetry((value) => value + 1)}
              />
            ) : results.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-muted p-10 text-center text-muted-foreground">
                No books match &ldquo;{query}&rdquo;. Try a different keyword.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                {results.map((book) => (
                  <CompactBookCard key={book._id || book.id || book.slug} book={book} />
                ))}
              </div>
            )}
            {!error && !loading && search && loadedQuery === search && (pages > 1 || page > 1) && (
              <nav aria-label="Search results pages" className="flex flex-wrap items-center justify-center gap-3">
                <Button variant="outline" disabled={page <= 1} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</Button>
                <span className="text-sm">Page {page}</span>
                <Button variant="outline" disabled={page >= pages} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</Button>
              </nav>
            )}
          </div>

          <div className="mt-8 text-right">
            <Link href="/books">
              <span className="text-sm font-medium text-primary hover:text-primary/80">
                Browse all books
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
