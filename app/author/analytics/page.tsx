"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  ShoppingCart,
  DollarSign,
  Star,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { extractList } from "@/lib/tracking";
import { useAuthStore } from "@/store/auth-store";
import { useHashSection } from "@/hooks/use-hash-section";

const RANGES = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "365d", label: "1 year" },
];

const num = (...values: any[]) => {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

// Performance rows: { bookId|book, title, unitsSold, grossRevenue, knownRoyalty, status, ... }
const perfTitle = (b: any) => b.title || b.book?.title || "Untitled";
const perfUnits = (b: any) => num(b.unitsSold, b.totalSales, b.sales);
const perfGross = (b: any) => num(b.grossRevenue, b.grossBookRevenue, b.revenue);
const perfRoyalty = (b: any) => num(b.knownRoyalty, b.royalty, b.royaltyEarned, b.accruedRoyalty);
const perfStatus = (b: any) => String(b.status || b.publishingStatus || b.book?.status || "").toLowerCase();
const perfRating = (b: any) => num(b.ratings, b.rating, b.book?.ratings);

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  useHashSection(!loading);
  const [range, setRange] = useState("30d");
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const noStore = { cache: "no-store" } as any;
      const [analyticsRes, perfRes] = await Promise.allSettled([
        api.get("/authors/me/analytics", { params: { range }, ...noStore }),
        api.get("/authors/me/books/performance", noStore),
      ]);

      if (analyticsRes.status === "fulfilled") {
        setAnalyticsData(analyticsRes.value.data?.data || analyticsRes.value.data);
      }
      if (perfRes.status === "fulfilled") {
        setPerformanceData(extractList(perfRes.value.data, "books"));
      }
    } catch (err) {
      console.error("Failed to fetch author analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [user, range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const summary = { ...(analyticsData || {}), ...(analyticsData?.summary || {}), ...(analyticsData?.totals || {}) };
  const series: any[] = (
    analyticsData?.series ||
    analyticsData?.daily ||
    analyticsData?.timeSeries ||
    analyticsData?.data ||
    []
  ) as any[];
  const seriesRows = Array.isArray(series) ? series : [];

  const publishedCount = performanceData.filter((b) => perfStatus(b) === "published").length;
  const totalUnits = num(summary.unitsSold, summary.totalUnitsSold, performanceData.reduce((s, b) => s + perfUnits(b), 0));
  const grossRevenue = num(summary.grossBookRevenue, summary.grossRevenue, summary.revenue, performanceData.reduce((s, b) => s + perfGross(b), 0));
  const royalty = num(summary.royalty, summary.accruedKnown, summary.knownRoyalty, performanceData.reduce((s, b) => s + perfRoyalty(b), 0));
  const unresolved = num(summary.historicalUnresolvedSales, summary.unresolvedSales, summary.historicalUnresolvedCount);
  const rated = performanceData.filter((b) => perfRating(b) > 0);
  const avgRating = rated.length ? rated.reduce((s, b) => s + perfRating(b), 0) / rated.length : 0;

  const stats = [
    { label: "Published Titles", value: `${publishedCount}`, sub: `${performanceData.length} titles total`, icon: BookOpen, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Units Sold", value: totalUnits.toLocaleString("en-IN"), sub: `Last ${RANGES.find((r) => r.value === range)?.label}`, icon: ShoppingCart, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { label: "Gross Book Revenue", value: `₹${grossRevenue.toLocaleString("en-IN")}`, sub: "Before royalty split", icon: TrendingUp, color: "text-indigo-500", bgColor: "bg-indigo-500/10" },
    { label: "Royalty Earned", value: `₹${royalty.toLocaleString("en-IN")}`, sub: "Known royalty", icon: DollarSign, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Average Rating", value: rated.length ? avgRating.toFixed(1) : "—", sub: `${rated.length} rated titles`, icon: Star, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  ];

  const maxUnits = Math.max(1, ...seriesRows.map((r) => num(r.unitsSold, r.units, r.quantity)));

  if (loading && !analyticsData) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif lg:text-3xl text-foreground">Author Analytics</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sales, revenue and royalty for your books</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-xs rounded-md ${range === r.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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

      {unresolved > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {unresolved} historical sale{unresolved > 1 ? "s were" : " was"} recorded before royalty rates were stored per order. Those
            lines have no known royalty and are not included in settlements.
          </span>
        </div>
      )}

      {/* Daily time series */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {seriesRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales in this period.</p>
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
                          {date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).toLocaleDateString("en-IN") : String(date || "—")}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded bg-emerald-500/70" style={{ width: `${(units / maxUnits) * 100}%`, minWidth: units ? 4 : 0 }} />
                            <span className="tabular-nums text-xs">{units}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums">₹{num(row.grossRevenue, row.revenue).toLocaleString("en-IN")}</td>
                        <td className="py-2 px-3 text-right tabular-nums text-emerald-700">₹{num(row.royalty, row.knownRoyalty, row.royaltyAmount).toLocaleString("en-IN")}</td>
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
                    <th className="py-3 px-4">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {performanceData.map((book: any, i) => (
                    <tr key={book.bookId || book._id || book.id || i} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{perfTitle(book)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] capitalize">{perfStatus(book).replace(/_/g, " ") || "—"}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">{perfUnits(book).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right tabular-nums">₹{perfGross(book).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 tabular-nums">₹{perfRoyalty(book).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium">{perfRating(book).toFixed(1)}</span>
                        </div>
                      </td>
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
