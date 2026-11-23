"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "@/components/ui/backend-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuthorDataNotice } from "@/components/authors/author-data-notice";
import { getAuthorBookStage } from "@/lib/author-book-status";
import { authorPanelProblem } from "@/lib/author-panel";
import { publishedNumber } from "@/lib/book-presentation";
import { parseCollectionPage } from "@/lib/catalog-data";
import { onLiveChange } from "@/lib/live-sync";
import api from "@/lib/api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { AuthorBook, BookPerformance } from "@/types/author-api";

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function rupees(value: unknown) {
  const amount = publishedNumber(value);
  return amount === null ? "Unavailable" : currency.format(amount);
}

function Listing({ book }: { book: AuthorBook }) {
  if (!book.slug || !["published", "active"].includes(String(book.status || "").toLowerCase())) return null;
  return <Button asChild variant="outline" size="sm" className="min-h-11">
    <Link href={`/books/${encodeURIComponent(book.slug)}`}>View Listing<span className="sr-only"> for {book.title}</span></Link>
  </Button>;
}

function BookIdentity({ book }: { book: AuthorBook }) {
  return <div className="flex min-w-0 items-center gap-3">
    <Image src={book.coverImage || "/placeholder-book.svg"} alt="" width={48} height={72} className="h-18 w-12 shrink-0 rounded bg-muted object-contain" />
    <p className="font-semibold [overflow-wrap:anywhere]">{book.title}</p>
  </div>;
}

function bookFields(book: AuthorBook, performance?: BookPerformance) {
  const category = book.category && typeof book.category === "object" ? book.category.name : null;
  const stage = getAuthorBookStage(book);
  return [
    ["Category", category || "Unavailable"],
    ["Status", stage.replaceAll("_", " ")],
    ["MRP", rupees(book.mrp)],
    ["Copies sold", publishedNumber(performance?.unitsSold ?? book.unitsSold)?.toLocaleString("en-IN") ?? "Unavailable"],
    ["Royalty per unit", rupees(performance?.royaltyPerCopy ?? book.royaltyPerCopy)],
  ];
}

export default function AuthorBooksPage() {
  const [books, setBooks] = useState<AuthorBook[]>([]);
  const [performance, setPerformance] = useState(new Map<string, BookPerformance>());
  const [query, setQuery] = useState("");
  const search = useDebouncedValue(query.trim());
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bookProblem, setBookProblem] = useState<string | null>(null);
  const [salesProblem, setSalesProblem] = useState<string | null>(null);
  const retry = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => onLiveChange(["author-data", "categories"], retry), [retry]);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setBookProblem(null);
      try {
        const { data } = await api.get("/authors/me/books", {
          params: { page, limit: 12, search: search || undefined, status: status || undefined },
          cache: "no-store", signal: controller.signal,
        });
        const result = parseCollectionPage<AuthorBook>(data, "books");
        if (controller.signal.aborted) return;
        setBooks(result.items);
        setPages(result.pages ?? 1);
        if (result.pages && page > result.pages) setPage(result.pages);
      } catch (reason) {
        if (controller.signal.aborted) return;
        setBooks([]);
        setBookProblem(authorPanelProblem([{ label: "your books", result: { status: "rejected", reason } }]));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [page, revision, search, status]);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/authors/me/books/performance", { cache: "no-store", signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const { items } = parseCollectionPage<BookPerformance>(data, "books");
        setPerformance(new Map(items.flatMap((row) => row.bookId ? [[row.bookId, row]] as const : [])));
        setSalesProblem(null);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setPerformance(new Map());
        setSalesProblem(authorPanelProblem([{ label: "lifetime book sales", result: { status: "rejected", reason } }]));
      });
    return () => controller.abort();
  }, [revision]);

  const pending = loading || query.trim() !== search;
  return (
    <div className="space-y-5" aria-busy={pending}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">My Books</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your author-owned titles and lifetime sales. The publishing team manages catalog edits.</p>
        </div>
        <Button asChild><Link href="/author/manuscripts/new">Submit New Manuscript</Link></Button>
      </header>
      <AuthorDataNotice message={bookProblem || salesProblem} onRetry={retry} />
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_12rem]">
        <div className="space-y-2">
          <Label htmlFor="owned-book-search">Search your books</Label>
          <Input id="owned-book-search" type="search" value={query} className="min-h-11"
            onChange={(event) => { setPage(1); setQuery(event.target.value); }} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owned-book-status">Publication status</Label>
          <select id="owned-book-status" className="min-h-11 w-full rounded-md border bg-card px-2 text-sm" value={status}
            onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft and editorial review</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      {pending ? <p role="status">Loading author books…</p> : !books.length
        ? !bookProblem && <p className="rounded-xl border bg-card p-5">No books match your filters.</p>
        : <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:hidden">
            {books.map((book) => (
              <li key={book._id} className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
                <BookIdentity book={book} />
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {bookFields(book, performance.get(book._id)).map(([label, value]) => <div key={label} className="min-w-0">
                    <dt className="text-muted-foreground">{label}</dt><dd className="capitalize [overflow-wrap:anywhere]">{value}</dd>
                  </div>)}
                </dl>
                <Listing book={book} />
              </li>
            ))}
          </ul>
          <div className="hidden rounded-xl border bg-card xl:block">
            <Table>
              <TableHeader><TableRow>
                {["Book", "Category", "Status", "MRP", "Copies sold", "Royalty per unit", "Listing"].map((title) => <TableHead key={title}>{title}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {books.map((book) => <TableRow key={book._id}>
                  <TableCell className="max-w-[17rem] whitespace-normal"><BookIdentity book={book} /></TableCell>
                  {bookFields(book, performance.get(book._id)).map(([label, value]) => <TableCell key={label} className="capitalize">{value}</TableCell>)}
                  <TableCell><Listing book={book} /></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </>}
      {pages > 1 && <nav aria-label="Author book pages" className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" disabled={page <= 1 || pending} onClick={() => setPage((n) => n - 1)}>Previous</Button>
        <span className="text-sm">Page {page} of {pages}</span>
        <Button variant="outline" disabled={page >= pages || pending} onClick={() => setPage((n) => n + 1)}>Next</Button>
      </nav>}
    </div>
  );
}
