"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ShoppingCart,
  DollarSign,
  Star,
  BookOpen,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [royaltyData, setRoyaltyData] = useState<any>(null);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Step 7: Use official backend analytics endpoints
      const [analyticsRes, perfRes, royaltyRes] = await Promise.allSettled([
        api.get("/authors/me/analytics"),
        api.get("/authors/me/books/performance"),
        api.get("/authors/me/royalties"),
      ]);

      if (analyticsRes.status === "fulfilled") {
        setAnalyticsData(analyticsRes.value.data?.data || analyticsRes.value.data);
      }
      if (perfRes.status === "fulfilled") {
        const pList = perfRes.value.data?.data?.books || perfRes.value.data?.data || perfRes.value.data || [];
        setPerformanceData(Array.isArray(pList) ? pList : []);
      }
      if (royaltyRes.status === "fulfilled") {
        setRoyaltyData(royaltyRes.value.data?.data || royaltyRes.value.data);
      }
    } catch (err) {
      console.error("Failed to fetch author analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  const totalBooks = performanceData.length || analyticsData?.totalBooks || 0;
  const totalSales =
    analyticsData?.totalUnitsSold ??
    analyticsData?.totalSales ??
    performanceData.reduce((sum, b) => sum + (b.totalSales || b.unitsSold || 0), 0);
  const totalRevenue =
    royaltyData?.totalEarned ??
    analyticsData?.totalRoyalty ??
    analyticsData?.totalRevenue ??
    performanceData.reduce((sum, b) => sum + (b.royaltyEarned || b.revenue || 0), 0);
  const avgRating =
    analyticsData?.averageRating ??
    (performanceData.length > 0
      ? performanceData.reduce((sum, b) => sum + (b.rating || 0), 0) / performanceData.length
      : 0);

  const stats = [
    {
      label: "Published Titles",
      value: totalBooks.toString(),
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Units Sold",
      value: Number(totalSales).toLocaleString("en-IN"),
      icon: ShoppingCart,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Total Royalty Earned",
      value: `₹${Number(totalRevenue).toLocaleString("en-IN")}`,
      icon: DollarSign,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Average Rating",
      value: Number(avgRating).toFixed(1),
      icon: Star,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading real-time analytics from server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif lg:text-3xl text-foreground">
            Author Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live sales time-series, reader reception, and author book performance
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Book Performance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Title-Level Sales Performance</CardTitle>
            <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <TrendingUp className="h-3 w-3" />
              Live Backend Sync
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {performanceData.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p>No published titles or sales recorded yet.</p>
              <p className="text-xs">Once your submitted manuscripts are published, title analytics will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                  <tr>
                    <th className="py-3 px-4">Book Title</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Units Sold</th>
                    <th className="py-3 px-4">Rating</th>
                    <th className="py-3 px-4 text-right">Royalty Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-b">
                  {performanceData.map((book: any) => (
                    <tr key={book._id || book.id || book.title} className="hover:bg-muted/30">
                      <td className="py-3 px-4 font-medium">{book.title || "Untitled"}</td>
                      <td className="py-3 px-4 capitalize text-xs text-muted-foreground">{book.format || "Paperback"}</td>
                      <td className="py-3 px-4 font-semibold">{Number(book.totalSales || book.unitsSold || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-xs font-medium">{(book.rating || 0).toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(Number(book.royaltyEarned || book.revenue || 0)).toLocaleString("en-IN")}
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
