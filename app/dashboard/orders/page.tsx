"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  XCircle,
  CreditCard,
  MapPin,
  Calendar,
  Search,
  ExternalLink,
  QrCode,
  AlertTriangle,
  RotateCcw,
  Send,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import toast from "react-hot-toast";
import { normalizeEmailForStorage } from "@/lib/email";
import {
  extractList,
  extractTrackingInfo,
  getShipmentLabel,
  getTrackingHistory,
  mergeShipmentsIntoOrders,
  normalizeShipmentStatus,
} from "@/lib/tracking";
import {
  FULFILMENT_META,
  PAYMENT_STATE_META,
  getFulfilmentStage,
  getOrderTotal,
  getPaymentState,
  indexPaymentsByOrder,
  type PaymentState,
} from "@/lib/order-status";

const getOrderStatusBadge = (order: any) => {
  const meta = FULFILMENT_META[getFulfilmentStage(order)];
  return <Badge className={`${meta.tone} font-semibold px-2.5 py-0.5`}>{meta.label}</Badge>;
};

const getOrderAddress = (order: any) =>
  order?.orderFormData?.shippingAddress ||
  order?.customerSnapshot?.shippingAddress ||
  order?.checkoutSnapshot?.shippingAddress ||
  order?.shippingAddress ||
  order?.deliveryAddress ||
  order?.address ||
  order?.shipping_address ||
  null;

const getOrderContact = (order: any) => {
  const shippingAddress = getOrderAddress(order) || {};
  return {
    name:
      shippingAddress.fullName ||
      shippingAddress.name ||
      shippingAddress.recipientName ||
      order.orderFormData?.fullName ||
      order.orderFormData?.customerName ||
      order.customerSnapshot?.fullName ||
      order.customerSnapshot?.customerName ||
      order.checkoutSnapshot?.fullName ||
      order.checkoutSnapshot?.customerName ||
      order.customerName ||
      "Reader",
    phone:
      shippingAddress.phone ||
      shippingAddress.mobile ||
      shippingAddress.mobileNumber ||
      shippingAddress.phoneNumber ||
      shippingAddress.recipientPhone ||
      order.orderFormData?.phone ||
      order.orderFormData?.customerPhone ||
      order.customerSnapshot?.phone ||
      order.customerSnapshot?.customerPhone ||
      order.checkoutSnapshot?.phone ||
      order.checkoutSnapshot?.customerPhone ||
      order.customerPhone ||
      order.customerMobile ||
      order.phone ||
      order.mobile ||
      "",
    email:
      shippingAddress.email ||
      order.orderFormData?.email ||
      order.orderFormData?.customerEmail ||
      order.customerSnapshot?.email ||
      order.customerSnapshot?.customerEmail ||
      order.checkoutSnapshot?.email ||
      order.checkoutSnapshot?.customerEmail ||
      order.customerEmail ||
      order.email ||
      "",
  };
};

const PAYMENT_ICON: Record<PaymentState, typeof Clock> = {
  awaiting_payment: AlertTriangle,
  verification_pending: Clock,
  paid: ShieldCheck,
  failed: XCircle,
  expired: Clock,
  cancelled: XCircle,
};

const getPaymentStatusBadge = (state: PaymentState) => {
  const meta = PAYMENT_STATE_META[state];
  const Icon = PAYMENT_ICON[state];
  return (
    <Badge className={`${meta.tone} font-semibold flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      <span>{meta.label}</span>
    </Badge>
  );
};

// Filter values group backend states the way readers think about them.
const ORDER_FILTERS: { value: string; label: string; match: (order: any, payment: PaymentState) => boolean }[] = [
  { value: "all", label: "All Orders", match: () => true },
  { value: "awaiting", label: "Awaiting Payment", match: (_o, p) => p === "awaiting_payment" || p === "failed" },
  { value: "verifying", label: "Verification Pending", match: (_o, p) => p === "verification_pending" },
  { value: "processing", label: "Processing / Printing", match: (o, p) => p === "paid" && ["placed", "processing", "printed"].includes(getFulfilmentStage(o)) },
  { value: "shipped", label: "Shipped", match: (o) => getFulfilmentStage(o) === "shipped" },
  { value: "delivered", label: "Delivered", match: (o) => getFulfilmentStage(o) === "delivered" },
  { value: "cancelled", label: "Cancelled / Expired", match: (o, p) => getFulfilmentStage(o) === "cancelled" || p === "cancelled" || p === "expired" },
];

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // UTR submission state map per order
  const [utrInputMap, setUtrInputMap] = useState<Record<string, string>>({});
  const [submittingUtrMap, setSubmittingUtrMap] = useState<Record<string, boolean>>({});
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [copiedAwbMap, setCopiedAwbMap] = useState<Record<string, boolean>>({});
  const [paymentsByOrder, setPaymentsByOrder] = useState<Map<string, any>>(new Map());
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const copyAwbToClipboard = (orderId: string, awbText: string) => {
    navigator.clipboard.writeText(awbText);
    setCopiedAwbMap((prev) => ({ ...prev, [orderId]: true }));
    toast.success("Consignment / AWB tracking ID copied! 📋");
    setTimeout(() => setCopiedAwbMap((prev) => ({ ...prev, [orderId]: false })), 2000);
  };

  const fetchOrders = async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    setLoading(true);
    setError(false);

    try {
      // Backend paginates both lists (default limit 10). Without an explicit limit,
      // shipments for older orders were never returned, so their tracking ID was missing.
      // no-store: tracking is assigned by admin at any time; skip the 30s GET cache.
      const listConfig = { params: { limit: 100 }, cache: "no-store" } as any;
      const [ordersRes, shipmentsRes, paymentsRes] = await Promise.allSettled([
        api.get(`/users/${userId}/orders`, listConfig),
        api.get(`/users/${userId}/shipments`, listConfig),
        // The Order only stores isPaid/utr; the Payment record has the real state
        // (rejected, expired, cancelled) and the active QR.
        api.get(`/users/${userId}/payments`, listConfig),
      ]);

      if (ordersRes.status !== "fulfilled") {
        throw ordersRes.reason;
      }

      const list = extractList(ordersRes.value.data, "orders").sort(
        (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      const shipments = shipmentsRes.status === "fulfilled" ? extractList(shipmentsRes.value.data, "shipments") : [];
      const payments = paymentsRes.status === "fulfilled" ? extractList(paymentsRes.value.data, "payments") : [];
      setPaymentsByOrder(indexPaymentsByOrder(payments));
      setOrders(mergeShipmentsIntoOrders(list, shipments));
    } catch (err) {
      console.error("Failed to fetch user orders:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // On expand: GET /orders/{_id}/tracking returns { shipment, trackingHistory }.
  // 404 just means the shipment isn't created yet (before payment verification + invoice).
  const [trackingByOrder, setTrackingByOrder] = useState<
    Record<string, { state: "loading" | "ready" | "none"; history: ReturnType<typeof getTrackingHistory> }>
  >({});
  const loadOrderShipment = async (order: any) => {
    const orderMongoId = String(order._id || order.id || "");
    if (!orderMongoId || trackingByOrder[orderMongoId]?.state === "loading") return;
    setTrackingByOrder((prev) => ({ ...prev, [orderMongoId]: { state: "loading", history: prev[orderMongoId]?.history || [] } }));

    try {
      const { data } = await api.get(`/orders/${orderMongoId}/tracking`, { cache: "no-store" } as any);
      const payload = data?.data || data;
      const shipment = payload?.shipment;
      if (shipment && typeof shipment === "object") {
        setOrders((prev) => prev.map((o) => (String(o._id || o.id) === orderMongoId ? { ...o, shipment } : o)));
      }
      setTrackingByOrder((prev) => ({
        ...prev,
        [orderMongoId]: { state: shipment ? "ready" : "none", history: getTrackingHistory(payload) },
      }));
    } catch {
      setTrackingByOrder((prev) => ({ ...prev, [orderMongoId]: { state: "none", history: [] } }));
    }
  };

  // DELETE /orders/{id}: documented "cancel order where allowed" (unpaid orders).
  const handleCancelOrder = async (orderMongoId: string, orderNumber: string) => {
    if (!window.confirm(`Cancel order ${orderNumber}? This releases the reserved stock and cannot be undone.`)) return;
    setCancellingId(orderMongoId);
    try {
      await api.delete(`/orders/${orderMongoId}`);
      toast.success(`Order ${orderNumber} cancelled.`);
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "This order can no longer be cancelled.");
    } finally {
      setCancellingId(null);
    }
  };

  // Submit UTR Number API Handler
  const handleSubmitUtr = async (orderId: string, orderMongoId: string) => {
    const utr = (utrInputMap[orderId] || "").trim().toUpperCase();
    // Backend pattern: ^[A-Z0-9-]{6,64}$
    if (!/^[A-Z0-9-]{6,64}$/.test(utr)) {
      toast.error("Enter the UTR exactly as shown in your UPI app (6–64 letters, digits or hyphens).");
      return;
    }

    setSubmittingUtrMap((prev) => ({ ...prev, [orderId]: true }));

    try {
      await api.put(`/orders/${orderMongoId}/verify-payment`, { utr });

      toast.success("UTR submitted successfully! Waiting for admin verification.");
      setUtrInputMap((prev) => ({ ...prev, [orderId]: "" }));
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit UTR number.");
    } finally {
      setSubmittingUtrMap((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDownloadInvoice = async (order: any) => {
    const userId = user?._id || user?.id;
    const orderId = order._id || order.id;
    setDownloadingInvoiceId(orderId);

    try {
      const { data } = await api.get(`/users/${userId}/invoices`, { params: { limit: 100 } });
      const invoices = extractList(data, "invoices");
      const paymentId = typeof order.payment === "object" ? order.payment?._id : order.payment;
      const matchingInvoice = invoices.find(
        (inv: any) =>
          String(inv.order?._id || inv.order) === String(orderId) ||
          (paymentId && String(inv.payment?._id || inv.payment) === String(paymentId))
      );

      const invoiceId = matchingInvoice?._id || matchingInvoice?.id;
      if (invoiceId) {
        toast.success("Downloading invoice...");
        const response = await api.get(
          `/users/${userId}/invoices/${invoiceId}/download`,
          { responseType: "blob" }
        );

        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        link.download = `invoice-${invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        toast.error("Invoice document will be generated once payment verification completes.");
      }
    } catch {
      toast.error("Invoice document is currently unavailable for pending payments.");
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderNum = (order.orderNumber || order._id || order.id || "").toLowerCase();
    const utrNum = (order.utr || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    const paymentState = getPaymentState(order, paymentsByOrder.get(String(order._id || order.id)));

    const matchesSearch = !query || orderNum.includes(query) || utrNum.includes(query);
    const filter = ORDER_FILTERS.find((f) => f.value === statusFilter) || ORDER_FILTERS[0];
    return matchesSearch && filter.match(order, paymentState);
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
          My Orders & Payment Status
        </h1>
        <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
          Track shipments, submit UPI UTR verification, and download official invoices.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
              <Input
                placeholder="Search by Order ID or UTR Reference..."
                className="pl-9 bg-white border-[#E2E6DF]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-52 bg-white border-[#E2E6DF]">
                <Filter className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {ORDER_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {error ? (
        <ErrorState
          title="Could not load your orders"
          message="We encountered an issue fetching your order history. Please try again."
          onRetry={fetchOrders}
        />
      ) : loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F3D3E]" />
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State (Clean & Guided) */
        <Card className="bg-white border border-dashed border-[#E2E6DF] shadow-xs rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F3D3E]/10 text-[#0F3D3E] mb-4">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#0F3D3E]">
              {searchQuery || statusFilter !== "all" ? "No Matching Orders" : "No orders placed yet"}
            </h3>
            <p className="text-[#5C6E6E] text-sm max-w-sm mt-1.5 mb-6 leading-relaxed">
              {searchQuery || statusFilter !== "all"
                ? "No orders match your filter criteria. Try clearing search filters."
                : "Explore our curated book collection and place your first order."}
            </p>
            <Button asChild className="bg-[#0F3D3E] text-white hover:bg-[#174C4D] font-medium px-6 shadow-sm">
              <Link href="/books">Explore Books</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order, index) => {
            const status = order.status || order.orderStatus || "PENDING";
            const id = order.orderNumber || order._id || order.id;
            // API paths take the Mongo ObjectId, never the human-readable orderNumber.
            const orderMongoId = order._id || order.id;
            const isExpanded = expandedOrder === id;
            const paymentRecord = paymentsByOrder.get(String(orderMongoId));
            const paymentState = getPaymentState(order, paymentRecord);
            const isPaid = paymentState === "paid";
            const isOrderCancelled = getFulfilmentStage(order) === "cancelled";

            const totalPrice = getOrderTotal(order);
            const shippingPrice = Number(order.shippingPrice ?? order.shippingFee ?? 0) || 0;
            const subtotal = Number(order.subtotal ?? order.itemsPrice ?? totalPrice - shippingPrice) || 0;
            const { trackingNumber, courierName, trackingUrl } = extractTrackingInfo(order);
            const orderContact = getOrderContact(order);

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E]/30 transition-all shadow-xs rounded-2xl overflow-hidden">
                  {/* Order Summary Header */}
                  <CardHeader className="p-5 sm:p-6 bg-[#F8F9F7] border-b border-[#E2E6DF]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0F3D3E] text-[#D4AF37] shadow-xs font-serif font-bold text-lg">
                          <Package className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-base text-[#0F3D3E]">{id}</span>
                            {getOrderStatusBadge(order)}
                            {trackingNumber && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[11px] font-mono font-semibold flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                <span>AWB: {trackingNumber}</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[#5C6E6E] flex items-center gap-1.5 mt-1 font-sans">
                            <Calendar className="h-3.5 w-3.5" />
                            Placed on{" "}
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Recent"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E2E6DF]">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-[#5C6E6E]">{isPaid ? "Amount Paid" : "Amount Payable"}</p>
                          <p className="text-xl font-serif font-bold text-[#0F3D3E]">₹{totalPrice.toLocaleString("en-IN")}</p>
                        </div>
                        {getPaymentStatusBadge(paymentState)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 sm:p-6 space-y-6">
                    {/* Order Book Preview Items */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        {order.items?.map((item: any, i: number) => {
                          const bookTitle = item.book?.title || "Book Item";
                          const coverImage = item.book?.coverImage || "/placeholder-book.svg";

                          return (
                            <div key={item._id || i} className="relative group h-14 w-10">
                              <Image
                                src={coverImage}
                                alt={bookTitle}
                                fill
                                sizes="40px"
                                className="object-cover rounded-md border border-[#E2E6DF] shadow-xs"
                              />
                              <span className="absolute -top-1.5 -right-1.5 bg-[#0F3D3E] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                {item.quantity}
                              </span>
                            </div>
                          );
                        })}
                        <div className="text-xs text-[#5C6E6E]">
                          <span className="font-bold text-[#0F3D3E]">{order.items?.length || 0}</span> item
                          {(order.items?.length || 0) > 1 ? "s" : ""} included
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        {trackingUrl ? (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-3.5 bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] text-xs font-serif font-bold gap-1.5 rounded-xl cursor-pointer shadow-2xs"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Open Tracking Link</span>
                            </Button>
                          </a>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setExpandedOrder(isExpanded ? null : id);
                            if (!isExpanded) loadOrderShipment(order);
                          }}
                          className="gap-1.5 text-xs text-[#0F3D3E] hover:text-[#0F3D3E] font-medium shrink-0"
                        >
                          <span>{isExpanded ? "Hide Details" : "View Order Details"}</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* --- PAYMENT UI (STRICT 4-STATE MACHINE ACCORDING TO PROMPT) --- */}
                    <div className="rounded-2xl border border-[#E2E6DF] p-5 bg-white space-y-4">
                      <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#0F3D3E]" />
                          <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">
                            UPI Payment & Verification State
                          </h4>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-mono border-[#E2E6DF]">
                          {order.paymentMethod || "UPI QR"}
                        </Badge>
                      </div>

                      {/* Order cancelled: no payment actions */}
                      {isOrderCancelled && !isPaid && (
                        <div className="p-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-700 text-xs">
                          This order was cancelled. No payment is needed.
                        </div>
                      )}

                      {/* STATE 1: awaiting payment (no UTR yet) */}
                      {!isOrderCancelled && paymentState === "awaiting_payment" && (
                        <div className="space-y-4 pt-1">
                          <div className="p-4 rounded-xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 flex flex-col md:flex-row items-center gap-6">
                            <OrderPaymentQr userId={String(user?._id || user?.id || "")} order={order} payment={paymentRecord} />
                            <div className="flex-1 text-center md:text-left space-y-2">
                              <div className="flex items-center justify-between md:justify-start gap-3">
                                <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-bold text-xs">
                                  Awaiting payment
                                </Badge>
                                <span className="text-lg font-serif font-bold text-[#0F3D3E]">
                                  Amount: ₹{totalPrice.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <p className="text-xs text-[#5C6E6E] leading-relaxed">
                                Scan the QR with Google Pay, PhonePe or Paytm and pay exactly{" "}
                                <strong className="text-[#0F3D3E]">₹{totalPrice.toLocaleString("en-IN")}</strong>. Then enter the UTR / transaction reference from your UPI app below.
                              </p>

                              {/* UTR Input Form */}
                              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                                <div className="flex-1">
                                  <Input
                                    placeholder="Enter 12-digit UTR Number (e.g. 423819001234)"
                                    className="bg-white border-[#E2E6DF] text-sm h-10 font-mono"
                                    value={utrInputMap[id] || ""}
                                    onChange={(e) =>
                                      setUtrInputMap((prev) => ({ ...prev, [id]: e.target.value }))
                                    }
                                  />
                                </div>
                                <Button
                                  onClick={() => handleSubmitUtr(id, orderMongoId)}
                                  disabled={submittingUtrMap[id]}
                                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium h-10 px-5 gap-2 shrink-0"
                                >
                                  {submittingUtrMap[id] ? (
                                    <span className="flex items-center gap-2">
                                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Submitting...
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1.5">
                                      <Send className="h-3.5 w-3.5" />
                                      Submit Payment
                                    </span>
                                  )}
                                </Button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(String(orderMongoId), String(id))}
                                disabled={cancellingId === orderMongoId}
                                className="text-[11px] text-rose-700 hover:underline disabled:opacity-50"
                              >
                                {cancellingId === orderMongoId ? "Cancelling..." : "Cancel this order"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STATE 2: VERIFICATION_PENDING (UTR Submitted, Waiting for Admin) */}
                      {!isOrderCancelled && paymentState === "verification_pending" && (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                              <h5 className="font-bold text-sm font-serif">VERIFICATION_PENDING</h5>
                            </div>
                            <span className="font-mono text-xs font-semibold bg-white/80 px-2 py-0.5 rounded text-amber-900 border border-amber-300">
                              UTR: {order.utr || paymentRecord?.utr || "submitted"}
                            </span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            We received your payment reference and our team is verifying it. This page updates once it is confirmed.
                          </p>
                        </div>
                      )}

                      {/* Expired / cancelled payment intent */}
                      {!isOrderCancelled && (paymentState === "expired" || paymentState === "cancelled") && (
                        <div className="p-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-800 space-y-1">
                          <h5 className="font-bold text-sm font-serif">{PAYMENT_STATE_META[paymentState].label}</h5>
                          <p className="text-xs">
                            This payment request is no longer active. If you already paid, contact us with your UTR and order number{" "}
                            <span className="font-mono">{id}</span>; otherwise place a new order.
                          </p>
                          <Link href="/contact" className="text-xs font-semibold text-[#0F3D3E] underline">Contact support</Link>
                        </div>
                      )}

                      {/* STATE 3: PAYMENT CONFIRMED */}
                      {isPaid && (
                        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                              <h5 className="font-bold text-sm font-serif text-emerald-950">Payment Confirmed</h5>
                              <p className="text-xs text-emerald-800">
                                Your payment has been verified and confirmed. Order is moving through printing & fulfillment.
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(order)}
                            disabled={downloadingInvoiceId === id}
                            className="bg-white text-emerald-900 border-emerald-300 hover:bg-emerald-50 text-xs gap-1.5 font-medium shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Invoice</span>
                          </Button>
                        </div>
                      )}

                      {/* STATE 4: FAILED / REJECTED */}
                      {!isOrderCancelled && paymentState === "failed" && (
                        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-rose-600" />
                              <h5 className="font-bold text-sm font-serif">PAYMENT_FAILED / REJECTED</h5>
                            </div>
                          </div>
                          <p className="text-xs text-rose-800">
                            We could not match your payment reference{paymentRecord?.rejectionReason || paymentRecord?.reason ? `: ${paymentRecord.rejectionReason || paymentRecord.reason}` : "."} Check the UTR in your UPI app and submit the correct one (a previously rejected UTR can&apos;t be reused).
                          </p>

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <Input
                              placeholder="Re-enter correct UTR Number"
                              className="bg-white border-rose-300 text-xs font-mono"
                              value={utrInputMap[id] || ""}
                              onChange={(e) =>
                                setUtrInputMap((prev) => ({ ...prev, [id]: e.target.value }))
                              }
                            />
                            <Button
                              onClick={() => handleSubmitUtr(id, orderMongoId)}
                              disabled={submittingUtrMap[id]}
                              size="sm"
                              className="bg-rose-700 hover:bg-rose-800 text-white text-xs gap-1.5 font-medium shrink-0"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Retry Submission</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded Details Section */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="pt-4 border-t border-[#E2E6DF] space-y-6"
                        >
                          {/* Itemized Book List */}
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-3">
                              Itemized Book Details ({order.items?.length || 0})
                            </h4>
                            <div className="space-y-2.5">
                              {order.items?.map((item: any, i: number) => {
                                const bookTitle = item.book?.title || "Book Title";
                                const coverImage = item.book?.coverImage || "/placeholder-book.svg";
                                const price = item.price || item.book?.price || 0;

                                return (
                                  <div
                                    key={item._id || i}
                                    className="flex items-center gap-3.5 p-3 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]"
                                  >
                                    <Image
                                      src={coverImage}
                                      alt={bookTitle}
                                      width={44}
                                      height={64}
                                      className="h-16 w-11 object-cover rounded-md border border-[#E2E6DF]"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-serif font-bold text-sm text-[#0F3D3E] truncate">{bookTitle}</p>
                                      <p className="text-xs text-[#5C6E6E] mt-0.5 font-sans">
                                        Qty: <span className="font-bold text-[#0F3D3E]">{item.quantity}</span> × ₹{price}
                                      </p>
                                    </div>
                                    <p className="font-bold text-sm text-[#0F3D3E]">
                                      ₹{(price * item.quantity).toLocaleString()}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Address & Cost Summary */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Shipping Address */}
                            <div className="p-4 rounded-xl bg-white border border-[#E2E6DF] space-y-2.5">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                                <MapPin className="h-3.5 w-3.5 text-[#0F3D3E]" />
                                <span>Delivery Address</span>
                              </div>
                              {(() => {
                                const shippingAddress = getOrderAddress(order);
                                if (!shippingAddress) {
                                  return <p className="text-xs text-[#5C6E6E]">No shipping address recorded.</p>;
                                }
                                return (
                                  <div className="text-xs text-[#0F3D3E] space-y-1 leading-relaxed font-sans">
                                    <p className="font-bold text-sm text-[#0F3D3E]">
                                      {orderContact.name}
                                    </p>
                                    {orderContact.phone && (
                                      <p className="text-[#5C6E6E]">
                                        <span className="font-medium text-[#0F3D3E]">Phone:</span>{" "}
                                        {orderContact.phone}
                                      </p>
                                    )}
                                    {orderContact.email && (
                                      <p className="text-[#5C6E6E]">
                                        <span className="font-medium text-[#0F3D3E]">Email:</span>{" "}
                                        {normalizeEmailForStorage(orderContact.email)}
                                      </p>
                                    )}
                                    <p className="pt-0.5">
                                      {shippingAddress.addressLine1 || shippingAddress.street || shippingAddress.address}
                                    </p>
                                    {shippingAddress.addressLine2 && (
                                      <p>{shippingAddress.addressLine2}</p>
                                    )}
                                    <p className="font-medium">
                                      {[
                                        shippingAddress.city,
                                        shippingAddress.state,
                                        shippingAddress.postalCode || shippingAddress.pincode || shippingAddress.pinCode
                                      ].filter(Boolean).join(", ")}
                                    </p>
                                    <p className="text-[#5C6E6E]">
                                      {shippingAddress.country || "India"}
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Cost Summary */}
                            <div className="p-4 rounded-xl bg-white border border-[#E2E6DF] space-y-2.5">
                              <div className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
                                Invoice Cost Breakdown
                              </div>
                              <div className="space-y-1.5 text-xs font-sans">
                                <div className="flex justify-between text-[#5C6E6E]">
                                  <span>Subtotal</span>
                                  <span>₹{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[#5C6E6E]">
                                  <span>Shipping Fee</span>
                                  <span>{shippingPrice === 0 ? "FREE" : `₹${shippingPrice}`}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm text-[#0F3D3E] border-t border-[#E2E6DF] pt-2 font-serif">
                                  <span>Grand Total</span>
                                  <span className="text-[#0F3D3E]">₹{totalPrice.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Simplified Order Tracking System */}
                          <div className="rounded-2xl border border-[#0F3D3E]/20 bg-[#F8F9F7] p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E6DF] pb-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                                  <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-serif font-bold text-sm text-[#0F3D3E]">
                                      Shipment & Tracking
                                    </h4>
                                    {getOrderStatusBadge(order)}
                                  </div>
                                  <p className="text-xs text-[#5C6E6E] mt-0.5">
                                    Courier Partner: <strong className="text-[#0F3D3E]">{courierName || "To be assigned upon dispatch"}</strong>
                                  </p>
                                  {order.shipment?.status && (
                                    <p className="text-xs text-[#5C6E6E] mt-0.5">
                                      Shipment: <strong className="text-[#0F3D3E]">{getShipmentLabel(order.shipment.status)}</strong>
                                      {(() => {
                                        const eta = extractTrackingInfo(order).estimatedDelivery;
                                        const done = ["DELIVERED", "COMPLETED"].includes(normalizeShipmentStatus(order.shipment.status));
                                        return eta && !done ? (
                                          <> · Expected by <strong className="text-[#0F3D3E]">{new Date(eta).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong></>
                                        ) : null;
                                      })()}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {trackingNumber && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyAwbToClipboard(id, trackingNumber)}
                                  className="gap-1.5 text-xs font-mono font-bold border-[#E2E6DF] shrink-0"
                                >
                                  {copiedAwbMap[id] ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-[#0F3D3E]" />
                                  )}
                                  <span>{copiedAwbMap[id] ? "Copied" : "Copy Tracking ID"}</span>
                                </Button>
                              )}
                            </div>

                            {/* CASE 1: tracking_url is available -> Show "Track Package" button */}
                            {trackingUrl ? (
                              <div className="p-4 rounded-xl bg-white border border-emerald-200/60 shadow-2xs space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    {trackingNumber && (
                                      <p className="text-xs text-[#5C6E6E]">
                                        Tracking ID: <span className="font-mono font-bold text-sm text-[#0F3D3E]">{trackingNumber}</span>
                                      </p>
                                    )}
                                    <p className="text-xs text-emerald-800 font-medium mt-0.5">
                                      Your package has been dispatched via {courierName || "courier"}. Click below to view live tracking directly.
                                    </p>
                                  </div>
                                  <a
                                    href={trackingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0"
                                  >
                                    <Button
                                      className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold text-xs gap-2 px-4 shadow-sm"
                                    >
                                      <Truck className="h-4 w-4" />
                                      <span>Track Package</span>
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                  </a>
                                </div>
                              </div>
                            ) : trackingNumber ? (
                              /* CASE 2: Only tracking_id is available -> Show tracking ID + instructional message */
                              <div className="p-4 rounded-xl bg-white border border-[#E2E6DF] space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E] block">
                                      Courier Tracking ID
                                    </span>
                                    <span className="font-mono text-lg font-bold text-[#0F3D3E] tracking-wider select-all">
                                      {trackingNumber}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => copyAwbToClipboard(id, trackingNumber)}
                                      className="bg-white hover:bg-[#F8F9F7] text-[#0F3D3E] border border-[#E2E6DF] text-xs gap-1.5 shrink-0"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      <span>Copy Tracking ID</span>
                                    </Button>
                                    {trackingUrl && (
                                    <a
                                      href={trackingUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        size="sm"
                                        className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold text-xs gap-1.5 shadow-sm"
                                      >
                                        <Truck className="h-3.5 w-3.5" />
                                        <span>Track on Courier ↗</span>
                                      </Button>
                                    </a>
                                    )}
                                  </div>
                                </div>
                                <div className="pt-1 text-xs text-[#5C6E6E] flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-[#0F3D3E] shrink-0" />
                                  <span>Use this tracking ID on the courier website to track your order.</span>
                                </div>
                              </div>
                            ) : (
                              /* Neither trackingUrl nor trackingNumber yet */
                              <div className="p-3.5 rounded-xl bg-white border border-[#E2E6DF] flex items-start gap-3">
                                <Clock className="h-4 w-4 text-[#5C6E6E] shrink-0 mt-0.5" />
                                <div className="text-xs text-[#5C6E6E]">
                                  {!order.shipment ? (
                                    <>
                                      <p className="font-semibold text-[#0F3D3E]">Preparing your shipment</p>
                                      <p>Tracking information will be available after payment verification.</p>
                                    </>
                                  ) : (
                                    <p>
                                      {status.toUpperCase().includes("PRINT")
                                        ? "Your book is being printed. The courier and tracking ID will appear here once it ships."
                                        : "Your shipment is being prepared. The courier and tracking ID will appear here once it ships."}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Tracking timeline from GET /orders/{id}/tracking */}
                            {(() => {
                              const tracking = trackingByOrder[String(orderMongoId)];
                              if (tracking?.state === "loading" && !tracking.history.length) {
                                return <p className="text-xs text-[#5C6E6E]">Loading tracking history...</p>;
                              }
                              if (!tracking?.history.length) return null;
                              return (
                                <ol className="relative border-l-2 border-[#0F3D3E]/15 ml-2 space-y-3">
                                  {[...tracking.history].reverse().map((event, i) => (
                                    <li key={`${event.status}-${event.occurredAt}-${i}`} className="ml-4">
                                      <span
                                        className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white ${i === 0 ? "bg-[#0F3D3E]" : "bg-[#0F3D3E]/30"}`}
                                      />
                                      <p className="text-xs font-semibold text-[#0F3D3E]">
                                        {getShipmentLabel(event.status)}
                                        {event.location && <span className="font-normal text-[#5C6E6E]"> · {event.location}</span>}
                                      </p>
                                      {event.description && <p className="text-xs text-[#5C6E6E]">{event.description}</p>}
                                      {event.occurredAt && (
                                        <p className="text-[10px] text-[#5C6E6E]">
                                          {new Date(event.occurredAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ol>
                              );
                            })()}
                          </div>

                          {/* Action Footer */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadInvoice(order)}
                                disabled={downloadingInvoiceId === id}
                                className="gap-2 text-xs font-medium border-[#E2E6DF]"
                              >
                                <Download className="h-3.5 w-3.5 text-[#0F3D3E]" />
                                <span>{downloadingInvoiceId === id ? "Downloading..." : "Download Invoice"}</span>
                              </Button>

                              {trackingUrl && (
                                <a
                                  href={trackingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Button size="sm" className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-1.5 text-xs">
                                    <Truck className="h-3.5 w-3.5" />
                                    <span>Open Tracking Link</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </a>
                              )}

                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Real UPI QR for an unpaid order. Order list rows usually omit the (large) QR, so it is
 * read from the payment record: GET /users/{id}/payments/{paymentId} includes active QR metadata.
 */
function OrderPaymentQr({ userId, order, payment }: { userId: string; order: any; payment?: any }) {
  const paymentId = String(
    payment?._id || (typeof order.payment === "object" ? order.payment?._id : order.payment) || ""
  );
  const initialQr = payment?.qrCodeDataUrl || order.qrCodeDataUrl || "";
  const [qr, setQr] = useState<string>(initialQr);
  const [upiUrl, setUpiUrl] = useState<string>(payment?.upiUrl || "");
  const [state, setState] = useState<"loading" | "ready" | "missing">(initialQr ? "ready" : "loading");

  useEffect(() => {
    if (initialQr || !paymentId || !userId) {
      if (!initialQr) setState("missing");
      return;
    }
    let cancelled = false;
    api
      .get(`/users/${userId}/payments/${paymentId}`, { cache: "no-store" } as any)
      .then(({ data }) => {
        if (cancelled) return;
        const detail = data?.data?.payment || data?.data || data;
        let raw = detail?.qrCodeDataUrl || detail?.qr?.dataUrl || detail?.qrCode || "";
        if (raw && !raw.startsWith("data:") && !raw.startsWith("http")) raw = `data:image/png;base64,${raw}`;
        setQr(raw);
        setUpiUrl(detail?.upiUrl || detail?.qr?.upiUrl || "");
        setState(raw ? "ready" : "missing");
      })
      .catch(() => !cancelled && setState("missing"));
    return () => {
      cancelled = true;
    };
  }, [initialQr, paymentId, userId]);

  return (
    <div className="flex flex-col items-center bg-white p-3 rounded-xl border-2 border-[#D4AF37] shadow-sm w-40 shrink-0">
      {state === "ready" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt={`UPI QR for order ${order.orderNumber || ""}`} className="h-32 w-32 object-contain" />
      ) : state === "loading" ? (
        <div className="h-32 w-32 flex items-center justify-center">
          <span className="h-6 w-6 border-2 border-[#0F3D3E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="h-32 w-32 flex flex-col items-center justify-center text-center gap-1">
          <QrCode className="h-12 w-12 text-[#5C6E6E]/50" />
          <span className="text-[10px] text-[#5C6E6E]">QR unavailable. Contact support to pay this order.</span>
        </div>
      )}
      {upiUrl ? (
        <a href={upiUrl} className="text-[10px] font-bold text-[#0F3D3E] mt-1 uppercase tracking-wider underline md:hidden">
          Open in UPI app
        </a>
      ) : (
        <span className="text-[10px] font-bold text-[#0F3D3E] mt-1 uppercase tracking-wider">Scan & Pay UPI</span>
      )}
    </div>
  );
}
