"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { DollarSign, FileText, Download, CheckCircle2, RefreshCw, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";

export default function AuthorRoyaltiesPage() {
  const { user } = useAuthStore();
  const [royaltyEntries, setRoyaltyEntries] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState<any>(null);

  const fetchRoyalties = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [royaltiesRes, settlementsRes] = await Promise.allSettled([
        api.get("/authors/me/royalties"),
        api.get("/authors/me/royalty-settlements"),
      ]);

      if (royaltiesRes.status === "fulfilled") {
        const rData = royaltiesRes.value.data?.data || royaltiesRes.value.data || [];
        setSummaryData(rData);
        const entries = rData.earnings || rData.items || (Array.isArray(rData) ? rData : []);
        setRoyaltyEntries(Array.isArray(entries) ? entries : []);
      }

      if (settlementsRes.status === "fulfilled") {
        const sData = settlementsRes.value.data?.data || settlementsRes.value.data || [];
        const sList = sData.settlements || (Array.isArray(sData) ? sData : []);
        setSettlements(Array.isArray(sList) ? sList : []);
      }
    } catch (err) {
      console.error("Failed to fetch royalties:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoyalties();
  }, [user]);

  const totalEarnings =
    summaryData?.totalEarned ??
    summaryData?.totalRoyalty ??
    royaltyEntries.reduce((sum, item) => sum + Number(item.royaltyAmount || item.amount || 0), 0);

  const handleExportCSV = () => {
    if (!royaltyEntries || royaltyEntries.length === 0) {
      toast.error("No entries available to export.");
      return;
    }
    const headers = ["Book Title", "Copies Sold", "Rate / Book (INR)", "Total Revenue (INR)", "Royalty Paid (INR)", "Date"];
    const rows = royaltyEntries.map((e) => [
      `"${e.bookTitle || e.book?.title || "Published Book"}"`,
      e.copiesSold || e.quantity || 0,
      e.amountPerBook || e.price || 0,
      e.totalRevenue || 0,
      e.royaltyAmount || e.amount || 0,
      `"${e.date || e.createdAt ? new Date(e.date || e.createdAt).toLocaleDateString("en-IN") : "Recent"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `author_royalties_statement.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Royalty statement exported as CSV! 📄");
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-[#0F3D3E]" />
        <p className="text-sm text-[#5C6E6E]">Loading royalty records from server...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-[#0F3D3E] font-sans max-w-5xl mx-auto">
      {/* 1. Header & Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E6DF] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Royalty Earnings & Settlements
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-0.5">
            Transparent sales reports and payout batches from Harglim Publishers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchRoyalties}
            variant="outline"
            size="sm"
            className="border-[#E2E6DF] text-[#0F3D3E] text-xs h-10 px-3 rounded-xl gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="border-[#E2E6DF] text-[#0F3D3E] font-bold text-xs h-10 px-4 rounded-xl gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* 2. Earnings Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
              Total Lifetime Royalties
            </span>
            <p className="text-3xl font-serif font-bold text-[#0F3D3E]">
              ₹{Number(totalEarnings).toLocaleString("en-IN")}
            </p>
            <p className="text-[11px] text-[#5C6E6E]">Calculated from published book sales</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
              Settlement Payouts
            </span>
            <p className="text-3xl font-serif font-bold text-emerald-700">
              {settlements.filter((s) => s.status === "PAID").length} Paid
            </p>
            <p className="text-[11px] text-[#5C6E6E]">Direct external payouts completed</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
              Recorded Sales Transactions
            </span>
            <p className="text-3xl font-serif font-bold text-[#0F3D3E]">
              {royaltyEntries.length}
            </p>
            <p className="text-[11px] text-[#5C6E6E]">Server verified entries</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-[#D4AF37]/20 text-[#0F3D3E] border border-[#D4AF37]/40 flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* 3. Detailed Tabs: Per-Sale Royalties vs Payout Settlements */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="bg-[#E2E6DF]/50 p-1 rounded-xl">
          <TabsTrigger value="sales" className="rounded-lg text-xs font-semibold">
            Sales & Royalties ({royaltyEntries.length})
          </TabsTrigger>
          <TabsTrigger value="settlements" className="rounded-lg text-xs font-semibold">
            Payout Settlements ({settlements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <div className="border border-[#E2E6DF] rounded-2xl bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E2E6DF]">
              <h2 className="text-sm font-bold text-[#0F3D3E] font-serif">
                Per-Sale Royalty Breakdown
              </h2>
            </div>
            {royaltyEntries.length === 0 ? (
              <div className="py-16 text-center text-[#5C6E6E] space-y-2">
                <FileText className="h-8 w-8 mx-auto text-[#5C6E6E]/40" />
                <p className="text-sm">No book sales records logged yet.</p>
                <p className="text-xs">Once readers purchase your published books, earnings appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8F9F7] text-[#5C6E6E] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E6DF]">
                    <tr>
                      <th className="py-3.5 px-4">Book Title</th>
                      <th className="py-3.5 px-4 text-center">Copies</th>
                      <th className="py-3.5 px-4 text-right">Price</th>
                      <th className="py-3.5 px-4 text-right">Revenue</th>
                      <th className="py-3.5 px-4 text-right">Royalty</th>
                      <th className="py-3.5 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6DF]">
                    {royaltyEntries.map((e, idx) => (
                      <tr key={e._id || idx} className="hover:bg-[#F8F9F7]/50">
                        <td className="py-3 px-4 font-semibold text-[#0F3D3E]">
                          {e.bookTitle || e.book?.title || "Book Title"}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{e.copiesSold || e.quantity || 1}</td>
                        <td className="py-3 px-4 text-right text-[#5C6E6E]">₹{e.amountPerBook || e.price || 0}</td>
                        <td className="py-3 px-4 text-right text-[#5C6E6E]">₹{e.totalRevenue || 0}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{(e.royaltyAmount || e.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-[#5C6E6E]">
                          {e.date || e.createdAt ? new Date(e.date || e.createdAt).toLocaleDateString("en-IN") : "Recent"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settlements">
          <div className="border border-[#E2E6DF] rounded-2xl bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E2E6DF]">
              <h2 className="text-sm font-bold text-[#0F3D3E] font-serif">
                Admin Payout Batches
              </h2>
            </div>
            {settlements.length === 0 ? (
              <div className="py-16 text-center text-[#5C6E6E] space-y-2">
                <Layers className="h-8 w-8 mx-auto text-[#5C6E6E]/40" />
                <p className="text-sm">No payout settlements created yet.</p>
                <p className="text-xs">Settlement batches approved by the publisher appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#F8F9F7] text-[#5C6E6E] font-bold uppercase tracking-wider text-[11px] border-b border-[#E2E6DF]">
                    <tr>
                      <th className="py-3.5 px-4">Settlement #</th>
                      <th className="py-3.5 px-4">Period</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Payout Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6DF]">
                    {settlements.map((s) => (
                      <tr key={s._id || s.id} className="hover:bg-[#F8F9F7]/50">
                        <td className="py-3 px-4 font-mono text-xs text-[#5C6E6E]">
                          {s.settlementNumber || s._id}
                        </td>
                        <td className="py-3 px-4 text-xs text-[#5C6E6E]">
                          {s.periodStart ? new Date(s.periodStart).toLocaleDateString() : "—"} to{" "}
                          {s.periodEnd ? new Date(s.periodEnd).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          ₹{(s.amount || s.totalRoyalty || s.totalAmount || 0).toLocaleString("en-IN")}
                        </td>
                          {(() => {
                            const rawStatus = (s.payment_status || s.paymentStatus || s.status || "").toUpperCase();
                            const isPaid = rawStatus === "PAID" || rawStatus === "COMPLETED";
                            const isApproved = rawStatus.includes("APPROV") || rawStatus === "VERIFIED" || rawStatus === "CONFIRMED";
                            const isRejected = rawStatus.includes("REJECT") || rawStatus.includes("FAIL");
                            return (
                              <Badge
                                variant="outline"
                                className={
                                  isPaid
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold"
                                    : isApproved
                                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold"
                                    : isRejected
                                    ? "bg-rose-500/10 text-rose-700 border-rose-500/20 font-semibold"
                                    : "bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold"
                                }
                              >
                                {isPaid ? "Paid" : isApproved ? "Approved" : isRejected ? "Rejected" : "Pending"}
                              </Badge>
                            );
                          })()}
                        <td className="py-3 px-4 font-mono text-xs text-[#5C6E6E]">
                          {s.transactionReference || s.payoutDetails?.transactionReference || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
