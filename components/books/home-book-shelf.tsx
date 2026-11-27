"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CompactBookCover } from "@/components/books/compact-book-cover";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { fetchCatalogPage } from "@/lib/catalog";
import { publicApiMessage, publicRetryAt } from "@/lib/api-error";
import { onLiveChange } from "@/lib/live-sync";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Book } from "@/types";

const EMPTY_BOOKS: Book[] = [];

function moveShelf(element: HTMLUListElement, direction: -1 | 1, reduceMotion: boolean) {
  const [first, second] = element.children;
  if (!first || !second) return;
  const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
  const end = element.scrollWidth - element.clientWidth;
  const left = Math.max(0, Math.min(end, element.scrollLeft + direction * step));
  element.scrollTo({ left, behavior: reduceMotion ? "instant" : "smooth" });
}

export function HomeBookShelf() {
  const list = useRef<HTMLUListElement>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [result, setResult] = useState<{ attempt: number; books: Book[]; error?: unknown }>();
  const [attempt, setAttempt] = useState(0);
  const current = result?.attempt === attempt ? result : undefined;
  const { books = EMPTY_BOOKS, error } = current ?? {};
  const loading = !current;
  const [edges, setEdges] = useState({ previous: false, next: false });
  const showControls = !loading && !error && (edges.previous || edges.next);

  useEffect(() => {
    const controller = new AbortController();
    fetchCatalogPage({ page: 1, limit: 10 }, controller.signal)
      .then(({ books }) => { if (!controller.signal.aborted) setResult({ attempt, books: books.filter((book) => book.slug?.trim() && book.title?.trim()) }); })
      .catch((error) => { if (!controller.signal.aborted) setResult({ attempt, books: EMPTY_BOOKS, error }); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => onLiveChange("books", () => {
    setAttempt((value) => value + 1);
  }, 60_000), []);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const sync = () => {
      const previous = element.scrollLeft > 1;
      const next = element.scrollLeft < element.scrollWidth - element.clientWidth - 1;
      setEdges(current => current.previous === previous && current.next === next ? current : { previous, next });
    };
    sync();
    const width = new ResizeObserver(sync);
    width.observe(element);
    element.addEventListener("scroll", sync, { passive: true });
    return () => {
      width.disconnect();
      element.removeEventListener("scroll", sync);
    };
  }, [books, loading, error]);

  const move = (direction: -1 | 1) => {
    if (list.current) moveShelf(list.current, direction, reduceMotion);
  };

  return (
    <section className="mx-auto max-w-[96rem] space-y-5 px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="home-books">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-books" className="font-serif text-3xl font-semibold">Books</h2>
        <div className="flex flex-wrap gap-2">
          {showControls && <div className="hidden gap-2 md:flex">
            <Button variant="outline" size="icon" className="size-11 rounded-full" aria-label="Previous books"
              aria-controls="home-book-shelf" disabled={!edges.previous} onClick={() => move(-1)}><ArrowLeft aria-hidden="true" /></Button>
            <Button variant="outline" size="icon" className="size-11 rounded-full" aria-label="Next books"
              aria-controls="home-book-shelf" disabled={!edges.next} onClick={() => move(1)}><ArrowRight aria-hidden="true" /></Button>
          </div>}
          <Button variant="outline" asChild className="min-h-11"><Link href="/books">View All Books</Link></Button>
        </div>
      </div>
      {error ? <ErrorState title="Books could not load" message={publicApiMessage(error, "Please retry to load the catalog.")}
          retryAt={publicRetryAt(error)} onRetry={() => setAttempt((n) => n + 1)} />
        : loading || books.length ? (
            <ul id="home-book-shelf" ref={list} aria-label="Books from the catalog" aria-busy={loading} tabIndex={loading ? undefined : 0}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  move(event.key === "ArrowLeft" ? -1 : 1);
                }
              }}
              className="grid min-w-0 snap-x snap-mandatory auto-cols-[42%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain py-1 focus-visible:outline-2 sm:auto-cols-[calc((100%_-_2.25rem)/4)] lg:auto-cols-[calc((100%_-_4rem)/5)] lg:gap-4 xl:auto-cols-[calc((100%_-_5rem)/6)] min-[90rem]:auto-cols-[calc((100%_-_6rem)/7)] min-[100rem]:auto-cols-[calc((100%_-_7rem)/8)]">
              {loading
                ? Array.from({ length: 8 }, (_, i) => <li key={i} className="min-w-0 snap-start motion-safe:animate-pulse" aria-hidden="true">
                    <div className="aspect-[2/3] rounded-md bg-muted" /><div className="mt-2 h-10 w-4/5 rounded-md bg-muted" />
                  </li>)
                : books.map((book) => <li key={book.slug} className="min-w-0 snap-start">
                    <Link href={`/books/${encodeURIComponent(book.slug)}`} prefetch={false} data-home-book
                      className="group block rounded-md focus-visible:outline-2 focus-visible:-outline-offset-2">
                      <CompactBookCover source={book.coverImage} horizontal={false} />
                      <h3 className="mt-2 line-clamp-2 h-10 font-serif text-sm font-semibold leading-5 [overflow-wrap:anywhere] group-hover:underline sm:text-base">{book.title}</h3>
                    </Link>
                  </li>)}
            </ul>
        ) : <p className="text-muted-foreground">No published books are available.</p>}
    </section>
  );
}
