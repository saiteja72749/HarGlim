"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DollarSign, RefreshCw, X, Plus, Send, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import toast from "react-hot-toast";

type RoyaltyPaymentMethod =
  | "MANUAL_BANK_TRANSFER"
  | "MANUAL_UPI"
  | "CHEQUE"
  | "OTHER";

export default function AdminSettlementsPage() {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"settlements" | "preview">("settlements");

  // Preview State
  const [authorId, setAuthorId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);

  // Mark Paid Modal State
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [payoutForm, setPayoutForm] = useState<{
    paymentMethod: RoyaltyPaymentMethod;
    transactionReference: string;
    notes: string;
    paidAt: string;
  }>({
    paymentMethod: "MANUAL_BANK_TRANSFER",
    transactionReference: "",
    notes: "Paid through manual bank transfer.",
    paidAt: new Date().toISOString().split("T")[0],
  });
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Load Settlements
  const loadSettlements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/royalty-settlements");
      const list = data?.data?.settlements || data?.data || data || [];
      setSettlements(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.warn("Failed to load settlements:", err);
      toast.error("Failed to load royalty settlements.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Authors for Selection
  useEffect(() => {
    const loadAuthors = async () => {
      try {
        const res = await api.get("/authors", { params: { limit: 100 } }).catch(() =>
          api.get("/admin/users", { params: { role: "author", limit: 100 } })
        );
        const data = res?.data?.data?.authors || res?.data?.authors || res?.data?.data || res?.data || [];
        const arr = Array.isArray(data) ? data : [];
        setAuthors(arr);
        if (arr.length > 0 && !authorId) {
          setAuthorId(arr[0]._id || arr[0].id);
        }
      } catch (e) {
        console.warn("Could not load authors list:", e);
      }
    };
    loadAuthors();
    loadSettlements();
  }, [loadSettlements]);

  // Handle Settlement Batch Preview
  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorId.trim()) {
      toast.error("Please enter or select an Author ID.");
      return;
    }

    setPreviewing(true);
    try {
      const payload = {
        authorId: authorId.trim(),
        from: new Date(`${fromDate}T00:00:00.000Z`).toISOString(),
        to: new Date(`${toDate}T23:59:59.999Z`).toISOString(),
      };
      const { data } = await api.post("/admin/royalty-settlements/preview", payload);
      setPreviewData(data?.data || data);
      toast.success("Candidate royalties preview generated!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to generate settlement preview.");
    } finally {
      setPreviewing(false);
    }
  };

  // Handle Create Draft Batch
  const handleCreateDraftBatch = async (authorTargetId?: string) => {
    const targetAuthor = authorTargetId || authorId.trim();
    if (!targetAuthor) {
      toast.error("Author ID is required to create a settlement batch.");
      return;
    }

    setCreatingBatch(true);
    try {
      const payload = {
        authorId: targetAuthor,
        periodStart: previewData?.periodStart || new Date(`${fromDate}T00:00:00.000Z`).toISOString(),
        periodEnd: previewData?.periodEnd || new Date(`${toDate}T23:59:59.999Z`).toISOString(),
      };
      await api.post("/admin/royalty-settlements", payload);
      toast.success("Draft settlement batch created! 🎉");
      setActiveTab("settlements");
      loadSettlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create draft settlement batch.");
    } finally {
      setCreatingBatch(false);
    }
  };

  // Handle Approve Batch
  const handleApproveBatch = async (id: string) => {
    try {
      await api.post(`/admin/royalty-settlements/${id}/approve`, {
        payment_status: "approved",
        status: "APPROVED",
      });
      toast.success("Settlement batch approved!");
      loadSettlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve settlement batch.");
    }
  };

  // Handle Mark Paid Submit
  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm.transactionReference.trim()) {
      toast.error("Please enter a transaction / UTR reference number.");
      return;
    }

    const id = selectedSettlement?._id || selectedSettlement?.id;
    setSubmittingPayout(true);
    try {
      const payload = {
        paymentMethod: payoutForm.paymentMethod,
        transactionReference: payoutForm.transactionReference.trim(),
        paidAt: payoutForm.paidAt ? new Date(`${payoutForm.paidAt}T12:00:00.000Z`).toISOString() : new Date().toISOString(),
        notes: payoutForm.notes.trim() || undefined,
      };

      await api.post(`/admin/royalty-settlements/${id}/mark-paid`, payload);
      toast.success("Manual payout recorded successfully! 💰");
      setSelectedSettlement(null);
      loadSettlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to record manual payout.");
    } finally {
      setSubmittingPayout(false);
    }
  };

  // Handle Cancel Batch
  const handleCancelBatch = async (id: string) => {
    const reason = prompt("Enter cancellation rationale:", "Cancelled by Admin");
    if (reason === null) return;

    try {
      await api.post(`/admin/royalty-settlements/${id}/cancel`, {
        reason: reason || "Cancelled by Admin",
      });
      toast.success("Settlement batch cancelled.");
      loadSettlements();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel settlement batch.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Draft</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Approved (Payment Pending)</Badge>;
      case "PAID":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Paid Out</Badge>;
      case "CANCELLED":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">
            Royalty Settlement Accounting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preview, create, approve, and record manual external payouts for author royalties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === "settlements" ? "default" : "outline"}
            onClick={() => setActiveTab("settlements")}
            size="sm"
          >
            All Settlements
          </Button>
          <Button
            variant={activeTab === "preview" ? "default" : "outline"}
            onClick={() => setActiveTab("preview")}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Preview & Create</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={loadSettlements} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {activeTab === "preview" ? (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Preview & Create Settlement Batch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handlePreview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <Label htmlFor="authorSelect" className="text-xs font-semibold text-muted-foreground uppercase">
                    Select Author *
                  </Label>
                  {authors.length > 0 ? (
                    <Select value={authorId} onValueChange={setAuthorId}>
                      <SelectTrigger id="authorSelect">
                        <SelectValue placeholder="Choose an author" />
                      </SelectTrigger>
                      <SelectContent>
                        {authors.map((a) => (
                          <SelectItem key={a._id || a.id} value={a._id || a.id}>
                            {a.name || a.fullName || a.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="authorId"
                      placeholder="Enter Author MongoDB ObjectId"
                      value={authorId}
                      onChange={(e) => setAuthorId(e.target.value)}
                      required
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fromDate" className="text-xs font-semibold text-muted-foreground uppercase">
                    From Date
                  </Label>
                  <Input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="toDate" className="text-xs font-semibold text-muted-foreground uppercase">
                    To Date
                  </Label>
                  <Input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={previewing} className="gap-2">
                  <Calendar className="h-4 w-4" />
                  {previewing ? "Generating..." : "Generate Preview"}
                </Button>
              </div>
            </form>

            {previewData && (
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                  <div>
                    <h4 className="font-bold text-foreground">Candidate Royalty Preview Summary</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Period: {new Date(fromDate).toLocaleDateString()} to {new Date(toDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total Eligible Units/Claims: {previewData.totalClaims || previewData.claims?.length || previewData.totalSales || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      ₹{(previewData.totalAmount || previewData.totalRoyalty || previewData.amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Payable Amount</p>
                  </div>
                </div>

                <Button
                  onClick={() => handleCreateDraftBatch()}
                  disabled={creatingBatch}
                  className="w-full h-11 font-medium gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{creatingBatch ? "Creating Batch..." : "Create Draft Settlement Batch"}</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Settlement Batches</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 flex justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : settlements.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
                <DollarSign className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p>No royalty settlement batches created yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                    <tr>
                      <th className="py-3 px-4">Settlement ID / Number</th>
                      <th className="py-3 px-4">Author</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-b">
                    {settlements.map((item) => (
                      <tr key={item._id || item.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                          {item.settlementNumber || item._id || item.id}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {item.author?.name || item.author?.fullName || item.author?.email || item.author || "Author"}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {item.periodStart ? new Date(item.periodStart).toLocaleDateString() : "—"} to{" "}
                          {item.periodEnd ? new Date(item.periodEnd).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          ₹{(item.amount || item.totalRoyalty || item.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {item.status === "DRAFT" && (
                            <Button size="sm" onClick={() => handleApproveBatch(item._id || item.id)}>
                              Approve
                            </Button>
                          )}
                          {item.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => {
                                setSelectedSettlement(item);
                                setPayoutForm({
                                  paymentMethod: "MANUAL_BANK_TRANSFER",
                                  transactionReference: "",
                                  notes: `Paid royalty settlement ${item.settlementNumber || item._id}`,
                                  paidAt: new Date().toISOString().split("T")[0],
                                });
                              }}
                            >
                              Record Payout
                            </Button>
                          )}
                          {item.status !== "PAID" && item.status !== "CANCELLED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleCancelBatch(item._id || item.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Record Manual Payout Modal */}
      <AnimatePresence>
        {selectedSettlement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md p-6 border bg-card rounded-2xl shadow-xl space-y-4"
            >
              <button
                onClick={() => setSelectedSettlement(null)}
                aria-label="Close"
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-foreground">Record External Payout</h3>
                <p className="text-xs text-muted-foreground">
                  Record transaction details after completing manual payout of ₹
                  {(selectedSettlement.amount || selectedSettlement.totalRoyalty || selectedSettlement.totalAmount || 0).toLocaleString()}.
                </p>
              </div>

              <form onSubmit={handleMarkPaidSubmit} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod" className="text-xs font-semibold uppercase text-muted-foreground">
                    Payment Method *
                  </Label>
                  <Select
                    value={payoutForm.paymentMethod}
                    onValueChange={(val: RoyaltyPaymentMethod) =>
                      setPayoutForm({ ...payoutForm, paymentMethod: val })
                    }
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL_BANK_TRANSFER">Manual Bank Transfer (NEFT / IMPS / RTGS)</SelectItem>
                      <SelectItem value="MANUAL_UPI">Manual UPI Transfer</SelectItem>
                      <SelectItem value="CHEQUE">Cheque / Demand Draft</SelectItem>
                      <SelectItem value="OTHER">Other Payout Method</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="transactionReference" className="text-xs font-semibold uppercase text-muted-foreground">
                    Transaction / UTR Reference *
                  </Label>
                  <Input
                    id="transactionReference"
                    placeholder="e.g. BANK-UTR-987654321"
                    value={payoutForm.transactionReference}
                    onChange={(e) => setPayoutForm({ ...payoutForm, transactionReference: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="paidAtDate" className="text-xs font-semibold uppercase text-muted-foreground">
                    Payout Date
                  </Label>
                  <Input
                    id="paidAtDate"
                    type="date"
                    value={payoutForm.paidAt}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paidAt: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-xs font-semibold uppercase text-muted-foreground">
                    Notes
                  </Label>
                  <Input
                    id="notes"
                    value={payoutForm.notes}
                    onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setSelectedSettlement(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submittingPayout} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    {submittingPayout ? "Recording..." : "Record Paid Payout"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
