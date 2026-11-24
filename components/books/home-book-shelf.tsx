"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CompactBookCard } from "@/components/books/book-card";
import { BookCardSkeleton } from "@/components/books/book-card-skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { fetchCatalogPage } from "@/lib/catalog";
import { publicApiMessage, publicRetryAt } from "@/lib/api-error";
import { onLiveChange } from "@/lib/live-sync";
import type { Book } from "@/types";

const EMPTY_BOOKS: Book[] = [];

export function HomeBookShelf() {
  const list = useRef<HTMLUListElement>(null);
  const [result, setResult] = useState<{ attempt: number; books: Book[]; error?: unknown }>();
  const [attempt, setAttempt] = useState(0);
  const current = result?.attempt === attempt ? result : undefined;
  const { books = EMPTY_BOOKS, error } = current ?? {};
  const loading = !current;
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogPage({ page: 1, limit: 10 }, controller.signal)
      .then(({ books }) => { if (!controller.signal.aborted) setResult({ attempt, books }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ attempt, books: EMPTY_BOOKS, error }); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => onLiveChange("books", () => {
    setAttempt((value) => value + 1);
  }, 20_000), []);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const sync = () => {
      const start = element.scrollLeft <= 1;
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
      setEdges((previous) => previous.start === start && previous.end === end ? previous : { start, end });
    };
    sync();
    element.addEventListener("scroll", sync, { passive: true });
    const width = new ResizeObserver(sync);
    width.observe(element);
    return () => { element.removeEventListener("scroll", sync); width.disconnect(); };
  }, [books, loading, error]);

  const move = (direction: number) => {
    const element = list.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };

  return (
    <section className="mx-auto max-w-7xl space-y-4 px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="home-books">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-books" className="font-serif text-3xl font-semibold">Books</h2>
        <div className="flex flex-wrap gap-2">
          {!!books.length && !error && <div className="hidden gap-2 md:flex">
            <Button variant="outline" size="icon" aria-label="Previous books" aria-controls="home-book-shelf" disabled={edges.start} onClick={() => move(-1)}><ArrowLeft aria-hidden="true" /></Button>
            <Button variant="outline" size="icon" aria-label="Next books" aria-controls="home-book-shelf" disabled={edges.end} onClick={() => move(1)}><ArrowRight aria-hidden="true" /></Button>
          </div>}
          <Button variant="outline" asChild className="min-h-11"><Link href="/books">View All Books</Link></Button>
        </div>
      </div>
      {error ? <ErrorState title="Books could not load" message={publicApiMessage(error, "Please retry to load the catalog.")}
          retryAt={publicRetryAt(error)} onRetry={() => setAttempt((n) => n + 1)} />
        : loading || books.length ? <ul id="home-book-shelf" ref={list} aria-label="Books from the catalog" aria-busy={loading}
          className="flex snap-x gap-3 overflow-x-auto overscroll-x-contain pb-3">
          {loading ? Array.from({ length: 5 }, (_, i) => <li key={i} className="w-28 shrink-0 sm:w-36 lg:w-40"><BookCardSkeleton /></li>)
            : books.map((book) => <li key={book._id || book.id || book.slug} className="w-28 shrink-0 snap-start sm:w-36 lg:w-40"><CompactBookCard book={book} /></li>)}
        </ul> : <p className="text-muted-foreground">No published books are available.</p>}
    </section>
  );
}
