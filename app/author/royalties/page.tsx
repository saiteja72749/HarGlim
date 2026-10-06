"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { DollarSign, FileText, Download, CheckCircle2, RefreshCw, Layers, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth-store";
import { useHashSection } from "@/hooks/use-hash-section";
import toast from "react-hot-toast";

export default function AuthorRoyaltiesPage() {
  const { user } = useAuthStore();
  const [royaltyEntries, setRoyaltyEntries] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // "/author/royalties#settlements" (sidebar: Royalty Settlements) opens the settlements tab.
  const hash = useHashSection(!loading);
  const [activeTab, setActiveTab] = useState("sales");
  useEffect(() => {
    setActiveTab(hash === "settlements" ? "settlements" : "sales");
  }, [hash]);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [openSettlementId, setOpenSettlementId] = useState<string | null>(null);

  const fetchRoyalties = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Both lists are paginated (default 10); without a limit the totals only covered page 1.
      const listConfig = { params: { page: 1, limit: 100 }, cache: "no-store" } as any;
      const [royaltiesRes, settlementsRes] = await Promise.allSettled([
        api.get("/authors/me/royalties", listConfig),
        api.get("/authors/me/royalty-settlements", listConfig),
      ]);

      if (royaltiesRes.status === "fulfilled") {
        const rData = royaltiesRes.value.data?.data || royaltiesRes.value.data || [];
        setSummaryData(Array.isArray(rData) ? royaltiesRes.value.data?.summary || null : rData.summary || rData);
        const entries = rData.earnings || rData.items || rData.royalties || rData.lines || (Array.isArray(rData) ? rData : []);
        setRoyaltyEntries(Array.isArray(entries) ? entries : []);
      }

      if (settlementsRes.status === "fulfilled") {
        const sData = settlementsRes.value.data?.data || settlementsRes.value.data || [];
        const sList = sData.settlements || sData.items || (Array.isArray(sData) ? sData : []);
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
    royaltyEntries.reduce((sum, item) => sum + getRoyalty(item), 0);

  const handleExportCSV = () => {
    if (!royaltyEntries || royaltyEntries.length === 0) {
      toast.error("No entries available to export.");
      return;
    }
    const headers = ["Book Title", "Order", "Copies Sold", "Unit Price (INR)", "Line Revenue (INR)", "Royalty %", "Royalty (INR)", "Date"];
    // Quote every cell and double inner quotes so titles with commas/quotes stay in one column.
    const cell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = royaltyEntries.map((e) => [
      getTitle(e),
      e.orderNumber || e.order?.orderNumber || "",
      getQty(e),
      getUnitPrice(e),
      getLineRevenue(e),
      getRoyaltyPercent(e) ?? "unknown",
      getRoyalty(e),
      getDate(e) ? new Date(getDate(e)).toLocaleDateString("en-IN") : "",
    ]);

    const csvContent = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))].join("\n");
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
      <Tabs id="settlements" value={activeTab} onValueChange={setActiveTab} className="space-y-4 scroll-mt-20">
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
                      <th className="py-3.5 px-4 text-right">Rate</th>
                      <th className="py-3.5 px-4 text-right">Royalty</th>
                      <th className="py-3.5 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E6DF]">
                    {royaltyEntries.map((e, idx) => (
                      <tr key={e._id || idx} className="hover:bg-[#F8F9F7]/50">
                        <td className="py-3 px-4 font-semibold text-[#0F3D3E]">
                          {getTitle(e)}
                          {(e.orderNumber || e.order?.orderNumber) && (
                            <span className="block text-[10px] font-mono font-normal text-[#5C6E6E]">
                              {e.orderNumber || e.order?.orderNumber}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{getQty(e)}</td>
                        <td className="py-3 px-4 text-right text-[#5C6E6E]">₹{getUnitPrice(e).toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-right text-[#5C6E6E]">₹{getLineRevenue(e).toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-right text-[#5C6E6E]">
                          {getRoyaltyPercent(e) !== null ? `${getRoyaltyPercent(e)}%` : (
                            <span className="text-amber-700" title="Historical sale recorded before royalty rates were snapshotted">Unknown</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700">
                          ₹{getRoyalty(e).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right text-[11px] text-[#5C6E6E]">
                          {getDate(e) ? new Date(getDate(e)).toLocaleDateString("en-IN") : "—"}
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
                      <th className="py-3.5 px-4 text-right">Details</th>
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
                          ₹{getSettlementAmount(s).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            const status = getSettlementStatus(s);
                            return (
                              <Badge variant="outline" className={`${status.tone} font-semibold`}>
                                {status.label}
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#5C6E6E]">
                          {s.transactionReference || s.payment?.transactionReference || s.payoutDetails?.transactionReference || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => setOpenSettlementId(String(s._id || s.id))}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Button>
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

      <SettlementDetailDialog settlementId={openSettlementId} onClose={() => setOpenSettlementId(null)} />
    </div>
  );
}

// Royalty line field readers (backend line DTOs vary by controller path).
const num = (...values: any[]) => {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};
const getTitle = (e: any) => e.bookTitle || e.book?.title || e.title || "Book";
const getQty = (e: any) => num(e.quantity, e.copiesSold, e.qty, 1);
const getUnitPrice = (e: any) => num(e.unitPrice, e.price, e.amountPerBook, e.mrp);
const getLineRevenue = (e: any) => num(e.lineTotal, e.grossAmount, e.totalRevenue, e.revenue, getUnitPrice(e) * getQty(e));
const getRoyalty = (e: any) => num(e.royaltyAmount, e.royalty, e.amount);
const getRoyaltyPercent = (e: any): number | null => {
  if (String(e.royaltyStatus || e.status || "").toUpperCase() === "HISTORICAL_RATE_UNAVAILABLE") return null;
  const p = e.royaltyPercentage ?? e.royaltyPercentageSnapshot ?? e.royaltyRate;
  return p === null || p === undefined || p === "" ? null : Number(p);
};
const getDate = (e: any) => e.date || e.soldAt || e.paidAt || e.createdAt || "";

const getSettlementAmount = (s: any) => num(s.totalRoyalty, s.amount, s.totalAmount, s.payoutAmount);
const getSettlementStatus = (s: any) => {
  const raw = String(s.status || s.paymentStatus || "").toUpperCase();
  if (raw === "PAID" || raw === "COMPLETED") return { label: "Paid", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" };
  if (raw.includes("CANCEL")) return { label: "Cancelled", tone: "bg-gray-500/10 text-gray-600 border-gray-500/20" };
  if (raw.includes("PENDING_PAYMENT") || raw.includes("APPROV")) return { label: "Approved · payment pending", tone: "bg-blue-500/10 text-blue-700 border-blue-500/20" };
  if (raw.includes("REJECT") || raw.includes("FAIL")) return { label: "Rejected", tone: "bg-rose-500/10 text-rose-700 border-rose-500/20" };
  if (raw === "DRAFT") return { label: "Draft", tone: "bg-muted text-muted-foreground" };
  return { label: raw ? raw.replace(/_/g, " ").toLowerCase() : "Pending", tone: "bg-amber-500/10 text-amber-700 border-amber-500/20" };
};

/** GET /authors/me/royalty-settlements/{id}: books/orders included, total, payout transaction. */
function SettlementDetailDialog({ settlementId, onClose }: { settlementId: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!settlementId) return;
    setLoadingDetail(true);
    setDetail(null);
    api
      .get(`/authors/me/royalty-settlements/${settlementId}`, { cache: "no-store" } as any)
      .then(({ data }) => setDetail(data?.data?.settlement || data?.data || data))
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Could not load settlement details.");
        onClose();
      })
      .finally(() => setLoadingDetail(false));
  }, [settlementId, onClose]);

  const lines: any[] = detail?.items || detail?.lines || detail?.sourceLines || detail?.royalties || [];
  const status = detail ? getSettlementStatus(detail) : null;
  const payout = detail?.payment || detail?.payout || detail?.payoutDetails || {};

  return (
    <Dialog open={Boolean(settlementId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settlement {detail?.settlementNumber || ""}</DialogTitle>
          <DialogDescription>
            {detail?.periodStart ? new Date(detail.periodStart).toLocaleDateString("en-IN") : "—"} to{" "}
            {detail?.periodEnd ? new Date(detail.periodEnd).toLocaleDateString("en-IN") : "—"}
          </DialogDescription>
        </DialogHeader>

        {loadingDetail || !detail ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="h-6 w-6 animate-spin text-[#0F3D3E]" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-[#5C6E6E]">Total royalty</p>
                <p className="text-lg font-bold text-emerald-700">₹{getSettlementAmount(detail).toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-[#5C6E6E]">Status</p>
                {status && <Badge variant="outline" className={`${status.tone} mt-1`}>{status.label}</Badge>}
              </div>
            </div>

            {(payout.transactionReference || detail.transactionReference || detail.paidAt) && (
              <div className="rounded-lg border p-3 space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">Payout</p>
                <p>Reference: <span className="font-mono">{payout.transactionReference || detail.transactionReference || "—"}</span></p>
                <p>Method: {String(payout.paymentMethod || detail.paymentMethod || "—").replace(/_/g, " ")}</p>
                {(payout.paidAt || detail.paidAt) && (
                  <p>Paid on: {new Date(payout.paidAt || detail.paidAt).toLocaleDateString("en-IN")}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-2">
                Included sales ({lines.length})
              </p>
              {lines.length === 0 ? (
                <p className="text-xs text-[#5C6E6E]">No line items returned for this settlement.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8F9F7] text-[#5C6E6E]">
                      <tr>
                        <th className="text-left p-2">Book</th>
                        <th className="text-left p-2">Order</th>
                        <th className="text-center p-2">Qty</th>
                        <th className="text-right p-2">Royalty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {lines.map((line, i) => (
                        <tr key={line._id || i}>
                          <td className="p-2">{getTitle(line)}</td>
                          <td className="p-2 font-mono">{line.orderNumber || line.order?.orderNumber || "—"}</td>
                          <td className="p-2 text-center">{getQty(line)}</td>
                          <td className="p-2 text-right font-semibold">₹{getRoyalty(line).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
