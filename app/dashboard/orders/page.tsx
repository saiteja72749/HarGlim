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
import { resolveCourierTrackingUrl } from "@/lib/couriers";
import { getSafeExternalUrl } from "@/lib/utils";

// Status Badge mapping for Order Status (Placed / Printed / Shipped / Delivered)
const getOrderStatusBadge = (status: string) => {
  const s = (status || "").toUpperCase().replace(/[-_]/g, " ");
  if (s.includes("DELIVER")) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold px-2.5 py-0.5">
        Delivered
      </Badge>
    );
  }
  if (s.includes("SHIP") || s.includes("TRANSIT") || s.includes("DISPATCH")) {
    return (
      <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 font-semibold px-2.5 py-0.5">
        Shipped
      </Badge>
    );
  }
  if (s.includes("PRINT")) {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold px-2.5 py-0.5">
        Printed
      </Badge>
    );
  }
  if (s.includes("CANCEL") || s.includes("REJECT")) {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 font-semibold px-2.5 py-0.5">
        Cancelled
      </Badge>
    );
  }
  return (
    <Badge className="bg-indigo-500/10 text-indigo-700 border-indigo-500/20 font-semibold px-2.5 py-0.5">
      Order Placed
    </Badge>
  );
};

const PAID_STATUSES = ["PAID", "VERIFIED", "SUCCESS", "COMPLETED", "APPROVED", "CONFIRMED", "PAYMENT_APPROVED"];

const getOrderPaymentStatus = (order: any) =>
  (
    order.payment_status ||
    order.paymentStatus ||
    order.paymentState ||
    (typeof order.payment === "object" ? order.payment?.status : "") ||
    ""
  ).toUpperCase();

const isOrderPaid = (order: any) => Boolean(order.isPaid || PAID_STATUSES.includes(getOrderPaymentStatus(order)));

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

const firstString = (...values: any[]) =>
  values.find((value) => typeof value === "string" && value.trim())?.trim() || "";

const getShipmentCandidates = (order: any) =>
  [
    order.shipment,
    order.shipmentDetails,
    order.shipping,
    order.fulfillment,
    order.delivery,
    ...(Array.isArray(order.shipments) ? order.shipments : []),
  ].filter(Boolean);

const getLatestTrackingEvent = (shipment: any) => {
  const trackingEvents = Array.isArray(shipment?.tracking) ? shipment.tracking : [];
  return trackingEvents[trackingEvents.length - 1] || {};
};

const getOrderTrackingInfo = (order: any) => {
  const shipment = getShipmentCandidates(order)[0] || {};
  const courier = shipment.courier || order.courierDetails || {};
  const trackingEvent = getLatestTrackingEvent(shipment);

  const trackingNumber = firstString(
    order.tracking_id,
    order.trackingId,
    order.trackingNumber,
    order.awbNumber,
    order.awb,
    order.consignmentNumber,
    shipment.trackingNumber,
    shipment.trackingId,
    shipment.awb,
    shipment.awbNumber,
    shipment.consignmentNumber,
    courier.trackingNumber,
    courier.trackingId,
    courier.awb,
    courier.awbNumber,
    trackingEvent.trackingNumber,
    trackingEvent.trackingId,
    trackingEvent.awb,
    trackingEvent.awbNumber
  );

  const courierName = firstString(
    order.courier_name,
    order.courierName,
    order.courier,
    order.carrier,
    shipment.serviceName,
    shipment.courierName,
    shipment.carrier,
    courier.serviceName,
    courier.courierName,
    courier.name,
    courier.provider,
    trackingEvent.courierName,
    trackingEvent.serviceName
  );

  const directTrackingUrl = getSafeExternalUrl(
    firstString(
      order.tracking_url,
      order.trackingUrl,
      order.trackingLink,
      shipment.trackingUrl,
      shipment.tracking_url,
      shipment.trackingLink,
      courier.trackingUrl,
      courier.tracking_url,
      courier.trackingLink,
      trackingEvent.trackingUrl,
      trackingEvent.tracking_url,
      trackingEvent.trackingLink
    )
  );

  return {
    trackingNumber,
    courierName,
    trackingUrl: directTrackingUrl || resolveCourierTrackingUrl(courierName, trackingNumber),
  };
};

const getOrderMatchKeys = (order: any) =>
  [
    order._id,
    order.id,
    order.order,
    order.orderId,
    order.orderNumber,
    typeof order.order === "object" ? order.order?._id : "",
    typeof order.order === "object" ? order.order?.id : "",
    typeof order.order === "object" ? order.order?.orderNumber : "",
  ]
    .filter(Boolean)
    .map((value) => String(value));

const mergeShipmentsIntoOrders = (orders: any[], shipments: any[]) => {
  if (!shipments.length) return orders;

  const shipmentsByOrderKey = new Map<string, any>();
  shipments.forEach((shipment) => {
    getOrderMatchKeys(shipment).forEach((key) => shipmentsByOrderKey.set(key, shipment));
  });

  return orders.map((order) => {
    const shipment = getOrderMatchKeys(order).map((key) => shipmentsByOrderKey.get(key)).find(Boolean);
    return shipment ? { ...order, shipment } : order;
  });
};

// Payment Status Badge mapping
const getPaymentStatusBadge = (isPaid: boolean, paymentStatus?: string, payment_status?: string) => {
  const ps = (payment_status || paymentStatus || "").toUpperCase();
  const isApprovedOrPaid =
    isPaid === true ||
    ["PAID", "VERIFIED", "SUCCESS", "COMPLETED", "APPROVED", "CONFIRMED", "PAYMENT_APPROVED"].includes(ps);

  if (isApprovedOrPaid) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-semibold flex items-center gap-1">
        <ShieldCheck className="h-3 w-3 text-emerald-600" />
        <span>Payment Confirmed</span>
      </Badge>
    );
  }
  if (ps === "REJECTED" || ps === "FAILED") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/30 font-semibold flex items-center gap-1">
        <XCircle className="h-3 w-3 text-rose-600" />
        <span>Payment Rejected</span>
      </Badge>
    );
  }
  if (ps === "SUBMITTED" || ps === "VERIFICATION_PENDING") {
    return (
      <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 font-semibold flex items-center gap-1">
        <Clock className="h-3 w-3 text-amber-600" />
        <span>Verification Pending</span>
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 font-semibold flex items-center gap-1">
      <AlertTriangle className="h-3 w-3 text-amber-600" />
      <span>Pending Payment</span>
    </Badge>
  );
};

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
      const [ordersRes, shipmentsRes] = await Promise.allSettled([
        api.get(`/users/${userId}/orders`),
        api.get(`/users/${userId}/shipments`),
      ]);

      if (ordersRes.status !== "fulfilled") {
        throw ordersRes.reason;
      }

      const ordersPayload = ordersRes.value.data;
      const ordersData =
        ordersPayload?.data?.orders ||
        ordersPayload?.orders ||
        ordersPayload?.data ||
        ordersPayload ||
        [];
      const shipmentsPayload = shipmentsRes.status === "fulfilled" ? shipmentsRes.value.data : null;
      const shipmentsData =
        shipmentsPayload?.data?.shipments ||
        shipmentsPayload?.shipments ||
        shipmentsPayload?.data ||
        shipmentsPayload ||
        [];

      const list = Array.isArray(ordersData) ? ordersData : [];
      const shipments = Array.isArray(shipmentsData) ? shipmentsData : [];
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

  // Submit UTR Number API Handler
  const handleSubmitUtr = async (orderId: string) => {
    const utr = (utrInputMap[orderId] || "").trim();
    if (!utr || utr.length < 6) {
      toast.error("Please enter a valid UTR / Transaction Reference Number (min 6 digits).");
      return;
    }

    setSubmittingUtrMap((prev) => ({ ...prev, [orderId]: true }));

    try {
      await api.put(`/orders/${orderId}/verify-payment`, { utr });

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
      const { data } = await api.get(`/users/${userId}/invoices`);
      const invoices = data?.data || data || [];
      const matchingInvoice = Array.isArray(invoices)
        ? invoices.find((inv: any) => (inv.order?._id || inv.order) === orderId || inv.payment === order.payment)
        : null;

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
    const status = (order.status || order.orderStatus || "").toUpperCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = orderNum.includes(query) || utrNum.includes(query);
    const matchesStatus = statusFilter === "all" || status === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
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
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="PENDING">Payment Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="SHIPPED">In Transit / Shipped</SelectItem>
                <SelectItem value="DELIVERED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
            const isExpanded = expandedOrder === id;
            const isPaid = isOrderPaid(order);
            const rawPaymentStatus = getOrderPaymentStatus(order);
            const paymentStatus = rawPaymentStatus || (order.utr ? "VERIFICATION_PENDING" : "PENDING");

            const subtotal = order.subtotal ?? (order.totalPrice ? order.totalPrice - (order.shippingPrice || 0) : order.items?.reduce((acc: number, item: any) => acc + (item.price || item.book?.price || 0) * (item.quantity || 1), 0) || 0);
            const shippingPrice = order.shippingPrice ?? order.shippingFee ?? 0;
            const totalPrice = order.totalPrice ?? order.totalAmount ?? order.amount ?? (subtotal + shippingPrice);
            const { trackingNumber, courierName, trackingUrl } = getOrderTrackingInfo(order);
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
                            {getOrderStatusBadge(status)}
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
                          <p className="text-xs text-[#5C6E6E]">Amount Payable</p>
                          <p className="text-xl font-serif font-bold text-[#0F3D3E]">₹{totalPrice.toLocaleString()}</p>
                        </div>
                        {getPaymentStatusBadge(isPaid, paymentStatus, order.payment_status)}
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
                          onClick={() => setExpandedOrder(isExpanded ? null : id)}
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

                      {/* STATE 1: PAYMENT_PENDING (No UTR submitted yet) */}
                      {!isPaid && (!paymentStatus || paymentStatus === "PENDING") && !order.utr && (
                        <div className="space-y-4 pt-1">
                          <div className="p-4 rounded-xl border-2 border-[#D4AF37] bg-[#D4AF37]/5 flex flex-col md:flex-row items-center gap-6">
                            {/* QR Code Container with Gold Highlight */}
                            <div className="flex flex-col items-center bg-white p-3 rounded-xl border-2 border-[#D4AF37] shadow-sm">
                              <QrCode className="h-24 w-24 text-[#0F3D3E]" />
                              <span className="text-[10px] font-bold text-[#0F3D3E] mt-1 uppercase tracking-wider">
                                Scan & Pay UPI
                              </span>
                            </div>
                            <div className="flex-1 text-center md:text-left space-y-2">
                              <div className="flex items-center justify-between md:justify-start gap-3">
                                <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-bold text-xs">
                                  PAYMENT_PENDING
                                </Badge>
                                <span className="text-lg font-serif font-bold text-[#0F3D3E]">
                                  Amount: ₹{totalPrice.toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-[#5C6E6E] leading-relaxed">
                                Scan the UPI QR Code with Google Pay, PhonePe, or Paytm to pay{" "}
                                <strong className="text-[#0F3D3E]">₹{totalPrice.toLocaleString()}</strong>. After completing payment, enter your 12-digit UTR transaction reference below.
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
                                  onClick={() => handleSubmitUtr(id)}
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
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STATE 2: VERIFICATION_PENDING (UTR Submitted, Waiting for Admin) */}
                      {!isPaid && (paymentStatus === "VERIFICATION_PENDING" || (order.utr && !["REJECTED", "FAILED"].includes(paymentStatus.toUpperCase()))) && (
                        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                              <h5 className="font-bold text-sm font-serif">VERIFICATION_PENDING</h5>
                            </div>
                            <span className="font-mono text-xs font-semibold bg-white/80 px-2 py-0.5 rounded text-amber-900 border border-amber-300">
                              UTR: {order.utr}
                            </span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            Waiting for admin verification. Your payment reference was received and is being verified by our finance team.
                          </p>
                          <div className="pt-1">
                            <Input
                              value={order.utr || ""}
                              disabled
                              className="bg-white/60 text-xs font-mono border-amber-300 cursor-not-allowed opacity-70"
                            />
                          </div>
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
                      {paymentStatus === "REJECTED" && (
                        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-5 w-5 text-rose-600" />
                              <h5 className="font-bold text-sm font-serif">PAYMENT_FAILED / REJECTED</h5>
                            </div>
                          </div>
                          <p className="text-xs text-rose-800">
                            Payment verification failed or UTR reference could not be matched. Please re-check your UTR and resubmit.
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
                              onClick={() => handleSubmitUtr(id)}
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
                                    {getOrderStatusBadge(status)}
                                  </div>
                                  <p className="text-xs text-[#5C6E6E] mt-0.5">
                                    Courier Partner: <strong className="text-[#0F3D3E]">{courierName || "To be assigned upon dispatch"}</strong>
                                  </p>
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
                              <div className="p-3.5 rounded-xl bg-white border border-[#E2E6DF] flex items-center gap-3">
                                <Clock className="h-4 w-4 text-[#5C6E6E] shrink-0" />
                                <p className="text-xs text-[#5C6E6E]">
                                  {status.toUpperCase().includes("PRINT")
                                    ? "Book printing is physically in progress. Courier Tracking link & ID will appear once shipped."
                                    : "Order placed. Printing will be processed shortly and shipment details will be updated here."}
                                </p>
                              </div>
                            )}
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
