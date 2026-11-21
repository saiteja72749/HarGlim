"use client";
import { describeApiError } from "@/lib/api-error";


import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { BookCard } from '@/components/books/book-card';
import { ErrorState } from '@/components/ui/error-state';
import type { Book } from '@/types';
import api from '@/lib/api';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);


  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const { data } = await api.get('/search', { params: { q: query.trim() }, signal: controller.signal });
        const items = data.data?.books || data.data || data || [];
        if (!controller.signal.aborted) setResults(Array.isArray(items) ? items : []);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to search books:", describeApiError(err));
        setError(true);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500); // 500ms debounce

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, retry]);

  return (
    <div className="bg-background min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
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
                placeholder="Search for a book or author..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="space-y-6">
            {query.trim().length === 0 ? (
              <div className="rounded-3xl border border-dashed border-muted p-10 text-center text-muted-foreground">
                Start typing to search our catalog, or browse all books.
              </div>
            ) : loading ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[2/3] bg-muted rounded-lg mb-4" />
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <ErrorState 
                title="Search failed"
                message="We encountered an error while searching. Please try again."
                onRetry={() => setRetry((value) => value + 1)}
              />
            ) : results.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-muted p-10 text-center text-muted-foreground">
                No books match &ldquo;{query}&rdquo;. Try a different keyword.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {results.map((book) => (
                  <BookCard key={book._id} book={book} variant="compact" />
                ))}
              </div>
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
