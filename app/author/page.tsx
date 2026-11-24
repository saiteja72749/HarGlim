"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuthorDashboardAccess } from "@/components/authors/author-dashboard-access";
import { AuthorDataNotice } from "@/components/authors/author-data-notice";
import api from "@/lib/api";
import { record } from "@/lib/api-error";
import { fetchAuthorBooks } from "@/lib/author-books";
import { getAuthorBookStage } from "@/lib/author-book-status";
import { authorPanelProblem } from "@/lib/author-panel";
import { publishedNumber } from "@/lib/book-presentation";
import { onLiveChange } from "@/lib/live-sync";
import type { AuthorBook } from "@/types/author-api";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const number = new Intl.NumberFormat("en-IN");

function metric(value: unknown, rupees = false) {
  const n = publishedNumber(value);
  return n === null ? "Unavailable" : (rupees ? money : number).format(n);
}

function StudioOverview() {
  const [dashboard, setDashboard] = useState<Record<string, unknown>>({});
  const [ownedBooks, setOwnedBooks] = useState<AuthorBook[] | null>(null);
  const [trend, setTrend] = useState<Record<string, unknown>[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [summary, manuscripts, analytics] = await Promise.allSettled([
      api.get("/authors/me/dashboard", { cache: "no-store" }),
      fetchAuthorBooks(),
      api.get("/authors/me/analytics", { params: { range: "30d" }, cache: "no-store" }),
    ]);
    setDashboard(summary.status === "fulfilled" ? record(summary.value.data?.data ?? summary.value.data) : {});
    setOwnedBooks(manuscripts.status === "fulfilled" ? manuscripts.value : null);
    const data = analytics.status === "fulfilled" ? record(analytics.value.data?.data ?? analytics.value.data) : {};
    setTrend(Array.isArray(data.series) ? data.series.map(record) : null);
    setProblem(authorPanelProblem([
      { label: "overview", result: summary },
      { label: "manuscripts", result: manuscripts },
      { label: "sales trend", result: analytics },
    ]));
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    return onLiveChange("author-data", refresh);
  }, [refresh]);

  const books = record(dashboard.books);
  const sales = record(dashboard.sales);
  const royalties = record(dashboard.royalties);
  const needsAction = ownedBooks?.filter((book) => ["draft", "changes_requested", "rejected"].includes(getAuthorBookStage(book)));
  const inReview = ownedBooks?.filter((book) => ["submitted", "under_review"].includes(getAuthorBookStage(book))).length;
  const recentSales = Array.isArray(dashboard.recentSales) ? dashboard.recentSales.map(record) : null;
  const metrics = [
    ["Published books", metric(books.published), "Current catalog"],
    ["Copies sold", metric(sales.unitsSold), "Lifetime sales"],
    ["Gross book revenue", metric(sales.grossBookRevenue, true), "Lifetime, before royalties"],
    ["Royalty earned", metric(royalties.accruedKnown ?? royalties.accrued, true), "Lifetime, known royalties"],
    ["Pending manuscripts", metric(inReview), "Submitted or in review"],
    ["Pending payout", metric(royalties.settledPendingPayment, true), "Approved settlements awaiting payment"],
  ];

  return (
    <div className="space-y-6" aria-busy={loading}>
      <header>
        <h1 className="font-serif text-3xl font-semibold">Author Studio Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your catalog, editorial submissions and recorded sales.</p>
      </header>
      <AuthorDataNotice message={problem} onRetry={refresh} />
      <div className="flex flex-wrap gap-2">
        <Button asChild><Link href="/author/manuscripts/new">Submit Manuscript</Link></Button>
        <Button asChild variant="outline"><Link href="/author/books">View My Books</Link></Button>
        <Button asChild variant="outline"><Link href="/author/royalties">View Royalties</Link></Button>
      </div>
      {loading && <p role="status" className="text-sm text-muted-foreground">Loading overview…</p>}
      {!loading && <>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value, period]) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <dt className="text-sm font-medium">{label}</dt>
              <dd className="mt-1 font-serif text-2xl font-semibold">{value}</dd>
              <dd className="mt-1 text-xs text-muted-foreground">{period}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="min-w-0 space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-serif text-xl font-semibold">Recent sales and royalties</h2>
            {recentSales?.length ? <ul className="divide-y">
              {recentSales.slice(0, 5).map((sale, index) => {
                const title = typeof sale.bookTitle === "string" && sale.bookTitle.trim() && (sale.bookId || sale.bookTitle !== "Book") ? sale.bookTitle : "Book title unavailable";
                const royalty = sale.royaltyStatus === "HISTORICAL_RATE_UNAVAILABLE" ? null : sale.accruedRoyalty;
                return <li key={`${sale.orderNumber}-${sale.bookId}-${index}`} className="py-2.5 [overflow-wrap:anywhere]">
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted-foreground">{metric(sale.quantity)} copies · {metric(sale.grossRevenue, true)} gross · {metric(royalty, true)} royalty</p>
                </li>;
              })}
            </ul> : <p className="text-sm text-muted-foreground">{recentSales ? "No recorded sales yet." : "Sales records unavailable."}</p>}
          </section>
          <div className="grid gap-4">
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <h2 className="font-serif text-xl font-semibold">Manuscripts needing attention</h2>
              {needsAction?.length ? <ul className="space-y-2">
                {needsAction.slice(0, 4).map((book) => <li key={book._id} className="text-sm [overflow-wrap:anywhere]">
                  <Link href="/author/manuscripts" className="underline">{book.title}</Link>
                  <span className="ml-2 text-muted-foreground capitalize">{getAuthorBookStage(book).replaceAll("_", " ")}</span>
                </li>)}
              </ul> : <p className="text-sm text-muted-foreground">{needsAction ? "No manuscripts need attention." : "Manuscript status unavailable."}</p>}
            </section>
            <section className="space-y-3 rounded-xl border bg-card p-4">
              <h2 className="font-serif text-xl font-semibold">Sales trend · last 30 days</h2>
              {trend?.length ? <ul className="space-y-1">
                {trend.slice(-5).map((point, index) => <li key={index} className="text-sm">
                  {String(point.date ?? point.day ?? point._id ?? "Date unavailable")} · {metric(point.unitsSold ?? point.units)} copies
                </li>)}
              </ul> : <p className="text-sm text-muted-foreground">{trend ? "No recorded sales in this period." : "Trend unavailable."}</p>}
              <Link href="/author/analytics" className="inline-flex min-h-11 items-center text-sm underline">View performance and analytics</Link>
            </section>
          </div>
        </div>
      </>}
    </div>
  );
}

export default function Page() {
  return <AuthorDashboardAccess><StudioOverview /></AuthorDashboardAccess>;
}
