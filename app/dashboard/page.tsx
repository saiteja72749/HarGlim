"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  ShoppingBag,
  Heart,
  CreditCard,
  User,
  PenTool,
  ArrowRight,
  Sparkles,
  Package,
  Clock,
  Compass,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth-store";
import { ErrorState } from "@/components/ui/error-state";
import api from "@/lib/api";

const getStatusBadge = (status: string) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "DELIVERED":
    case "COMPLETED":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-medium">
          Verified
        </Badge>
      );
    case "SHIPPED":
    case "IN TRANSIT":
      return (
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 font-medium">
          In Transit
        </Badge>
      );
    case "PROCESSING":
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-medium">
          Processing
        </Badge>
      );
    case "CANCELLED":
    case "REJECTED":
    case "FAILED":
      return (
        <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 font-medium">
          Failed
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-medium">
          Pending
        </Badge>
      );
  }
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recommendedBooks, setRecommendedBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchDashboardData = async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    setLoading(true);
    setError(false);

    try {
      const [ordersRes, booksRes] = await Promise.allSettled([
        api.get(`/users/${userId}/orders?limit=3&sort=-createdAt`),
        api.get(`/books?limit=4`),
      ]);

      if (ordersRes.status === "fulfilled") {
        const data = ordersRes.value.data?.data || ordersRes.value.data;
        setRecentOrders(Array.isArray(data) ? data : []);
      }

      if (booksRes.status === "fulfilled") {
        const bData = booksRes.value.data?.data?.books || booksRes.value.data?.data || booksRes.value.data;
        setRecommendedBooks(Array.isArray(bData) ? bData : []);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

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

      {/* 2. Main Large Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Browse Books (PRIMARY CARD - Subtle Gold Accent) */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="h-full bg-white border-2 border-[#D4AF37]/40 shadow-sm hover:shadow-md hover:border-[#D4AF37] transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#D4AF37]/15 to-transparent rounded-bl-full pointer-events-none" />
            <CardContent className="p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0F3D3E] text-[#D4AF37] shadow-sm">
                    <Compass className="h-6 w-6" />
                  </div>
                  <Badge className="bg-[#D4AF37]/15 text-[#0F3D3E] border-[#D4AF37]/40 font-semibold px-2.5 py-0.5 text-xs">
                    Primary Action
                  </Badge>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                    Browse Books
                  </h3>
                  <p className="text-[#5C6E6E] text-sm mt-1.5 leading-relaxed">
                    Explore our curated literary collection, new releases, and rare publishing releases.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/40 font-medium h-11 shadow-sm gap-2 text-sm"
              >
                <Link href="/books">
                  <span>Explore Book Store</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* My Orders Card */}
        <motion.div
          whileHover={{ y: -4 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="h-full bg-white border border-[#E2E6DF] shadow-sm hover:shadow-md hover:border-[#0F3D3E]/30 transition-all rounded-2xl relative overflow-hidden group">
            <CardContent className="p-6 sm:p-8 flex flex-col justify-between h-full space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F0F2ED] text-[#0F3D3E]">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                    My Orders
                  </h3>
                  <p className="text-[#5C6E6E] text-sm mt-1.5 leading-relaxed">
                    Track your active shipments, submit UTR payment verification, and view past invoices.
                  </p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                className="w-full border-[#0F3D3E]/20 text-[#0F3D3E] hover:bg-[#F0F2ED] font-medium h-11 shadow-xs gap-2 text-sm"
              >
                <Link href="/dashboard/orders">
                  <span>Track & Manage Orders</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 3. Secondary Actions Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-4">
          Quick Access Services
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wishlist */}
          <Link href="/dashboard/wishlist">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E]/40 hover:shadow-md transition-all rounded-xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:scale-105 transition-transform">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Wishlist</h4>
                  <p className="text-xs text-[#5C6E6E] truncate">Saved favorites</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Become Author (Gold Accent for Emphasis) */}
          <Link href="/dashboard/become-author">
            <Card className="bg-white border-2 border-[#D4AF37]/50 hover:border-[#D4AF37] hover:shadow-md transition-all rounded-xl cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-[#D4AF37]" />
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/15 text-[#0F3D3E] group-hover:scale-105 transition-transform">
                  <PenTool className="h-5 w-5 text-[#0F3D3E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Become Author</h4>
                    <Sparkles className="h-3 w-3 text-[#D4AF37]" />
                  </div>
                  <p className="text-xs text-[#5C6E6E] truncate">Publish your work</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Profile */}
          <Link href="/dashboard/profile">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E]/40 hover:shadow-md transition-all rounded-xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0F2ED] text-[#0F3D3E] group-hover:scale-105 transition-transform">
                  <User className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Profile</h4>
                  <p className="text-xs text-[#5C6E6E] truncate">Account settings</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Payment History */}
          <Link href="/dashboard/payments">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E]/40 hover:shadow-md transition-all rounded-xl cursor-pointer group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 group-hover:scale-105 transition-transform">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">Payment History</h4>
                  <p className="text-xs text-[#5C6E6E] truncate">Invoices & UTR records</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

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
                {recentOrders.map((order: any) => {
                  const orderId = order.orderNumber || order._id || order.id;
                  const status = order.status || order.orderStatus || "PENDING";

                  return (
                    <div
                      key={orderId}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-[#E2E6DF] bg-white hover:bg-[#F8F9F7] transition-colors"
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
                          ₹{(order.totalPrice || order.subtotal || 0).toLocaleString()}
                        </p>
                        <div className="mt-1">{getStatusBadge(status)}</div>
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
              Recommended for You
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
                {recommendedBooks.map((book: any) => (
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
                <p className="text-sm font-medium text-[#0F3D3E]">No recommendations loaded</p>
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
