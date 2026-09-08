"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  DollarSign,
  FileText,
  CreditCard,
  ArrowRight,
  PlusCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";

export default function AuthorDashboard() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let resData: any = {};
        try {
          const authorId = user?._id || user?.id;
          const { data } = await api.get("/authors/me/dashboard").catch(() =>
            api.get(`/authors/${authorId}/stats`)
          );
          resData = data?.data || data || {};
        } catch {
          resData = {};
        }

        setDashboardData({
          publishedBooks: resData.publishedBooks ?? (resData.books?.length || 0),
          manuscriptsCount: resData.manuscriptsCount ?? (resData.manuscripts?.length || 0),
          totalEarnings: resData.accruedKnown ?? resData.totalEarnings ?? resData.totalRoyalty ?? 0,
          recentBooks: Array.isArray(resData.recentBooks) ? resData.recentBooks : (Array.isArray(resData.books) ? resData.books : []),
          manuscripts: Array.isArray(resData.manuscripts) ? resData.manuscripts : [],
        });
      } catch (err) {
        console.warn("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0F3D3E]" />
      </div>
    );
  }

  const {
    publishedBooks = 0,
    manuscriptsCount = 0,
    totalEarnings = 0,
    recentBooks = [],
    manuscripts = [],
  } = dashboardData || {};

  return (
    <div className="space-y-8 text-[#0F3D3E] font-sans">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6DF] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Author Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-0.5">
            Welcome back, {user?.name || "Author"}! Manage your published books, manuscripts, and royalty earnings.
          </p>
        </div>

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

      {/* 2. Top 3 Simple Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Books */}
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
              Total Books
            </span>
            <p className="text-3xl font-serif font-bold text-[#0F3D3E]">
              {publishedBooks}
            </p>
            <p className="text-[11px] text-[#5C6E6E]">Published catalog</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shadow-xs">
            <BookOpen className="h-6 w-6" />
          </div>
        </Card>

        {/* Card 2: Manuscripts Submitted */}
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
              Manuscripts Submitted
            </span>
            <p className="text-3xl font-serif font-bold text-[#0F3D3E]">
              {manuscriptsCount}
            </p>
            <p className="text-[11px] text-[#5C6E6E]">Under review & editing</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#D4AF37]/20 text-[#0F3D3E] border border-[#D4AF37]/40 flex items-center justify-center shadow-xs">
            <FileText className="h-6 w-6" />
          </div>
        </Card>

        {/* Card 3: Total Earnings */}
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
              Total Earnings
            </span>
            <p className="text-3xl font-serif font-bold text-[#0F3D3E]">
              ₹{Number(totalEarnings).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-[#5C6E6E]">Royalties from Admin</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center justify-center shadow-xs">
            <DollarSign className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* 3. Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-base font-serif font-bold text-[#0F3D3E]">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/author/manuscripts/new" className="block">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#0F3D3E] group-hover:text-[#D4AF37] transition-colors">
                    Submit Manuscript
                  </h3>
                  <p className="text-[11px] text-[#5C6E6E]">Upload new book draft</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#5C6E6E] group-hover:translate-x-1 transition-transform" />
            </Card>
          </Link>

          <Link href="/author/books" className="block">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#0F3D3E] group-hover:text-[#D4AF37] transition-colors">
                    Manage Books
                  </h3>
                  <p className="text-[11px] text-[#5C6E6E]">View published catalog</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#5C6E6E] group-hover:translate-x-1 transition-transform" />
            </Card>
          </Link>

          <Link href="/author/settings" className="block">
            <Card className="bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#0F3D3E] group-hover:text-[#D4AF37] transition-colors">
                    Update Payment Details
                  </h3>
                  <p className="text-[11px] text-[#5C6E6E]">Bank account & bio settings</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#5C6E6E] group-hover:translate-x-1 transition-transform" />
            </Card>
          </Link>
        </div>
      </div>

      {/* 4. Recent Publications & Manuscripts Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Published Books Preview */}
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <h3 className="font-serif font-bold text-base text-[#0F3D3E] flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#D4AF37]" />
              <span>Published Books</span>
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs text-[#0F3D3E] font-bold">
              <Link href="/author/books">View All →</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {recentBooks.map((book: any) => (
              <div key={book.id || book._id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                <div>
                  <p className="font-serif font-bold text-xs text-[#0F3D3E]">{book.title}</p>
                  <p className="text-[11px] text-[#5C6E6E]">{book.sales || 0} copies sold</p>
                </div>
                <Badge className="bg-[#0F3D3E]/10 text-[#0F3D3E] border border-[#0F3D3E]/20 text-[10px]">
                  Published
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Manuscripts Preview */}
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
            <h3 className="font-serif font-bold text-base text-[#0F3D3E] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              <span>Recent Manuscripts</span>
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs text-[#0F3D3E] font-bold">
              <Link href="/author/manuscripts">View All →</Link>
            </Button>
          </div>

          <div className="space-y-3">
            {manuscripts.map((item: any) => (
              <div key={item.id || item._id} className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                <div>
                  <p className="font-serif font-bold text-xs text-[#0F3D3E]">{item.title}</p>
                  <p className="text-[11px] text-[#5C6E6E]">Submitted on {new Date(item.createdAt || Date.now()).toLocaleDateString("en-IN")}</p>
                </div>
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                  Under Review
                </Badge>
              </div>
            ))}
          </div>
        </Card>

      </div>

    </div>
  );
}
