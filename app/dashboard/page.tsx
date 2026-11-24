"use client";
import type { Book } from "@/types";
import type { OrderRecord } from "@/types/commerce-api";
import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError } from "@/lib/api-error";


import { useState, useEffect, useCallback } from "react";
import Image from '@/components/ui/backend-image';
import Link from "next/link";
import {
  BookOpen,
  ArrowRight,
  Package,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { canOpenAuthorDashboard, getAuthorApplicationState } from "@/lib/author-access";
import { ErrorState } from "@/components/ui/error-state";
import api from "@/lib/api";
import { extractList } from "@/lib/tracking";
import {
  FULFILMENT_META,
  PAYMENT_STATE_META,
  getFulfilmentStage,
  getOrderTotal,
  getPaymentState,
  indexPaymentsByOrder,
} from "@/lib/order-status";

// Unpaid orders show their payment state; paid orders show where the parcel is.
const getStatusBadge = (order: OrderRecord) => {
  const payment = getPaymentState(order);
  const meta =
    payment === "paid" || getFulfilmentStage(order) === "cancelled"
      ? FULFILMENT_META[getFulfilmentStage(order)]
      : PAYMENT_STATE_META[payment];
  return <Badge className={`${meta.tone} font-medium`}>{meta.label}</Badge>;
};

export default function DashboardPage() {
  const { user, userContext } = useAuthStore();
  const isApprovedAuthor = canOpenAuthorDashboard(user, userContext);
  const applicationState = getAuthorApplicationState(userContext);
  const authorCard = isApprovedAuthor
    ? { href: "/author", title: "Author Dashboard", subtitle: "Books, analytics & royalties" }
    : applicationState === "pending"
    ? { href: "/dashboard/become-author", title: "Application Pending", subtitle: "Under editorial review" }
    : applicationState === "rejected"
    ? { href: "/dashboard/become-author", title: "Application Rejected", subtitle: "Reapply to publish" }
    : { href: "/dashboard/become-author", title: "Become Author", subtitle: "Publish your work" };
  const [recentOrders, setRecentOrders] = useState<OrderRecord[]>([]);
  const [pendingOrder, setPendingOrder] = useState<OrderRecord | null>(null);
  const [recommendedBooks, setRecommendedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    setLoading(true);
    setError(false);

    try {
      const [ordersRes, booksRes, paymentsRes] = await Promise.allSettled([
        api.get(`/users/${userId}/orders`, { params: { limit: 20 }, cache: "no-store" }),
        api.get(`/books?limit=4`),
        api.get(`/users/${userId}/payments`, { params: { limit: 100 }, cache: "no-store" }),
      ]);

      if (ordersRes.status === "rejected") throw ordersRes.reason;

      if (ordersRes.status === "fulfilled") {
        // Sort client-side: the backend's sort param isn't guaranteed.
        const list = extractList<OrderRecord>(ordersRes.value.data, "orders").sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setRecentOrders(list.slice(0, 3));
        const payments = paymentsRes.status === "fulfilled" ? indexPaymentsByOrder(extractList(paymentsRes.value.data, "payments")) : null;
        setPendingOrder(payments ? list.find((order) => (order._id || order.id) && getFulfilmentStage(order) !== "cancelled" &&
          getPaymentState(order, payments.get(String(order._id || order.id))) === "awaiting_payment") ?? null : null);
      }

      if (booksRes.status === "fulfilled") {
        const bData = booksRes.value.data?.data?.books || booksRes.value.data?.data || booksRes.value.data;
        setRecommendedBooks(Array.isArray(bData) ? bData : []);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", describeApiError(err));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => scheduleRequest(fetchDashboardData), [fetchDashboardData]);

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="Could not load your dashboard"
          message="We encountered an issue connecting to the server. Please try refreshing."
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "Reader";

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header Greeting */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E] tracking-tight">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-[#5C6E6E] text-base mt-1.5 font-sans">
          Browse books or track your orders
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link href="/books">Browse Books <ArrowRight className="size-4" /></Link></Button>
        <Button variant="outline" asChild><Link href="/dashboard/orders">My Orders</Link></Button>
        <Button variant="outline" asChild><Link href="/dashboard/wishlist">Wishlist</Link></Button>
        <Button variant="outline" asChild><Link href="/dashboard/profile">Profile</Link></Button>
        {(isApprovedAuthor || user?.role === "reader") && <Button variant="outline" asChild><Link href={authorCard.href}>{authorCard.title}</Link></Button>}
      </div>
      {pendingOrder && (
        <section className="space-y-2 rounded-xl border border-secondary bg-secondary/10 p-4" aria-labelledby="pending-payment">
          <h2 id="pending-payment" className="font-serif text-lg font-semibold">Complete your payment</h2>
          {pendingOrder.orderNumber && <p className="text-sm">Order {pendingOrder.orderNumber} is awaiting payment.</p>}
          <Button asChild><Link href={`/dashboard/orders?orderId=${encodeURIComponent(pendingOrder._id || pendingOrder.id || "")}`}>View payment instructions</Link></Button>
        </section>
      )}

      {/* 4. Recent Orders & Recommended Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders Preview */}
        <Card className="bg-white border border-[#E2E6DF] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif font-bold text-[#0F3D3E]">
              Recent Orders
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-[#0F3D3E]">
              <Link href="/dashboard/orders" className="gap-1">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order: OrderRecord) => {
                  const orderId = order.orderNumber || order._id || order.id;

                  return (
                    <div
                      key={orderId}
                      className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl border border-[#E2E6DF] bg-white hover:bg-[#F8F9F7] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0F2ED] text-[#0F3D3E]">
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold font-mono text-sm text-[#0F3D3E]">{orderId}</p>
                          <p className="text-xs text-[#5C6E6E] flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3" />
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                              : "Recent"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-[#0F3D3E]">
                          ₹{getOrderTotal(order).toLocaleString("en-IN")}
                        </p>
                        <div className="mt-1">{getStatusBadge(order)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <Package className="h-10 w-10 text-[#5C6E6E]/40 mx-auto" />
                <p className="text-sm font-medium text-[#0F3D3E]">No orders placed yet</p>
                <p className="text-xs text-[#5C6E6E]">Explore our catalog to place your first order.</p>
                <Button asChild size="sm" className="bg-[#0F3D3E] text-white">
                  <Link href="/books">Explore Catalog</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Curated Recommendations */}
        <Card className="bg-white border border-[#E2E6DF] shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-serif font-bold text-[#0F3D3E]">
              Browse the Catalog
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-[#0F3D3E]">
              <Link href="/books" className="gap-1">
                Browse All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : recommendedBooks.length > 0 ? (
              <div className="space-y-3">
                {recommendedBooks.map((book) => (
                  <Link
                    key={book._id || book.id}
                    href={`/books/${book.slug || book._id || book.id}`}
                    className="flex items-center gap-3.5 p-2.5 rounded-xl border border-[#E2E6DF] bg-white hover:bg-[#F8F9F7] transition-all group"
                  >
                    <Image
                      src={book.coverImage || "/placeholder-book.svg"}
                      alt={book.title}
                      width={40}
                      height={56}
                      className="h-14 w-10 object-cover rounded-md border shadow-xs"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-sm text-[#0F3D3E] truncate group-hover:text-[#D4AF37] transition-colors">
                        {book.title}
                      </p>
                      <p className="text-xs text-[#5C6E6E] truncate">
                        {(book.author && typeof book.author === "object") ? book.author?.name : (typeof book.author === "string" ? book.author : "Harglim Press")}
                      </p>
                    </div>
                    <p className="font-bold text-sm text-[#0F3D3E]">
                      ₹{book.price || 0}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <BookOpen className="h-10 w-10 text-[#5C6E6E]/40 mx-auto" />
                <p className="text-sm font-medium text-[#0F3D3E]">Books unavailable</p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/books">Browse All Books</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
