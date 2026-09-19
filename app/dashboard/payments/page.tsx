"use client";

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

const getStatusColor = (status: string) => {
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

const getStatusIcon = (status: string) => {
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

const getFriendlyStatus = (status: string) => {
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
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;

    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: 1,
        limit: 50,
      };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const res = await api.get(`/users/${userId}/payments`, { params });
      const rawData = res.data?.data || res.data;
      const list = rawData?.items || rawData?.payments || (Array.isArray(rawData) ? rawData : []);
      setPayments(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.warn("Failed to fetch user payments:", err);
      // Fallback: if payments list fails, try extracting from user orders
      try {
        const userId = user._id || user.id;
        const ordersRes = await api.get(`/users/${userId}/orders`);
        const ordersData = ordersRes.data?.data || ordersRes.data || [];
        const fallbackList = Array.isArray(ordersData)
          ? ordersData
              .filter((o: any) => o.payment || o.paymentMethod || o.utr)
              .map((o: any) => ({
                _id: o.payment?._id || o.payment || `pay-${o._id}`,
                order: o,
                amount: o.totalPrice || o.totalAmount || 0,
                paymentMethod: o.paymentMethod || "UPI",
                status: o.paymentStatus || (o.isPaid ? "VERIFIED" : o.utr ? "VERIFICATION_PENDING" : "PENDING"),
                createdAt: o.createdAt || new Date().toISOString(),
                utr: o.utr,
              }))
          : [];
        setPayments(fallbackList);
      } catch {
        setPayments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = payments.filter((payment) => {
    const payId = (payment._id || payment.id || "").toLowerCase();
    const orderRef = (
      payment.order?.orderNumber ||
      payment.orderNumber ||
      (typeof payment.order === "string" ? payment.order : "") ||
      payment.orderId ||
      ""
    ).toLowerCase();
    const utr = (payment.utr || payment.transactionReference || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    return !query || payId.includes(query) || orderRef.includes(query) || utr.includes(query);
  });

  const totalSpent = payments
    .filter((p) => {
      const s = (p.status || "").toUpperCase();
      return s === "COMPLETED" || s === "VERIFIED" || s === "PAID" || s === "PAYMENT_VERIFIED";
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const pendingAmount = payments
    .filter((p) => {
      const s = (p.status || "").toUpperCase();
      return s === "PENDING" || s === "VERIFICATION_PENDING" || s === "PAYMENT_SUBMITTED" || s === "INTENT_CREATED";
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const handleDownloadReceipt = async (payment: any) => {
    const userId = user?._id || user?.id;
    const orderId = payment.order?._id || payment.order?.id || (typeof payment.order === "string" ? payment.order : null);
    
    if (!orderId) {
      toast.error("Receipt document will be generated once payment verification completes.");
      return;
    }

    setDownloadingId(payment._id);
    try {
      const { data } = await api.get(`/users/${userId}/invoices`);
      const invoices = data?.data || data || [];
      const matchingInvoice = Array.isArray(invoices)
        ? invoices.find((inv: any) => (inv.order?._id || inv.order) === orderId || inv.payment === payment._id)
        : null;

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
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
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
                placeholder="Search by Payment ID, Order Number, or UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="VERIFICATION_PENDING">Verification Pending</SelectItem>
                <SelectItem value="VERIFIED">Verified / Paid</SelectItem>
                <SelectItem value="INTENT_CREATED">Awaiting Payment</SelectItem>
                <SelectItem value="FAILED">Failed / Rejected</SelectItem>
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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading transactions from server...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
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
                    const orderNo =
                      payment.order?.orderNumber ||
                      payment.orderNumber ||
                      (typeof payment.order === "string" ? payment.order.slice(0, 10) : "N/A");
                    const dateStr = payment.createdAt
                      ? new Date(payment.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <TableRow key={payment._id || payment.id}>
                        <TableCell className="font-mono text-xs">
                          {payment._id ? `${payment._id.slice(0, 8)}...` : "—"}
                        </TableCell>
                        <TableCell className="font-semibold text-xs">{orderNo}</TableCell>
                        <TableCell className="text-xs">{dateStr}</TableCell>
                        <TableCell className="text-xs font-medium uppercase">
                          {payment.paymentMethod || "UPI"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {payment.utr || payment.transactionReference || (
                            <span className="text-muted-foreground italic">Not submitted</span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">
                          ₹{(Number(payment.amount) || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 font-semibold text-xs ${getStatusColor(payment.status)}`}>
                            <StatusIcon className="h-3 w-3" />
                            {getFriendlyStatus(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1 text-xs"
                            disabled={downloadingId === payment._id}
                            onClick={() => handleDownloadReceipt(payment)}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {downloadingId === payment._id ? "..." : "Receipt"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredPayments.length === 0 && (
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
