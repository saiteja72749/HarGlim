"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  QrCode,
  AlertTriangle,
  Ban,
  Eye,
  User,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import toast from "react-hot-toast";

import {
  listAdminPayments,
  getAdminPaymentDetail,
  approveAdminPayment,
  rejectAdminPayment,
  cancelAdminPayment,
  expireAdminPayment,
  retryAdminVerification,
  recreateAdminQr,
  AdminPaymentQueryParams,
} from "@/lib/admin-payments-api";

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const getMongoId = (value?: unknown) => {
  if (typeof value !== "string") return undefined;
  return MONGO_ID_REGEX.test(value) ? value : undefined;
};

export default function AdminPaymentVerificationPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters State
  const [statusFilter, setStatusFilter] = useState("VERIFICATION_PENDING");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL");
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<any>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch payments list
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: AdminPaymentQueryParams = {
        page,
        limit: 20,
        status: statusFilter,
        paymentMethod: paymentMethodFilter,
        provider: providerFilter,
        search: searchQuery,
      };

      const res = await listAdminPayments(params);
      const items = res?.data?.items || res?.items || (Array.isArray(res?.data) ? res.data : []);
      const pag = res?.data?.pagination || res?.pagination || {
        total: items.length,
        page,
        limit: 20,
        pages: Math.ceil(items.length / 20) || 1,
      };

      setPayments(Array.isArray(items) ? items : []);
      setPagination(pag);
    } catch (err: any) {
      console.error("Failed to fetch admin payments queue:", err);
      setError(true);
      toast.error(err.response?.data?.message || "Failed to load payment verification queue.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentMethodFilter, providerFilter, searchQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Open Detail Dialog
  const handleOpenDetail = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to view details.");
      return;
    }

    setDetailModalOpen(true);
    setLoadingDetail(true);
    setSelectedPaymentDetail(null);
    setActionReason("");

    try {
      const res = await getAdminPaymentDetail(paymentId);
      setSelectedPaymentDetail(res?.data || res);
    } catch (err: any) {
      console.error("Failed to load payment details:", err);
      toast.error(err.response?.data?.message || "Failed to load payment details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // 3. Approve Payment
  const handleApprove = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to approve.");
      return;
    }
    setActionLoading("approve");
    try {
      const reason = actionReason.trim() || "Admin payment approved";
      await approveAdminPayment(paymentId, { reason });
      toast.success("Payment approved successfully! Order status updated to Paid. ✅");
      setActionReason("");
      setDetailModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve payment.");
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Reject Payment
  const handleReject = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to reject.");
      return;
    }
    setActionLoading("reject");
    try {
      const reason = actionReason.trim() || "UTR reference mismatch";
      await rejectAdminPayment(paymentId, { reason });
      toast.error("Payment rejected successfully. ❌");
      setActionReason("");
      setDetailModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject payment.");
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Cancel Payment
  const handleCancel = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to cancel.");
      return;
    }

    if (!confirm("Are you sure you want to cancel this payment intent?")) return;
    setActionLoading("cancel");
    try {
      const reason = actionReason.trim() || "Order cancelled by admin";
      await cancelAdminPayment(paymentId, { reason });
      toast.success("Payment intent cancelled.");
      setActionReason("");
      fetchPayments();
      if (selectedPaymentDetail) handleOpenDetail(paymentId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel payment.");
    } finally {
      setActionLoading(null);
    }
  };

  // 6. Expire Payment
  const handleExpire = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to expire.");
      return;
    }

    if (!confirm("Are you sure you want to manually expire this payment intent?")) return;
    setActionLoading("expire");
    try {
      const reason = actionReason.trim() || "Payment window expired";
      await expireAdminPayment(paymentId, { reason });
      toast.success("Payment intent set to expired.");
      setActionReason("");
      fetchPayments();
      if (selectedPaymentDetail) handleOpenDetail(paymentId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to expire payment.");
    } finally {
      setActionLoading(null);
    }
  };

  // 7. Retry Verification
  const handleRetryVerification = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to retry verification.");
      return;
    }

    setActionLoading("retry");
    try {
      await retryAdminVerification(paymentId);
      toast.success("Verification retried.");
      fetchPayments();
      if (selectedPaymentDetail) handleOpenDetail(paymentId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to retry verification.");
    } finally {
      setActionLoading(null);
    }
  };

  // 8. Recreate QR
  const handleRecreateQr = async (paymentId: string) => {
    if (!getMongoId(paymentId)) {
      toast.error("Payment Mongo ID is required to recreate QR.");
      return;
    }

    setActionLoading("recreate-qr");
    try {
      await recreateAdminQr(paymentId, { force: true, reason: actionReason.trim() || "Admin requested new QR" });
      toast.success("QR Code recreated successfully!");
      fetchPayments();
      if (selectedPaymentDetail) handleOpenDetail(paymentId);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to recreate QR.");
    } finally {
      setActionLoading(null);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    switch (s) {
      case "VERIFICATION_PENDING":
      case "PAYMENT_SUBMITTED":
        return (
          <Badge className="bg-amber-500/10 text-amber-700 border border-amber-500/30 font-semibold text-xs animate-pulse">
            <Clock className="w-3 h-3 mr-1" /> Pending Verification
          </Badge>
        );
      case "PAYMENT_VERIFIED":
      case "VERIFIED":
      case "SUCCESS":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 font-semibold text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verified
          </Badge>
        );
      case "PAYMENT_REJECTED":
      case "REJECTED":
        return (
          <Badge className="bg-rose-500/10 text-rose-700 border border-rose-500/30 font-semibold text-xs">
            <XCircle className="w-3 h-3 mr-1 text-rose-600" /> Rejected
          </Badge>
        );
      case "PAYMENT_FAILED":
      case "FAILED":
        return (
          <Badge className="bg-red-500/10 text-red-700 border border-red-500/30 font-semibold text-xs">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-600" /> Failed
          </Badge>
        );
      case "PAYMENT_EXPIRED":
      case "EXPIRED":
        return (
          <Badge className="bg-gray-500/10 text-gray-700 border border-gray-500/30 font-semibold text-xs">
            <Clock className="w-3 h-3 mr-1 text-gray-500" /> Expired
          </Badge>
        );
      case "PAYMENT_CANCELLED":
      case "CANCELLED":
        return (
          <Badge className="bg-zinc-500/10 text-zinc-700 border border-zinc-500/30 font-semibold text-xs">
            <Ban className="w-3 h-3 mr-1 text-zinc-500" /> Cancelled
          </Badge>
        );
      case "QR_GENERATED":
        return (
          <Badge className="bg-indigo-500/10 text-indigo-700 border border-indigo-500/30 font-semibold text-xs">
            <QrCode className="w-3 h-3 mr-1 text-indigo-600" /> QR Generated
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border border-gray-300 font-semibold text-xs">
            {status || "Unknown"}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-[#0F3D3E]" />
            <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
              Payment Verification Queue
            </h1>
          </div>
          <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
            Review customer UTR submissions, approve manual payments, and manage payment intents.
          </p>
        </div>

        <Button
          onClick={fetchPayments}
          variant="outline"
          className="border-[#0F3D3E]/20 text-[#0F3D3E] hover:bg-[#0F3D3E]/5 gap-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Filter and Search Controls */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
              <Input
                placeholder="Search UTR, Order #, Email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-white border-[#E2E6DF] h-10 rounded-xl"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-white border-[#E2E6DF] h-10 rounded-xl">
                <Filter className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="VERIFICATION_PENDING">Pending Verification</SelectItem>
                <SelectItem value="PAYMENT_VERIFIED">Payment Verified</SelectItem>
                <SelectItem value="PAYMENT_REJECTED">Payment Rejected</SelectItem>
                <SelectItem value="PAYMENT_FAILED">Payment Failed</SelectItem>
                <SelectItem value="PAYMENT_EXPIRED">Payment Expired</SelectItem>
                <SelectItem value="PAYMENT_CANCELLED">Payment Cancelled</SelectItem>
                <SelectItem value="QR_GENERATED">QR Generated</SelectItem>
                <SelectItem value="PAYMENT_SUBMITTED">Payment Submitted</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select
              value={paymentMethodFilter}
              onValueChange={(val) => {
                setPaymentMethodFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-white border-[#E2E6DF] h-10 rounded-xl">
                <CreditCard className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Methods</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
                <SelectItem value="NETBANKING">Net Banking</SelectItem>
              </SelectContent>
            </Select>

            {/* Provider Filter */}
            <Select
              value={providerFilter}
              onValueChange={(val) => {
                setProviderFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-white border-[#E2E6DF] h-10 rounded-xl">
                <Sparkles className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Providers</SelectItem>
                <SelectItem value="manual">Manual UPI</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="phonepe">PhonePe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Data Table */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="h-8 w-8 text-[#0F3D3E] animate-spin" />
              <p className="text-sm font-medium text-[#5C6E6E]">Loading verification queue...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto" />
              <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">Error Loading Payments</h3>
              <p className="text-sm text-[#5C6E6E]">Unable to fetch payments queue from backend API.</p>
              <Button onClick={fetchPayments} className="bg-[#0F3D3E] text-white">
                Retry Now
              </Button>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto" />
              <h3 className="font-serif font-bold text-base text-[#0F3D3E]">No Payments Found</h3>
              <p className="text-xs text-[#5C6E6E] max-w-sm mx-auto">
                No payment transactions match the selected filters or search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Order & Date</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Customer</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">UTR Reference</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Method / Provider</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Amount</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Status</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => {
                    const paymentId = getMongoId(p._id) || getMongoId(p.id);
                    const orderNum = p.order?.orderNumber || p.orderId || "N/A";
                    const customerName = p.user?.name || p.customer?.name || "Customer";
                    const customerEmail = p.user?.email || p.customer?.email || "N/A";
                    const amount = p.amount ?? p.order?.totalPrice ?? 0;
                    const currency = p.currency || "INR";
                    const status = p.status || "VERIFICATION_PENDING";
                    const isPending = status === "VERIFICATION_PENDING" || status === "PAYMENT_SUBMITTED";

                    return (
                      <TableRow key={paymentId} className="hover:bg-[#F8F9F7]/60 text-xs">
                        {/* Order & Date */}
                        <TableCell>
                          <p className="font-mono font-bold text-[#0F3D3E]">{orderNum}</p>
                          <p className="text-[10px] text-[#5C6E6E] font-sans">
                            {p.createdAt ? new Date(p.createdAt).toLocaleString() : "N/A"}
                          </p>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <p className="font-serif font-bold text-[#0F3D3E]">{customerName}</p>
                          <p className="text-[11px] text-[#5C6E6E] font-sans">{customerEmail}</p>
                        </TableCell>

                        {/* UTR */}
                        <TableCell>
                          {p.utr ? (
                            <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300">
                              {p.utr}
                            </span>
                          ) : (
                            <span className="text-[#5C6E6E] italic text-[11px]">No UTR provided</span>
                          )}
                        </TableCell>

                        {/* Method & Provider */}
                        <TableCell>
                          <p className="font-semibold text-[#0F3D3E] uppercase">{p.paymentMethod || "UPI"}</p>
                          <p className="text-[10px] text-[#5C6E6E] capitalize">{p.provider || "manual"}</p>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right font-serif font-bold text-[#0F3D3E]">
                          {currency === "INR" ? "₹" : "$"}
                          {Number(amount).toLocaleString()}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {getStatusBadge(status)}
                        </TableCell>

                        {/* Quick Actions */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => paymentId && handleOpenDetail(paymentId)}
                              disabled={!paymentId}
                              className="border-[#0F3D3E]/30 text-[#0F3D3E] hover:bg-[#0F3D3E]/5 text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </Button>

                             {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => paymentId && handleApprove(paymentId)}
                                  disabled={!paymentId || actionLoading === "approve"}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => paymentId && handleReject(paymentId)}
                                  disabled={!paymentId || actionLoading === "reject"}
                                  className="text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                >
                                  <XCircle className="h-3 w-3" />
                                  <span>Reject</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#E2E6DF] bg-[#F8F9F7]">
              <span className="text-xs text-[#5C6E6E]">
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong> ({pagination.total} total items)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="h-8 border-[#E2E6DF] text-xs gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((prev) => Math.min(prev + 1, pagination.pages))}
                  className="h-8 border-[#E2E6DF] text-xs gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Payment Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl bg-white border-[#E2E6DF] rounded-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-4 border-b border-[#E2E6DF] sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="font-serif font-bold text-xl text-[#0F3D3E] flex items-center gap-2">
                  <span>Payment Detail & Verification</span>
                  {selectedPaymentDetail?.payment?.status &&
                    getStatusBadge(selectedPaymentDetail.payment.status)}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5C6E6E] mt-1 font-mono">
                  Payment ID: {selectedPaymentDetail?.payment?._id || selectedPaymentDetail?._id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {loadingDetail ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <RefreshCw className="h-8 w-8 text-[#0F3D3E] animate-spin" />
              <p className="text-sm font-medium text-[#5C6E6E]">Fetching full verification payload...</p>
            </div>
          ) : !selectedPaymentDetail ? (
            <div className="p-8 text-center text-rose-600 font-semibold text-sm">
              Failed to load payment details.
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Payment Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">Amount & Currency</p>
                  <p className="text-2xl font-serif font-bold text-[#0F3D3E] mt-1">
                    ₹{selectedPaymentDetail.payment?.amount || selectedPaymentDetail.amount || 0}
                  </p>
                  <p className="text-xs text-[#5C6E6E] mt-0.5 capitalize">
                    Method: {selectedPaymentDetail.payment?.paymentMethod || "UPI"} ({selectedPaymentDetail.payment?.provider || "manual"})
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">UTR / Reference Number</p>
                  <p className="text-lg font-mono font-bold text-amber-900 mt-1 break-all">
                    {selectedPaymentDetail.payment?.utr || selectedPaymentDetail.utr || "Not Submitted"}
                  </p>
                  <p className="text-xs text-amber-700/80 mt-0.5">
                    Match UTR against bank account statement
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">Associated Order</p>
                  <p className="text-lg font-mono font-bold text-[#0F3D3E] mt-1">
                    {selectedPaymentDetail.order?.orderNumber || "N/A"}
                  </p>
                  <p className="text-xs text-[#5C6E6E] mt-0.5">
                    Order Status: <strong>{selectedPaymentDetail.order?.status || "PENDING"}</strong> | Paid: <strong>{selectedPaymentDetail.order?.isPaid ? "Yes" : "No"}</strong>
                  </p>
                </div>
              </div>

              {/* QR Code Section (if present) */}
              {selectedPaymentDetail.qr && (
                <Card className="border border-indigo-100 bg-indigo-50/40 rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-indigo-600" />
                      <span>QR Code & UPI Info</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col sm:flex-row items-center gap-4 pt-0">
                    {selectedPaymentDetail.qr.qrCodeDataUrl && (
                      <Image
                        src={selectedPaymentDetail.qr.qrCodeDataUrl}
                        alt="UPI QR Code"
                        width={128}
                        height={128}
                        className="w-32 h-32 rounded-lg border border-indigo-200 shadow-sm bg-white p-1"
                      />
                    )}
                    <div className="space-y-1 text-xs text-indigo-950 flex-1">
                      <p><strong>UPI URI:</strong> <code className="text-[10px] bg-white px-2 py-0.5 rounded border border-indigo-200 break-all">{selectedPaymentDetail.qr.upiUrl || selectedPaymentDetail.qr.upiUri || "N/A"}</code></p>
                      <p><strong>Expires At:</strong> {selectedPaymentDetail.qr.qrExpiresAt ? new Date(selectedPaymentDetail.qr.qrExpiresAt).toLocaleString() : "N/A"}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Specs Tabs */}
              <Tabs defaultValue="customer-order" className="w-full">
                <TabsList className="grid grid-cols-4 bg-[#F8F9F7] p-1 rounded-xl">
                  <TabsTrigger value="customer-order" className="text-xs font-semibold">Customer & Order</TabsTrigger>
                  <TabsTrigger value="verification" className="text-xs font-semibold">Verification & Ledger</TabsTrigger>
                  <TabsTrigger value="inventory" className="text-xs font-semibold">Inventory</TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs font-semibold">Audit Log</TabsTrigger>
                </TabsList>

                {/* Tab 1: Customer & Order */}
                <TabsContent value="customer-order" className="space-y-4 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-xl border border-[#E2E6DF] space-y-2">
                      <h4 className="font-bold text-[#0F3D3E] flex items-center gap-1.5">
                        <User className="h-4 w-4 text-[#0F3D3E]" /> Customer Details
                      </h4>
                      <p><strong>Name:</strong> {selectedPaymentDetail.customer?.name || selectedPaymentDetail.user?.name || "N/A"}</p>
                      <p><strong>Email:</strong> {selectedPaymentDetail.customer?.email || selectedPaymentDetail.user?.email || "N/A"}</p>
                      <p><strong>Customer ID:</strong> <code className="text-[10px] font-mono">{selectedPaymentDetail.customer?._id || selectedPaymentDetail.user?._id || "N/A"}</code></p>
                    </div>

                    <div className="p-4 rounded-xl border border-[#E2E6DF] space-y-2">
                      <h4 className="font-bold text-[#0F3D3E] flex items-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 text-[#0F3D3E]" /> Order Summary
                      </h4>
                      <p><strong>Order Number:</strong> {selectedPaymentDetail.order?.orderNumber || "N/A"}</p>
                      <p><strong>Total Price:</strong> ₹{selectedPaymentDetail.order?.totalPrice || selectedPaymentDetail.order?.totalAmount || 0}</p>
                      <p><strong>isPaid:</strong> {selectedPaymentDetail.order?.isPaid ? "true ✅" : "false ❌"}</p>
                    </div>
                  </div>

                  {/* Books Array */}
                  {Array.isArray(selectedPaymentDetail.books) && selectedPaymentDetail.books.length > 0 && (
                    <div className="border border-[#E2E6DF] rounded-xl overflow-hidden">
                      <div className="bg-[#F8F9F7] px-4 py-2 font-bold text-xs text-[#0F3D3E]">
                        Order Books ({selectedPaymentDetail.books.length})
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="text-[11px]">
                            <TableHead>Book Title</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPaymentDetail.books.map((b: any, idx: number) => (
                            <TableRow key={idx} className="text-xs">
                              <TableCell className="font-serif font-medium">{b.title || b.name || "Book"}</TableCell>
                              <TableCell className="text-right font-mono">₹{b.price || 0}</TableCell>
                              <TableCell className="text-right font-mono">{b.quantity || 1}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Verification History & Payment Ledger */}
                <TabsContent value="verification" className="space-y-4 pt-3">
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs text-[#0F3D3E] uppercase tracking-wider">Verification History</h4>
                    {!selectedPaymentDetail.verificationHistory || selectedPaymentDetail.verificationHistory.length === 0 ? (
                      <p className="text-xs text-[#5C6E6E] italic">No verification history recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPaymentDetail.verificationHistory.map((vh: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E2E6DF] text-xs">
                            <p className="font-semibold text-[#0F3D3E]">{vh.status || vh.action || "Verification Event"}</p>
                            <p className="text-[11px] text-[#5C6E6E]">{vh.note || vh.reason || "No notes"}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{vh.timestamp ? new Date(vh.timestamp).toLocaleString() : ""}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-xs text-[#0F3D3E] uppercase tracking-wider">Payment Ledger</h4>
                    {!selectedPaymentDetail.paymentLedger || selectedPaymentDetail.paymentLedger.length === 0 ? (
                      <p className="text-xs text-[#5C6E6E] italic">No ledger entries recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPaymentDetail.paymentLedger.map((pl: any, idx: number) => (
                          <div key={idx} className="p-3 bg-[#F8F9F7] rounded-lg border border-[#E2E6DF] text-xs">
                            <p className="font-semibold text-[#0F3D3E]">{pl.entryType || pl.type || "Ledger Item"}</p>
                            <p className="text-[11px] text-[#5C6E6E]">Amount: ₹{pl.amount || 0}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Inventory */}
                <TabsContent value="inventory" className="space-y-4 pt-3 text-xs">
                  <div>
                    <h4 className="font-bold text-[#0F3D3E] mb-2 uppercase text-[11px]">Inventory Reservations</h4>
                    {!selectedPaymentDetail.inventoryReservations || selectedPaymentDetail.inventoryReservations.length === 0 ? (
                      <p className="text-[#5C6E6E] italic">No active inventory reservations.</p>
                    ) : (
                      <pre className="p-3 bg-[#F8F9F7] rounded-lg text-[10px] font-mono border border-[#E2E6DF]">
                        {JSON.stringify(selectedPaymentDetail.inventoryReservations, null, 2)}
                      </pre>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 4: Audit History */}
                <TabsContent value="audit" className="space-y-3 pt-3 text-xs">
                  <h4 className="font-bold text-[#0F3D3E] uppercase text-[11px]">Audit History Log</h4>
                  {!selectedPaymentDetail.auditHistory || selectedPaymentDetail.auditHistory.length === 0 ? (
                    <p className="text-[#5C6E6E] italic">No audit events recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedPaymentDetail.auditHistory.map((ah: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-[#F8F9F7] rounded-lg border border-[#E2E6DF] text-xs">
                          <p className="font-bold text-[#0F3D3E]">{ah.action || ah.event || "Audit Log"}</p>
                          <p className="text-[11px] text-[#5C6E6E]">{ah.details || ah.reason || ""}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{ah.createdAt ? new Date(ah.createdAt).toLocaleString() : ""}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Reason / Metadata Input */}
              <div className="pt-4 border-t border-[#E2E6DF] space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Action Reason / Admin Note (Optional)
                </label>
                <Input
                  placeholder="e.g. UTR matched in bank statement / UTR not found / Customer requested QR refresh"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="bg-white border-[#E2E6DF] text-xs h-10 rounded-xl"
                />
              </div>

              {/* Actions Button Matrix */}
              <div className="bg-[#F8F9F7] p-4 rounded-2xl border border-[#E2E6DF] space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Admin Verification Actions
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Approve */}
                  <Button
                    onClick={() => {
                      const paymentId = getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id);
                      if (paymentId) handleApprove(paymentId);
                    }}
                    disabled={actionLoading !== null || !(getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id))}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Approve Payment</span>
                  </Button>

                  {/* Reject */}
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const paymentId = getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id);
                      if (paymentId) handleReject(paymentId);
                    }}
                    disabled={actionLoading !== null || !(getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id))}
                    className="font-semibold text-xs h-9 px-4 rounded-xl gap-1.5"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject Payment</span>
                  </Button>

                  {/* Recreate QR */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const paymentId = getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id);
                      if (paymentId) handleRecreateQr(paymentId);
                    }}
                    disabled={actionLoading !== null || !(getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id))}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold text-xs h-9 px-3.5 rounded-xl gap-1.5"
                  >
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    <span>Recreate QR</span>
                  </Button>

                  {/* Retry Verification */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const paymentId = getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id);
                      if (paymentId) handleRetryVerification(paymentId);
                    }}
                    disabled={actionLoading !== null || !(getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id))}
                    className="border-amber-300 text-amber-800 hover:bg-amber-50 font-semibold text-xs h-9 px-3.5 rounded-xl gap-1.5"
                  >
                    <RotateCcw className="h-4 w-4 text-amber-700" />
                    <span>Retry Verification</span>
                  </Button>

                  {/* Expire Intent */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const paymentId = getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id);
                      if (paymentId) handleExpire(paymentId);
                    }}
                    disabled={actionLoading !== null || !(getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id))}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-xs h-9 px-3.5 rounded-xl gap-1.5"
                  >
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span>Expire Intent</span>
                  </Button>

                  {/* Cancel Intent */}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const paymentId = getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id);
                      if (paymentId) handleCancel(paymentId);
                    }}
                    disabled={actionLoading !== null || !(getMongoId(selectedPaymentDetail.payment?._id) || getMongoId(selectedPaymentDetail._id))}
                    className="border-zinc-300 text-zinc-700 hover:bg-zinc-100 font-semibold text-xs h-9 px-3.5 rounded-xl gap-1.5"
                  >
                    <Ban className="h-4 w-4 text-zinc-500" />
                    <span>Cancel Intent</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 border-t border-[#E2E6DF] bg-white sticky bottom-0">
            <Button
              variant="outline"
              onClick={() => setDetailModalOpen(false)}
              className="border-[#E2E6DF] text-xs rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
