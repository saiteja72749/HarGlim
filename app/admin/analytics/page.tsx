"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  CreditCard,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>({
    totalSales: 0,
    totalRevenue: 0,
    activeUsers: 0,
    totalBooks: 0,
    topBooks: [],
    revenueReport: null,
    paymentStats: { verified: 0, pending: 0, rejected: 0 },
    inventoryStats: { inStock: 0, lowStock: 0 },
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/analytics/dashboard", {
        params: { period },
        cache: "no-store",
      } as any);
      const dashReport = data?.data?.report || data?.data || data || {};
      const paymentStats = dashReport.paymentStats || dashReport.payments || {};
      const inventoryStats = dashReport.inventoryStats || dashReport.inventory || {};
      const topBooks = dashReport.topBooks || dashReport.topCatalogTitles || [];

      setAnalyticsData({
        totalSales: dashReport?.totalSales ?? dashReport?.orderCount ?? 0,
        totalRevenue: dashReport?.totalRevenue ?? dashReport?.revenue ?? 0,
        activeUsers: dashReport?.activeUsers ?? dashReport?.registeredUsers ?? 0,
        totalBooks: dashReport?.totalBooks ?? dashReport?.catalogTitles ?? 0,
        topBooks: Array.isArray(topBooks) ? topBooks.slice(0, 5) : [],
        revenueReport: dashReport,
        paymentStats: {
          verified: paymentStats.verified ?? paymentStats.approved ?? 0,
          pending: paymentStats.pending ?? paymentStats.verificationPending ?? 0,
          rejected: paymentStats.rejected ?? paymentStats.failed ?? 0,
        },
        inventoryStats: {
          inStock: inventoryStats.inStock ?? inventoryStats.healthyStock ?? 0,
          lowStock: inventoryStats.lowStock ?? inventoryStats.outOfStock ?? 0,
        },
      });
    } catch (err) {
      console.warn("Analytics load warning:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const dynamicStats = [
    {
      label: "Platform Order Volume",
      value: analyticsData.totalSales.toString(),
      icon: ShoppingCart,
      color: "text-emerald-600",
      bgColor: "bg-emerald-500/10",
      helper: "Orders placed across catalog",
    },
    {
      label: "Platform Gross Revenue",
      value: `₹${Number(analyticsData.totalRevenue).toLocaleString("en-IN")}`,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
      helper: "Total order settlements",
    },
    {
      label: "Registered Users",
      value: analyticsData.activeUsers.toString(),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      helper: "Readers and verified authors",
    },
    {
      label: "Catalog Titles",
      value: analyticsData.totalBooks.toString(),
      icon: BookOpen,
      color: "text-[#D4AF37]",
      bgColor: "bg-[#D4AF37]/15",
      helper: "Live books in storefront",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Platform Analytics & Operations Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Real-time financial metrics, payment settlement audits, inventory levels, and reader demand.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
            <SelectTrigger className="w-36 text-xs bg-white border-[#E2E6DF]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Period</SelectItem>
              <SelectItem value="weekly">Weekly Period</SelectItem>
              <SelectItem value="monthly">Monthly Period</SelectItem>
              <SelectItem value="yearly">Yearly Period</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchAnalytics}
            className="text-xs gap-1 h-9 border-[#E2E6DF]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">{stat.label}</p>
                  <p className="text-2xl font-serif font-bold text-[#0F3D3E] mt-1">{stat.value}</p>
                  <p className="text-[11px] text-[#5C6E6E] mt-0.5">{stat.helper}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.bgColor} ${stat.color} shrink-0`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Analytics Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Operations Breakdown */}
        <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#0F3D3E]" />
              <h3 className="font-serif font-bold text-sm text-[#0F3D3E]">Payment Verifications</h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              UPI Operations
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium text-emerald-950">Verified & Approved</span>
              </div>
              <span className="font-serif font-bold text-base text-emerald-900">
                {analyticsData.paymentStats.verified}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-medium text-amber-950">Pending Verification</span>
              </div>
              <span className="font-serif font-bold text-base text-amber-900">
                {analyticsData.paymentStats.pending}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-600" />
                <span className="font-medium text-rose-950">Rejected / Failed</span>
              </div>
              <span className="font-serif font-bold text-base text-rose-900">
                {analyticsData.paymentStats.rejected}
              </span>
            </div>
          </div>
        </Card>

        {/* Inventory Reserves */}
        <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#0F3D3E]" />
              <h3 className="font-serif font-bold text-sm text-[#0F3D3E]">Inventory Health</h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              Warehouse Stock
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
              <span className="text-[#5C6E6E]">Healthy Stock Titles (&gt; 5)</span>
              <span className="font-serif font-bold text-base text-[#0F3D3E]">
                {analyticsData.inventoryStats.inStock}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-amber-950 font-medium">Low Stock / Out of Stock (≤ 5)</span>
              <span className="font-serif font-bold text-base text-amber-900">
                {analyticsData.inventoryStats.lowStock}
              </span>
            </div>

            <p className="text-[11px] text-[#5C6E6E] pt-2">
              Physical printing press turnarounds take 2-4 business days. Maintain buffer for bestsellers.
            </p>
          </div>
        </Card>

        {/* Top Performing Books */}
        <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#0F3D3E]" />
              <h3 className="font-serif font-bold text-sm text-[#0F3D3E]">Top Catalog Titles</h3>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase">
              By Copies
            </Badge>
          </div>

          <div className="space-y-3 text-xs">
            {analyticsData.topBooks.length === 0 ? (
              <p className="text-[#5C6E6E] text-center py-6">No book sale records yet.</p>
            ) : (
              analyticsData.topBooks.map((book: any, i: number) => (
                <div key={book._id || i} className="flex items-center justify-between pb-2 border-b border-[#E2E6DF] last:border-0 last:pb-0">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-bold text-[#0F3D3E] truncate">{book.title}</p>
                    <p className="text-[11px] text-[#5C6E6E]">₹{(book.price || book.mrp || 0).toLocaleString()}</p>
                  </div>
                  <span className="font-serif font-bold text-[#0F3D3E] shrink-0">
                    {book.totalSales || 0} copies
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
