"use client";
import type { AuthorBook } from "@/types/author-api";
import { describeApiError } from "@/lib/api-error";


import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  PlusCircle,
  RefreshCw,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import { normalizeAuthorDashboard, type AuthorDashboardSummary } from "@/lib/author-dashboard";
import { AuthorSalesPanel } from "@/components/authors/author-sales-panel";
import { AuthorDataNotice } from "@/components/authors/author-data-notice";
import { authorPanelProblem } from "@/lib/author-panel";
import { onLiveChange } from "@/lib/live-sync";
import { getAuthorBookStage } from "@/lib/author-book-status";
import { AuthorDashboardAccess } from "@/components/authors/author-dashboard-access";
import { fetchAuthorBooks } from "@/lib/author-books";

type DashboardBook = Pick<Partial<AuthorBook>, "_id" | "id" | "slug" | "status" | "totalSales" | "unitsSold" | "copiesSold" | "sales" | "soldCount"> & { title: string; bookId?: string | null };

type AuthorDashboardData = {
  totalBooks: number;
  publishedBooks: number;
  manuscriptsCount: number;
  pendingCount: number;
  processingCount: number;
  rejectedCount: number;
  totalSold: number;
  totalEarnings: number;
  grossRevenue: number;
  eligibleUnsettled: number;
  pendingPayout: number;
  paidLifetime: number;
  recentBooks: DashboardBook[];
  manuscripts: AuthorBook[];
};

const emptyDashboardData: AuthorDashboardData = {
  totalBooks: 0,
  publishedBooks: 0,
  manuscriptsCount: 0,
  pendingCount: 0,
  processingCount: 0,
  rejectedCount: 0,
  totalSold: 0,
  totalEarnings: 0,
  grossRevenue: 0,
  eligibleUnsettled: 0,
  pendingPayout: 0,
  paidLifetime: 0,
  recentBooks: [],
  manuscripts: [],
};

const getNumber = (...values: unknown[]) => {
  for (const value of values) {
    // Number(null) and Number("") are 0: skip them so a missing field doesn't hide the fallback.
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const getSoldCount = (book: DashboardBook) =>
  getNumber(book?.totalSales, book?.unitsSold, book?.copiesSold, book?.sales, book?.soldCount);

const getBookId = (book: DashboardBook) => String(book?._id || book?.id || book?.bookId || book?.slug || book?.title || "");

const getStatusLabel = (status: unknown) => {
  const normalized = getAuthorBookStage({ status });
  if (normalized === "draft") return "Draft";
  if (["processing", "under_review", "in_editing", "submitted"].includes(normalized)) return "Processing";
  if (["approved", "published"].includes(normalized)) return "Published";
  if (["rejected", "revision_required", "changes_requested"].includes(normalized)) return "Needs Revision";
  return String(status || "Draft");
};

export default function AuthorDashboard() {
  return <AuthorDashboardAccess><AuthorDashboardContent /></AuthorDashboardAccess>;
}

function AuthorDashboardContent() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<AuthorDashboardData>(emptyDashboardData);
  const [loading, setLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [salesSummary, setSalesSummary] = useState<AuthorDashboardSummary | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [booksLoaded, setBooksLoaded] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const requestConfig = { cache: "no-store" as const };

      // Two calls cover the whole page: the grouped dashboard (book counts, sales, royalties,
      // topBooks, recentSales) and the author's own book list (manuscript statuses).
      const [dashboardRes, booksRes] = await Promise.allSettled([
        api.get("/authors/me/dashboard", requestConfig),
        fetchAuthorBooks({ sort: "-updatedAt" }),
      ]);

      const summary = dashboardRes.status === "fulfilled" ? normalizeAuthorDashboard(dashboardRes.value.data) : null;
      setSalesSummary(summary);
      setProblem(
        authorPanelProblem([
          { label: "your dashboard", result: dashboardRes },
          { label: "your book list", result: booksRes },
        ])
      );
      setBooksLoaded(booksRes.status === "fulfilled");
      const authorBooks = booksRes.status === "fulfilled" ? booksRes.value : [];

      const publishedBooksList = authorBooks.filter((book) => getAuthorBookStage(book) === "published");
      const manuscripts = authorBooks.filter(
        (book) => !["published", "archived"].includes(getAuthorBookStage(book))
      );

      const statusCounts = authorBooks.reduce(
        (counts, book) => {
          const status = getAuthorBookStage(book);
          if (status === "draft") counts.pending += 1;
          if (["processing", "under_review", "in_editing", "submitted"].includes(status)) {
            counts.processing += 1;
          }
          if (["rejected", "revision_required", "changes_requested"].includes(status)) {
            counts.rejected += 1;
          }
          return counts;
        },
        { pending: 0, processing: 0, rejected: 0 }
      );

      const nextData: AuthorDashboardData = {
        // The server's counts; the list is only a fallback when the dashboard did not load.
        totalBooks: summary ? summary.books.total : authorBooks.length,
        publishedBooks: summary ? summary.books.published : publishedBooksList.length,
        manuscriptsCount: manuscripts.length,
        pendingCount: statusCounts.pending,
        processingCount: statusCounts.processing,
        rejectedCount: statusCounts.rejected,
        totalSold: summary?.unitsSold ?? 0,
        totalEarnings: summary?.accrued ?? 0,
        grossRevenue: summary?.grossRevenue ?? 0,
        eligibleUnsettled: summary?.eligibleUnsettled ?? 0,
        pendingPayout: summary?.pendingPayout ?? 0,
        paidLifetime: summary?.paidLifetime ?? 0,
        recentBooks: (summary?.topBooks.length ? summary.topBooks : publishedBooksList).slice(0, 5),
        manuscripts: manuscripts.slice(0, 5),
      };

      setDashboardData(nextData);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn("Error fetching author dashboard data:", describeApiError(err));
      setSalesSummary(null);
      setBooksLoaded(false);
      setProblem("Couldn't load your dashboard. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
    // Coming back to the tab reloads, so changes made by the admin show without a refresh.
    return onLiveChange("author-data", fetchDashboardData);
  }, [fetchDashboardData]);

  const statCards = useMemo(
    () => [
      {
        label: "Total Books",
        value: salesSummary || booksLoaded ? dashboardData.totalBooks : "Unavailable",
        helper: `${dashboardData.publishedBooks} published`,
        icon: BookOpen,
        iconClass: "bg-[#0F3D3E] text-[#D4AF37]",
      },
      {
        label: "Copies Sold",
        value: salesSummary ? dashboardData.totalSold : "Unavailable",
        helper: "Live backend sales",
        icon: ShoppingCart,
        iconClass: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
      },
      {
        label: "Pending",
        value: booksLoaded ? dashboardData.pendingCount : "Unavailable",
        helper: "Drafts or waiting review",
        icon: Clock,
        iconClass: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
      },
      {
        label: "Processing",
        value: booksLoaded ? dashboardData.processingCount : "Unavailable",
        helper: "Submitted or under review",
        icon: FileText,
        iconClass: "bg-blue-500/10 text-blue-700 border border-blue-500/20",
      },
      {
        label: "Needs Revision",
        value: booksLoaded ? dashboardData.rejectedCount : "Unavailable",
        helper: "Rejected or changes requested",
        icon: AlertCircle,
        iconClass: "bg-rose-500/10 text-rose-700 border border-rose-500/20",
      },
      {
        label: "Royalty Earned",
        value: salesSummary ? `₹${Number(dashboardData.totalEarnings).toLocaleString("en-IN")}` : "Unavailable",
        helper: salesSummary ? `From ₹${Number(dashboardData.grossRevenue).toLocaleString("en-IN")} gross book revenue` : "Royalty data could not be loaded",
        icon: DollarSign,
        iconClass: "bg-[#D4AF37]/20 text-[#0F3D3E] border border-[#D4AF37]/40",
      },
      {
        label: "Eligible for Payout",
        value: salesSummary ? `₹${Number(dashboardData.eligibleUnsettled).toLocaleString("en-IN")}` : "Unavailable",
        helper: "Not yet in a settlement",
        icon: Wallet,
        iconClass: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20",
      },
      {
        label: "Payout Pending",
        value: salesSummary ? `₹${Number(dashboardData.pendingPayout).toLocaleString("en-IN")}` : "Unavailable",
        helper: "Settled, awaiting transfer",
        icon: Clock,
        iconClass: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
      },
      {
        label: "Paid to You",
        value: salesSummary ? `₹${Number(dashboardData.paidLifetime).toLocaleString("en-IN")}` : "Unavailable",
        helper: "Lifetime payouts",
        icon: CheckCircle,
        iconClass: "bg-[#0F3D3E] text-[#D4AF37]",
      },
    ],
    [dashboardData, salesSummary, booksLoaded]
  );

  // Spinner only before the first load; later reloads update the figures in place.
  if (loading && !lastSyncedAt) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0F3D3E]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[#0F3D3E] font-sans">
      <AuthorDataNotice message={problem} onRetry={fetchDashboardData} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6DF] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Author Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-0.5">
            Welcome back, {user?.name || "Author"}! Track your books, sales, and royalty earnings.
          </p>
          {lastSyncedAt && (
            <p className="text-[11px] text-[#5C6E6E] mt-1">
              Last synced {lastSyncedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={fetchDashboardData}
            disabled={loading}
            className="h-11 rounded-xl text-xs font-bold gap-2 border-[#0F3D3E]/30 text-[#0F3D3E]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
          <Button
            asChild
            className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/40 font-serif font-bold text-xs h-11 px-5 rounded-xl shadow-xs gap-2"
          >
            <Link href="/author/manuscripts/new">
              <PlusCircle className="h-4 w-4" />
              <span>Submit New Manuscript</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between"
          >
            <div className="space-y-1 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                {stat.label}
              </span>
              <p className="text-3xl font-serif font-bold text-[#0F3D3E]">
                {typeof stat.value === "number" ? Number(stat.value).toLocaleString("en-IN") : stat.value}
              </p>
              <p className="text-[11px] text-[#5C6E6E]">{stat.helper}</p>
            </div>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${stat.iconClass}`}>
              <stat.icon className="h-6 w-6" />
            </div>
          </Card>
        ))}
      </div>

      {salesSummary && (salesSummary.topBooks.length > 0 || salesSummary.recentSales.length > 0) && (
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-serif font-bold text-[#0F3D3E]">Your Book Sales</h2>
          <AuthorSalesPanel summary={salesSummary} />
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-serif font-bold text-[#0F3D3E]">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickActionCard
            href="/author/manuscripts/new"
            icon={<PlusCircle className="h-5 w-5" />}
            title="Submit Manuscript"
            description="Upload new book draft"
          />
          <QuickActionCard
            href="/author/books"
            icon={<BookOpen className="h-5 w-5" />}
            title="Manage Books"
            description="View published catalog"
          />
          <QuickActionCard
            href="/author/royalties"
            icon={<DollarSign className="h-5 w-5" />}
            title="Royalty Records"
            description="Sales and payout history"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <h3 className="font-serif font-bold text-base text-[#0F3D3E] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#D4AF37]" />
              <span>Book Sales</span>
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs text-[#0F3D3E] font-bold">
              <Link href="/author/books">View All</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {dashboardData.recentBooks.length === 0 ? (
              <EmptyPanel
                title="No book sales yet"
                text="Published titles and sold-copy counts will appear here after backend sales are recorded."
              />
            ) : (
              dashboardData.recentBooks.map((book) => (
                <div key={getBookId(book)} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-xs text-[#0F3D3E] truncate">
                      {book.title || "Untitled Book"}
                    </p>
                    <p className="text-[11px] text-[#5C6E6E]">
                      {getSoldCount(book).toLocaleString("en-IN")} copies sold
                    </p>
                  </div>
                  <Badge className="bg-[#0F3D3E]/10 text-[#0F3D3E] border border-[#0F3D3E]/20 text-[10px] shrink-0">
                    {getStatusLabel(book.status)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <h3 className="font-serif font-bold text-base text-[#0F3D3E] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              <span>Manuscript Pipeline</span>
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs text-[#0F3D3E] font-bold">
              <Link href="/author/manuscripts">View All</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {dashboardData.manuscripts.length === 0 ? (
              <EmptyPanel
                title="No manuscripts in progress"
                text="Draft, pending, and processing manuscripts will sync here from the backend."
              />
            ) : (
              dashboardData.manuscripts.map((item) => (
                <div key={getBookId(item)} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-xs text-[#0F3D3E] truncate">
                      {item.title || "Untitled Manuscript"}
                    </p>
                    <p className="text-[11px] text-[#5C6E6E]">
                      {item.updatedAt || item.createdAt
                        ? `Updated ${new Date(item.updatedAt || item.createdAt || "").toLocaleDateString("en-IN")}`
                        : "Awaiting backend timestamp"}
                    </p>
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] shrink-0">
                    {getStatusLabel(getAuthorBookStage(item))}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="font-serif font-bold text-sm text-[#0F3D3E] group-hover:text-[#D4AF37] transition-colors truncate">
              {title}
            </h3>
            <p className="text-[11px] text-[#5C6E6E] truncate">{description}</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#5C6E6E] group-hover:translate-x-1 transition-transform shrink-0" />
      </Card>
    </Link>
  );
}

function EmptyPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E2E6DF] bg-[#F8F9F7] p-5 text-center">
      <CheckCircle className="h-6 w-6 mx-auto text-[#5C6E6E]/50 mb-2" />
      <p className="text-sm font-serif font-bold text-[#0F3D3E]">{title}</p>
      <p className="text-xs text-[#5C6E6E] mt-1">{text}</p>
    </div>
  );
}
