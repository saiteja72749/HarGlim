"use client";



import type { AuthorAnalytics, BookPerformance, AnalyticsPoint } from "@/types/author-api";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { parseCollectionPage } from "@/lib/catalog-data";

import { useHashSection } from "@/hooks/use-hash-section";
import { authorPanelProblem } from "@/lib/author-panel";
import { onLiveChange } from "@/lib/live-sync";
import { AuthorDataNotice } from "@/components/authors/author-data-notice";
import { publishedNumber } from "@/lib/book-presentation";
import { authorAnalyticsDateQuery } from "@/lib/author-analytics-query";
import { AuthorDashboardAccess } from "@/components/authors/author-dashboard-access";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "1 year" },
];

const num = (...values: unknown[]) => {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

// Performance rows: { bookId|book, title, unitsSold, grossRevenue, knownRoyalty, status, ... }
const perfTitle = (book: BookPerformance) => book.title || book.book?.title || "Book title unavailable";
const perfStatus = (book: BookPerformance) => String(book.status || book.publishingStatus || book.book?.status || "").toLowerCase();
const display = (value: unknown, money = false, currency = "INR") => {
  const amount = publishedNumber(value);
  if (amount === null) return "Unavailable";
  if (!money) return amount.toLocaleString("en-IN");
  if (!/^[A-Z]{3}$/.test(currency)) return "Unavailable";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount);
};

export default function AnalyticsPage() {
  return <AuthorDashboardAccess><AnalyticsContent /></AuthorDashboardAccess>;
}

function AnalyticsContent() {
  const [period, setPeriod] = useState<{ range: string; revision: number; data: AuthorAnalytics | null; problem: string | null }>();
  const [range, setRange] = useState("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dateError, setDateError] = useState("");
  const [custom, setCustom] = useState<ReturnType<typeof authorAnalyticsDateQuery>>();
  const queryKey = custom ? `${custom.from}/${custom.to}` : range;
  const [performanceData, setPerformanceData] = useState<BookPerformance[]>([]);
  const [performanceLoaded, setPerformanceLoaded] = useState(false);
  const [performanceProblem, setPerformanceProblem] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const currentPeriod = period?.range === queryKey && period.revision === revision ? period : undefined;
  const loading = !currentPeriod;
  useHashSection(!loading);
  const analyticsData = currentPeriod?.data ?? null;
  const periodProblem = currentPeriod?.problem ?? null;
  const fetchAnalytics = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => onLiveChange("author-data", fetchAnalytics), [fetchAnalytics]);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/authors/me/analytics", { params: custom ?? { range }, cache: "no-store", signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setPeriod({ range: queryKey, revision, data: data?.data ?? data, problem: null });
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          const problem = authorPanelProblem([{ label: "sales analytics", result: { status: "rejected", reason } }]);
          setPeriod({ range: queryKey, revision, data: null, problem });
        }
      });
    return () => controller.abort();
  }, [custom, queryKey, range, revision]);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/authors/me/books/performance", { cache: "no-store", signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setPerformanceData(parseCollectionPage<BookPerformance>(data, "books").items);
        setPerformanceLoaded(true);
        setPerformanceProblem(null);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setPerformanceLoaded(false);
        setPerformanceData([]);
        setPerformanceProblem(authorPanelProblem([{ label: "lifetime per-book performance", result: { status: "rejected", reason } }]));
      });
    return () => controller.abort();
  }, [revision]);

  const summary: NonNullable<AuthorAnalytics["summary"]> = analyticsData?.summary ?? { ...analyticsData, ...analyticsData?.totals };
  const bounds = analyticsData?.bounds;
  const dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" });
  const series: AnalyticsPoint[] = (
    analyticsData?.series ||
    analyticsData?.daily ||
    analyticsData?.timeSeries ||
    analyticsData?.data ||
    []
  );
  const seriesRows = Array.isArray(series) ? series : [];

  const publishedCount = performanceData.filter((b) => perfStatus(b) === "published").length;
  const totalUnits = summary.units ?? summary.unitsSold ?? summary.totalUnitsSold;
  const grossRevenue = summary.revenue ?? summary.grossBookRevenue ?? summary.grossRevenue;
  const royalty = summary.knownRoyalty ?? summary.accruedKnown ?? summary.royalty;
  const unresolved = publishedNumber(summary.unresolvedLegacyCount ?? summary.historicalUnresolvedSales ?? summary.unresolvedSales ?? summary.historicalUnresolvedCount);
  const isPartial = summary.dataStatus === "PARTIAL";

  const stats = [
    { label: "Published Titles", value: performanceLoaded ? String(publishedCount) : "Unavailable", sub: "Current catalog", icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Units Sold", value: display(totalUnits), sub: custom ? "Custom period" : `Last ${RANGES.find((r) => r.value === range)?.label}`, icon: ShoppingCart, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { label: "Gross Book Revenue", value: display(grossRevenue, true, summary.currency), sub: "Selected period, before royalties", icon: TrendingUp, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { label: "Royalty Earned", value: display(royalty, true, summary.currency), sub: "Selected period, known royalty", icon: DollarSign, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  ];

  const maxUnits = Math.max(1, ...seriesRows.map((r) => num(r.unitsSold, r.units, r.quantity)));

  return (
    <div className="space-y-8" aria-busy={loading}>
      <AuthorDataNotice message={periodProblem || performanceProblem} onRetry={fetchAnalytics} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif lg:text-3xl text-foreground">Performance &amp; Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sales, revenue and royalty for your books</p>
          {bounds && Number.isFinite(Date.parse(bounds.from)) && Number.isFinite(Date.parse(bounds.to)) &&
            <p className="mt-1 text-sm text-muted-foreground">
              {dateFormatter.format(new Date(bounds.from))} to {dateFormatter.format(new Date(bounds.to))} UTC ({bounds.inclusion})
            </p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex max-w-full flex-wrap rounded-lg border p-0.5" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => { setCustom(undefined); setRange(r.value); setDateError(""); }}
                aria-pressed={!custom && range === r.value}
                className={`px-3 py-1.5 text-xs rounded-md ${!custom && range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
        event.preventDefault();
        const query = authorAnalyticsDateQuery(from, to);
        if (!query) { setDateError("Enter both dates with the start on or before the end."); return; }
        setDateError("");
        setCustom(query);
      }}>
        <label className="grid gap-1 text-sm">Start date (UTC)<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-9 rounded-md border bg-background px-2" /></label>
        <label className="grid gap-1 text-sm">End date (UTC)<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-9 rounded-md border bg-background px-2" /></label>
        <Button type="submit" variant="outline" size="sm">Apply dates</Button>
        {dateError && <p role="alert" className="text-sm text-destructive">{dateError}</p>}
      </form>
      {analyticsData?.summary && <dl className="flex flex-wrap gap-4 text-sm">
        <div><dt>Orders</dt><dd className="font-semibold">{display(summary.orderCount)}</dd></div>
        <div><dt>Sale lines</dt><dd className="font-semibold">{display(summary.saleLineCount)}</dd></div>
        <div><dt>Unresolved legacy lines</dt><dd className="font-semibold">{display(unresolved)}</dd></div>
        {summary.dataStatus && <div><dt>Royalty data</dt><dd className="font-semibold">{summary.dataStatus === "PARTIAL" ? "Partial" : summary.dataStatus === "COMPLETE" ? "Complete" : "Unavailable"}</dd></div>}
      </dl>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{stat.sub}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {(isPartial || (unresolved ?? 0) > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Some historical sales lack reliable royalty snapshots. The royalty amount shows only recorded values.
          </span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {seriesRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading sales…" : analyticsData ? "No sales in this period." : "Sales data is unavailable. Please retry."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-2 px-3 text-left">Date</th>
                    <th className="py-2 px-3 text-left w-1/3">Units</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                    <th className="py-2 px-3 text-right">Royalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {seriesRows.map((row, i) => {
                    const units = num(row.unitsSold, row.units, row.quantity);
                    const date = row.date || row.day || row._id;
                    return (
                      <tr key={String(date) + i}>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).toLocaleDateString("en-IN", { timeZone: "UTC" }) : String(date || "—")}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded bg-emerald-500/70" style={{ width: `${(units / maxUnits) * 100}%`, minWidth: units ? 4 : 0 }} />
                            <span className="tabular-nums text-xs">{units}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">{display(row.grossBookRevenue ?? row.grossRevenue ?? row.revenue, true, summary.currency)}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-emerald-700">{display(row.knownRoyalty ?? row.royalty ?? row.royaltyAmount, true, summary.currency)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Performance Table */}
      <Card id="performance" className="scroll-mt-20">
        <p className="px-5 text-sm text-muted-foreground">Lifetime per-book performance. The period selector applies to the trend and period summary above.</p>
        <CardHeader>
          <CardTitle className="text-lg">Book Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {performanceData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p>No titles or sales recorded yet.</p>
              <p className="text-xs">Once your submitted manuscripts are published, title analytics will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Units Sold</th>
                    <th className="py-3 px-4 text-right">Gross Revenue</th>
                    <th className="py-3 px-4 text-right">Known Royalty</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {performanceData.map((book, i) => (
                    <tr key={book.bookId || book._id || book.id || i} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{perfTitle(book)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] capitalize">{perfStatus(book).replace(/_/g, " ") || "—"}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">{display(book.unitsSold)}</td>
                      <td className="py-3 px-4 text-right tabular-nums">{display(book.grossBookRevenue ?? book.grossRevenue, true)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 tabular-nums">{display(book.knownAccruedRoyalty ?? book.knownRoyalty, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
