"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { CompactBookCard } from "@/components/books/book-card";
import { BookCardSkeleton } from "@/components/books/book-card-skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { fetchCatalogPage } from "@/lib/catalog";
import { publicApiMessage, publicRetryAt } from "@/lib/api-error";
import { onLiveChange } from "@/lib/live-sync";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Book } from "@/types";

const EMPTY_BOOKS: Book[] = [];
const AUTOPLAY_DELAY = 5000;

function moveShelf(element: HTMLUListElement, direction: -1 | 1, reduceMotion: boolean) {
  const [first, second] = element.children;
  if (!first || !second) return;
  const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
  const end = element.scrollWidth - element.clientWidth;
  const wrapping = direction === 1 ? element.scrollLeft >= end - 1 : element.scrollLeft <= 1;
  const left = wrapping
    ? (direction === 1 ? 0 : end)
    : Math.max(0, Math.min(end, element.scrollLeft + direction * step));
  element.scrollTo({ left, behavior: reduceMotion || wrapping ? "instant" : "smooth" });
}

export function HomeBookShelf() {
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [result, setResult] = useState<{ attempt: number; books: Book[]; error?: unknown }>();
  const [attempt, setAttempt] = useState(0);
  const current = result?.attempt === attempt ? result : undefined;
  const { books = EMPTY_BOOKS, error } = current ?? {};
  const loading = !current;
  const [canScroll, setCanScroll] = useState(false);
  const [paused, setPaused] = useState(false);
  const showControls = !loading && !error && books.length > 1 && canScroll;

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
    const sync = () => setCanScroll(element.scrollWidth - element.clientWidth > 1);
    sync();
    const width = new ResizeObserver(sync);
    width.observe(element);
    return () => width.disconnect();
  }, [books, loading, error]);

  useEffect(() => {
    const element = list.current;
    const region = section.current;
    if (!element || !region || !showControls || paused || reduceMotion) return;
    let inView = false;
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { threshold: 0.5 });
    observer.observe(element);
    const timer = window.setInterval(() => {
      if (inView && !document.hidden && !region.matches(":hover, :focus-within")) {
        moveShelf(element, 1, false);
      }
    }, AUTOPLAY_DELAY);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [books, showControls, paused, reduceMotion]);

  const move = (direction: -1 | 1) => {
    if (list.current) moveShelf(list.current, direction, reduceMotion);
  };

  return (
    <section ref={section} className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8" aria-labelledby="home-books">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-books" className="font-serif text-3xl font-semibold">Books</h2>
        <div className="flex flex-wrap gap-2">
          {showControls && !reduceMotion && (
            <Button variant="outline" size="icon" className="size-11" aria-label={paused ? "Resume book carousel" : "Pause book carousel"}
              aria-controls="home-book-shelf" onClick={() => setPaused(!paused)}>
              {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </Button>
          )}
          <Button variant="outline" asChild className="min-h-11"><Link href="/books">View All Books</Link></Button>
        </div>
      </div>
      {error ? <ErrorState title="Books could not load" message={publicApiMessage(error, "Please retry to load the catalog.")}
          retryAt={publicRetryAt(error)} onRetry={() => setAttempt((n) => n + 1)} />
        : loading || books.length ? (
          <div className="mx-auto grid max-w-[36rem] grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 sm:max-w-[40rem] sm:gap-4 lg:max-w-[49rem]">
            <Button variant="outline" size="icon" className="size-11 rounded-full" aria-label="Previous books"
              aria-controls="home-book-shelf" hidden={!showControls} onClick={() => move(-1)}><ArrowLeft aria-hidden="true" /></Button>
            <ul id="home-book-shelf" ref={list} aria-label="Books from the catalog" aria-busy={loading}
              className="col-start-2 row-start-1 grid min-w-0 snap-x snap-mandatory auto-cols-[100%] grid-flow-col gap-4 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] sm:auto-cols-[calc((100%_-_1rem)/2)] lg:auto-cols-[calc((100%_-_2rem)/3)]">
              {loading
                ? Array.from({ length: 3 }, (_, i) => <li key={i} className="flex min-w-0 snap-start justify-center"><BookCardSkeleton /></li>)
                : books.map((book) => <li key={book._id || book.id || book.slug} className="flex min-w-0 snap-start justify-center"><CompactBookCard book={book} /></li>)}
            </ul>
            <Button variant="outline" size="icon" className="col-start-3 row-start-1 size-11 rounded-full" aria-label="Next books"
              aria-controls="home-book-shelf" hidden={!showControls} onClick={() => move(1)}><ArrowRight aria-hidden="true" /></Button>
          </div>
        ) : <p className="text-muted-foreground">No published books are available.</p>}
    </section>
  );
}
