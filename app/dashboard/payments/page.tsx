"use client";

import type { PaymentRecord, InvoiceRecord, OrderRecord } from "@/types/commerce-api";
import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError } from "@/lib/api-error";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  Download,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  IndianRupee,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { publishedNumber } from "@/lib/book-presentation";
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
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { extractList } from "@/lib/tracking";
import { PAYMENT_STATE_META, getPaymentOrderId, populated, relatedId, mapPaymentStatus, type PaymentState } from "@/lib/order-status";

const FILTERS: { value: "ALL" | PaymentState; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "verification_pending", label: "Verification Pending" },
  { value: "paid", label: "Verified / Paid" },
  { value: "failed", label: "Rejected / Failed" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const PURPOSE_LABEL: Record<string, string> = {
  ORDER_PURCHASE: "Book order",
  AUTHOR_ACCESS: "Author dashboard plan",
};

const getStatusColor = (status: string | undefined) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "COMPLETED":
    case "VERIFIED":
    case "PAID":
    case "PAYMENT_VERIFIED":
    case "APPROVED":
    case "CONFIRMED":
    case "SUCCESS":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "PENDING":
    case "VERIFICATION_PENDING":
    case "INTENT_CREATED":
    case "QR_GENERATED":
    case "PAYMENT_SUBMITTED":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "FAILED":
    case "REJECTED":
    case "PAYMENT_FAILED":
    case "PAYMENT_REJECTED":
      return "bg-red-500/10 text-red-600 border-red-500/20";
    case "CANCELLED":
    case "EXPIRED":
    case "PAYMENT_CANCELLED":
    case "PAYMENT_EXPIRED":
      return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusIcon = (status: string | undefined) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "COMPLETED":
    case "VERIFIED":
    case "PAID":
    case "PAYMENT_VERIFIED":
    case "APPROVED":
    case "CONFIRMED":
    case "SUCCESS":
      return CheckCircle;
    case "PENDING":
    case "VERIFICATION_PENDING":
    case "INTENT_CREATED":
    case "QR_GENERATED":
    case "PAYMENT_SUBMITTED":
      return Clock;
    case "FAILED":
    case "REJECTED":
    case "PAYMENT_FAILED":
    case "PAYMENT_REJECTED":
      return XCircle;
    default:
      return AlertTriangle;
  }
};

const getFriendlyStatus = (status: string | undefined) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "COMPLETED":
    case "VERIFIED":
    case "PAID":
    case "PAYMENT_VERIFIED":
    case "APPROVED":
    case "CONFIRMED":
    case "SUCCESS":
      return "Verified";
    case "VERIFICATION_PENDING":
    case "PAYMENT_SUBMITTED":
      return "Verification Pending";
    case "INTENT_CREATED":
    case "QR_GENERATED":
    case "PENDING":
      return "Awaiting Payment";
    case "FAILED":
    case "PAYMENT_FAILED":
      return "Failed";
    case "REJECTED":
    case "PAYMENT_REJECTED":
      return "Rejected";
    case "CANCELLED":
    case "PAYMENT_CANCELLED":
      return "Cancelled";
    case "EXPIRED":
    case "PAYMENT_EXPIRED":
      return "Expired";
    default:
      return status || "Pending";
  }
};

export default function PaymentsPage() {
  const { user } = useAuthStore();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentState>("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [orderNumbers, setOrderNumbers] = useState<Record<string, string>>({});

  const fetchPayments = useCallback(async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;

    setLoading(true);
    setError(false);
    try {
      // Filtering happens client-side: the backend status values (PAYMENT_VERIFIED, QR_GENERATED...)
      // don't match the old filter values (VERIFIED, INTENT_CREATED...), so server filtering returned nothing.
      const [res, ordersRes] = await Promise.all([
        api.get(`/users/${userId}/payments`, { params: { page: 1, limit: 100 }, cache: "no-store" }),
        api.get(`/users/${userId}/orders`, { params: { limit: 100 } }).catch(() => null),
      ]);
      const list = extractList<PaymentRecord>(res.data, "payments").sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setPayments(list);

      // Payment.order is an id; show the human order number instead.
      const numbers: Record<string, string> = {};
      extractList<OrderRecord>(ordersRes?.data, "orders").forEach((o) => {
        if (o._id && o.orderNumber) numbers[String(o._id)] = o.orderNumber;
      });
      setOrderNumbers(numbers);
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      console.warn("Failed to fetch user payments:", describeApiError(err));
      setPayments([]);
      setError(true);
      toast.error(err?.response?.data?.message || "Could not load your payments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => scheduleRequest(fetchPayments), [fetchPayments]);

  const filteredPayments = payments.filter((payment) => {
    const payId = (payment._id || payment.id || "").toLowerCase();
    const orderRef = (
      populated(payment.order)?.orderNumber ||
      payment.orderNumber ||
      (typeof payment.order === "string" ? payment.order : "") ||
      payment.orderId ||
      ""
    ).toLowerCase();
    const utr = (payment.utr || payment.transactionReference || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    const mappedNumber = (orderNumbers[getPaymentOrderId(payment)] || "").toLowerCase();
    const matchesQuery =
      !query || payId.includes(query) || orderRef.includes(query) || mappedNumber.includes(query) || utr.includes(query);
    const matchesStatus = statusFilter === "ALL" || mapPaymentStatus(payment.status) === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalSpent = payments
    .filter((p) => mapPaymentStatus(p.status) === "paid")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingAmount = payments
    .filter((p) => mapPaymentStatus(p.status) === "verification_pending")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handleDownloadReceipt = async (payment: PaymentRecord) => {
    const userId = user?._id || user?.id;
    const orderId = getPaymentOrderId(payment);
    
    if (!orderId) {
      toast.error("Receipt document will be generated once payment verification completes.");
      return;
    }

    setDownloadingId(payment._id);
    try {
      const { data } = await api.get(`/users/${userId}/invoices`, { params: { limit: 100 } });
      const invoices = extractList<InvoiceRecord>(data, "invoices");
      const matchingInvoice = invoices.find(
        (inv: InvoiceRecord) =>
          relatedId(inv.order) === orderId ||
          relatedId(inv.payment) === (payment.id || payment._id)
      );

      const invoiceId = matchingInvoice?._id || matchingInvoice?.id;
      if (invoiceId) {
        toast.success("Downloading receipt...");
        const response = await api.get(
          `/users/${userId}/invoices/${invoiceId}/download`,
          { responseType: "blob" }
        );

        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `receipt-${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error("Invoice document is ready once payment is marked verified.");
      }
    } catch {
      toast.error("Receipt document is currently unavailable.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Payment History</h1>
          <p className="text-muted-foreground mt-1">
            Real-time status of your UPI and digital payment intents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPayments} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <IndianRupee className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{pendingAmount.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending Verification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{payments.length}</p>
                  <p className="text-sm text-muted-foreground">Transactions loaded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Input
                aria-label="Search payments"
                placeholder="Search by payment reference, order or UTR"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "ALL" | PaymentState)}>
              <SelectTrigger aria-label="Filter payment status" className="w-full sm:w-56">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorState title="Payment history unavailable" message="Retry to load your payment records." onRetry={fetchPayments} />
          ) : loading ? (
            <div role="status" className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading transactions from server...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="reader-transactions">
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Reference</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>UTR / Ref</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => {
                    const StatusIcon = getStatusIcon(payment.status);
                    const state = mapPaymentStatus(payment.status);
                    const amount = publishedNumber(payment.amount);
                    const orderId = getPaymentOrderId(payment);
                    const purpose = PURPOSE_LABEL[String(payment.purpose || "").toUpperCase()];
                    const orderNo =
                      populated(payment.order)?.orderNumber ||
                      payment.orderNumber ||
                      orderNumbers[getPaymentOrderId(payment)] ||
                      (purpose && payment.purpose !== "ORDER_PURCHASE" ? purpose : "—");
                    const dateStr = payment.createdAt
                      ? new Date(payment.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <TableRow key={payment._id || payment.id}>
                        <TableCell data-label="Payment reference" className="font-mono text-xs">
                          {payment.reference || payment._id || payment.id || "Unavailable"}
                        </TableCell>
                        <TableCell data-label="Order" className="font-semibold text-xs">{orderNo}</TableCell>
                        <TableCell data-label="Date" className="text-xs">{dateStr}</TableCell>
                        <TableCell data-label="Method" className="text-xs font-medium uppercase">
                          {payment.paymentMethod || payment.method || "Unavailable"}
                        </TableCell>
                        <TableCell data-label="UTR" className="text-xs font-mono">
                          {payment.utr || payment.transactionReference || (
                            <span className="text-muted-foreground italic">Not submitted</span>
                          )}
                        </TableCell>
                        <TableCell data-label="Amount" className="font-semibold text-sm">
                          {amount === null ? "Unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)}
                        </TableCell>
                        <TableCell data-label="Status">
                          <Badge variant="outline" className={`gap-1 font-semibold text-xs ${state ? PAYMENT_STATE_META[state].tone : getStatusColor(payment.status)}`}>
                            <StatusIcon className="h-3 w-3" />
                            {state ? PAYMENT_STATE_META[state].label : getFriendlyStatus(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell data-label="Actions" className="text-right">
                          {state === "paid" && orderId && payment.purpose !== "AUTHOR_ACCESS" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1 text-xs"
                              disabled={downloadingId === payment._id}
                              onClick={() => handleDownloadReceipt(payment)}
                            >
                              <Download className="h-3.5 w-3.5" />
                              {downloadingId === payment._id ? "..." : "Invoice"}
                            </Button>
                          ) : orderId && (state === "awaiting_payment" || state === "failed") ? (
                            <Button variant="ghost" size="sm" className="text-xs" asChild>
                              <a href={`/dashboard/orders?orderId=${encodeURIComponent(orderId)}`}>Open order payment</a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && filteredPayments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No payment transactions found</h3>
              <p className="text-muted-foreground text-center text-sm mt-1">
                Your payment records will appear here after placing an order.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
