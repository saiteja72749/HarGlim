"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import {
  BookOpen,
  DollarSign,
  ArrowRight,
  Clock,
  AlertTriangle,
  UserPlus,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [dashRes, ordersRes, authorsRes, booksRes, paymentsRes] = await Promise.allSettled([
        api.get("/admin/dashboard").catch(() => api.get("/admin/stats")),
        api.get("/admin/orders?limit=100"),
        api.get("/admin/author-applications"),
        api.get("/books?limit=100"),
        api.get("/admin/operations/payments?status=VERIFICATION_PENDING"),
      ]);

      const dashData = dashRes.status === "fulfilled" ? (dashRes.value.data?.data || dashRes.value.data) : {};
      const opCounts = dashData.operationalCounts || {};
      const ordersList = ordersRes.status === "fulfilled" ? (ordersRes.value.data?.data?.orders || ordersRes.value.data?.data || ordersRes.value.data) : [];
      const authorsList = authorsRes.status === "fulfilled" ? (authorsRes.value.data?.data?.applications || authorsRes.value.data?.data || authorsRes.value.data) : [];
      const booksList = booksRes.status === "fulfilled" ? (booksRes.value.data?.books || booksRes.value.data?.data || booksRes.value.data) : [];
      
      let realPaymentsCount = 0;
      if (paymentsRes.status === "fulfilled") {
        const pVal = paymentsRes.value.data;
        const pItems = pVal?.data?.items || pVal?.items || (Array.isArray(pVal?.data) ? pVal.data : []);
        const pTotal = pVal?.data?.pagination?.total ?? pVal?.pagination?.total;
        realPaymentsCount = typeof pTotal === 'number' ? pTotal : (Array.isArray(pItems) ? pItems.length : 0);
      }

      const ordersArr = Array.isArray(ordersList) ? ordersList : [];
      const authorsArr = Array.isArray(authorsList) ? authorsList : [];
      const booksArr = Array.isArray(booksList) ? booksList : [];

      // Calculate state machine metrics as resilient fallbacks
      const calculatedPendingPayments = ordersArr.filter(
        (o) => !o.isPaid && (o.paymentStatus === "PENDING" || o.paymentStatus === "VERIFICATION_PENDING" || o.utr)
      ).length;

      const calculatedProcessingOrders = ordersArr.filter(
        (o) => (o.status || o.orderStatus) === "PROCESSING"
      ).length;

      const calculatedPendingAuthors = authorsArr.filter(
        (a) => a.status?.toLowerCase() === "pending"
      ).length;

      setDashboardData({
        ...dashData,
        pendingPaymentsCount: opCounts.paymentsAwaitingVerification ?? (realPaymentsCount || (dashData.pendingPaymentsCount ?? dashData.pendingOrders ?? calculatedPendingPayments)),
        processingOrdersCount: opCounts.ordersRequiringAction ?? (dashData.processingOrdersCount ?? dashData.processingOrders ?? calculatedProcessingOrders),
        pendingAuthorsCount: opCounts.pendingAuthorApplications ?? (dashData.pendingAuthorsCount ?? dashData.pendingApplications ?? calculatedPendingAuthors),
        pendingPublishRequests: opCounts.pendingPublishRequests ?? 0,
        activeAuthorsCount: opCounts.activeAuthors ?? 0,
        totalBooks: opCounts.publishedBooks ?? (booksArr.length || dashData.totalBooks || dashData.booksCount || 0),
        recentOrders: ordersArr.slice(0, 5),
        recentAuthors: authorsArr.slice(0, 5),
      });
    } catch (err) {
      console.error("Failed to fetch admin dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="Could not load admin dashboard"
          message="We encountered an issue fetching your dashboard data. Please try again."
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0F3D3E]"></div>
      </div>
    );
  }

  const {
    pendingPaymentsCount = 0,
    processingOrdersCount = 0,
    pendingAuthorsCount = 0,
    totalBooks = 0,
    recentOrders = [],
    recentAuthors = [],
  } = dashboardData || {};

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
          Operations Dashboard
        </h1>
        <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
          Real-time metrics, payment verifications, and publishing operations.
        </p>
      </div>

      {/* 1. TOP CARDS (Strictly matching prompt) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Payments */}
        <Link href="/admin/payments">
          <Card className="bg-amber-500/10 border-2 border-amber-500/30 hover:border-amber-500/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Pending Payments
                </p>
                <p className="text-3xl font-serif font-bold text-amber-950 mt-1">
                  {pendingPaymentsCount}
                </p>
                <p className="text-[11px] text-amber-800 mt-1 font-medium">Require UTR Verification</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Orders in Processing */}
        <Link href="/admin/orders">
          <Card className="bg-blue-500/10 border-2 border-blue-500/30 hover:border-blue-500/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Orders in Processing
                </p>
                <p className="text-3xl font-serif font-bold text-blue-950 mt-1">
                  {processingOrdersCount}
                </p>
                <p className="text-[11px] text-blue-800 mt-1 font-medium">Currently Printing / Packing</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-800 flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Pending Author Requests */}
        <Link href="/admin/author-applications">
          <Card className="bg-purple-500/10 border-2 border-purple-500/30 hover:border-purple-500/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-900">
                  Pending Author Requests
                </p>
                <p className="text-3xl font-serif font-bold text-purple-950 mt-1">
                  {pendingAuthorsCount}
                </p>
                <p className="text-[11px] text-purple-800 mt-1 font-medium">Awaiting Editorial Review</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 text-purple-800 flex items-center justify-center shrink-0">
                <UserPlus className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Total Books */}
        <Link href="/admin/books">
          <Card className="bg-emerald-500/10 border-2 border-emerald-500/30 hover:border-emerald-500/60 shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Total Books Catalog
                </p>
                <p className="text-3xl font-serif font-bold text-emerald-950 mt-1">
                  {totalBooks}
                </p>
                <p className="text-[11px] text-emerald-800 mt-1 font-medium">Published & Active</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 text-emerald-800 flex items-center justify-center shrink-0">
                <BookOpen className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 2. QUICK ACTIONS SECTION (VERY IMPORTANT) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-4 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#D4AF37]" />
          <span>Quick Admin Actions</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Verify Payments */}
          <Link href="/admin/payments">
            <Card className="bg-white border-2 border-[#D4AF37]/50 hover:border-[#D4AF37] shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#D4AF37]/20 text-[#0F3D3E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Verify Payments</h4>
                  <p className="text-xs text-[#5C6E6E]">Approve UTR records</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Add Book */}
          <Link href="/admin/books/new">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E] shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Add Book</h4>
                  <p className="text-xs text-[#5C6E6E]">Create new listing</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Review Author Requests */}
          <Link href="/admin/author-applications">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E] shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#F0F2ED] text-[#0F3D3E] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Author Requests</h4>
                  <p className="text-xs text-[#5C6E6E]">Approve new writers</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Enter Royalty */}
          <Link href="/admin/royalties">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E] shadow-xs hover:shadow-md transition-all rounded-2xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Enter Royalty</h4>
                  <p className="text-xs text-[#5C6E6E]">Form-based entry</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* 3. RECENT ACTIVITY PREVIEWS */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Orders Overview */}
        <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-row items-center justify-between">
            <CardTitle className="text-base font-serif font-bold text-[#0F3D3E]">
              Recent Orders
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-[#0F3D3E]">
              <Link href="/admin/orders" className="gap-1">
                View Orders <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order: any) => {
                  const id = order.orderNumber || order._id || order.id;
                  const isPaid = Boolean(order.isPaid || order.paymentStatus === "VERIFIED");
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E2E6DF] bg-white hover:bg-[#F8F9F7] transition-colors text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-[#0F3D3E]">{id}</span>
                        <p className="text-muted-foreground text-[11px]">
                          {order.shippingAddress?.fullName || order.user?.name || "Customer"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-serif font-bold text-[#0F3D3E]">
                          ₹{(order.totalPrice || order.totalAmount || 0).toLocaleString()}
                        </span>
                        <div className="mt-0.5">
                          <Badge
                            className={
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]"
                            }
                          >
                            {isPaid ? "Paid" : "Payment Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#5C6E6E] py-6 text-center">No orders recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Author Applications */}
        <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-5 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-row items-center justify-between">
            <CardTitle className="text-base font-serif font-bold text-[#0F3D3E]">
              Recent Author Requests
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-[#0F3D3E]">
              <Link href="/admin/author-applications" className="gap-1">
                View Requests <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            {recentAuthors.length > 0 ? (
              <div className="space-y-3">
                {recentAuthors.map((author: any) => (
                  <div
                    key={author._id || author.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E2E6DF] bg-white hover:bg-[#F8F9F7] transition-colors text-xs"
                  >
                    <div>
                      <span className="font-serif font-bold text-[#0F3D3E]">
                        {author.fullName || author.penName}
                      </span>
                      <p className="text-muted-foreground text-[11px]">{author.email}</p>
                    </div>
                    <Badge
                      className={
                        author.status?.toLowerCase() === "approved"
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]"
                          : author.status?.toLowerCase() === "rejected"
                          ? "bg-rose-500/10 text-rose-700 border-rose-500/20 text-[10px]"
                          : "bg-amber-500/10 text-amber-700 border-amber-500/20 text-[10px]"
                      }
                    >
                      {author.status || "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#5C6E6E] py-6 text-center">No author requests recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
