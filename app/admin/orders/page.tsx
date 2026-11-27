"use client";

import { adminResponse, adminRows } from "@/lib/admin-account-api";
import { approveAdminPayment, rejectAdminPayment } from "@/lib/admin-payments-api";
import { populated } from "@/lib/order-status";
import { scheduleRequest } from "@/lib/schedule-request";
import type { OrderRecord, OrderItem, ShipmentRecord } from "@/types/commerce-api";
import { UnconfirmedWriteError, writeOutcomeUncertain, describeApiError } from "@/lib/api-error";
import { cn, getSafeExternalUrl } from "@/lib/utils";

import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { resolveCourierTrackingUrl } from "@/lib/couriers";
import {
  canEditTracking,
  extractList,
  extractTrackingInfo,
  getShipmentLabel,
  getShipmentStatusPath,
  mergeShipmentsIntoOrders,
  nextTrackingUrl,
  normalizeShipmentStatus,
  shipmentBelongsToOrder,
} from "@/lib/tracking";
import { CourierPicker, useCourierCapabilities } from "@/components/admin/courier-picker";
import { canEnterTracking } from "@/lib/courier-capabilities";
import { notifyLiveChange } from "@/lib/live-sync";
import { assignCourier, fetchSavedShipment } from "@/lib/shipment-actions";
import { ErrorState } from "@/components/ui/error-state";
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Printer,
  Truck,
  MapPin,
  Phone,
  Copy,
  Check,
  Package,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import toast from "react-hot-toast";

const getPaymentBadge = (isPaid: boolean, paymentStatus?: string, payment_status?: string) => {
  const ps = (payment_status || paymentStatus || "").toUpperCase();
  if (isPaid || ["CONFIRMED", "APPROVED", "VERIFIED", "SUCCESS", "PAID"].includes(ps)) {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-semibold text-xs flex items-center gap-1 justify-center">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        <span>Payment Confirmed</span>
      </Badge>
    );
  }
  if (ps === "REJECTED" || ps === "FAILED") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/30 font-semibold text-xs flex items-center gap-1 justify-center">
        <XCircle className="h-3 w-3 text-rose-600" />
        <span>Payment Failed</span>
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 font-semibold text-xs animate-pulse flex items-center gap-1 justify-center">
      <span>Pending Payment</span>
    </Badge>
  );
};

const PAID_STATUSES = ["CONFIRMED", "APPROVED", "VERIFIED", "SUCCESS", "PAID", "COMPLETED", "PAYMENT_APPROVED"];
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const getMongoId = (value?: unknown) => {
  if (typeof value !== "string") return undefined;
  return MONGO_ID_REGEX.test(value) ? value : undefined;
};

// Backend order statuses (admin orders handover): PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED.
const ORDER_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "Payment Pending", tone: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20" },
  PROCESSING: { label: "Processing", tone: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  SHIPPED: { label: "Shipped", tone: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  DELIVERED: { label: "Delivered", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  CANCELLED: { label: "Cancelled", tone: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
};

const normalizeOrderStatus = (status: string) => {
  const s = (status || "").toUpperCase().replace(/[-\s]/g, "_");
  if (s.includes("DELIVER")) return "DELIVERED";
  if (s.includes("SHIP") || s.includes("TRANSIT")) return "SHIPPED";
  if (s.includes("CANCEL")) return "CANCELLED";
  if (s.includes("PROCESS") || s.includes("PRINT")) return "PROCESSING";
  return "PENDING";
};

const getOrderStatusBadge = (status: string) => {
  const raw = (status || "").toUpperCase();
  const meta = ORDER_STATUS_LABELS[normalizeOrderStatus(status)];
  // Legacy "Printed" values are shown as such so admins can still tell them apart.
  const label = raw.includes("PRINT") ? "Printed" : meta.label;
  return <Badge className={`${meta.tone} text-xs font-semibold`}>{label}</Badge>;
};

/**
 * items[].book is a populated Book (or null if the book was deleted).
 * Money always comes from item.price (price paid per unit at purchase time), never the
 * book's current mrp, which can change after the order.
 */
function OrderItemsCell({ items }: { items: OrderItem[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-[11px] italic text-[#5C6E6E]">No items</span>;
  }
  return (
    <div className="space-y-2 min-w-[220px]">
      {items.map((item, idx) => {
        const book = item.book && typeof item.book === "object" ? item.book : null;
        const title = book?.title ?? item.title ?? "Book no longer available";
        const unitPrice = Number(item.price ?? 0) || 0;
        const qty = Number(item.quantity ?? 1) || 1;
        return (
          <div key={item._id ?? `${book?._id ?? "deleted"}-${idx}`} className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book?.coverImage || "/placeholder-book.svg"}
              alt=""
              width={28}
              height={40}
              loading="lazy"
              className="h-10 w-7 rounded object-cover border border-[#E2E6DF] shrink-0 bg-[#F8F9F7]"
            />
            <div className="min-w-0">
              {book?._id ? (
                <a
                  href={`/admin/books/${book._id}`}
                  className="block font-semibold text-[#0F3D3E] hover:underline truncate max-w-[200px]"
                  title={title}
                >
                  {title}
                </a>
              ) : (
                <span className="block font-semibold italic text-[#5C6E6E] truncate max-w-[200px]">{title}</span>
              )}
              <span className="text-[10px] text-[#5C6E6E] font-mono">
                {qty} × ₹{unitPrice.toLocaleString("en-IN")} = ₹{(unitPrice * qty).toLocaleString("en-IN")}
                {book?.format ? ` · ${book.format}` : ""}
                {book?.slug && (
                  <>
                    {" · "}
                    <a href={`/books/${book.slug}`} target="_blank" rel="noopener noreferrer" className="underline">
                      store
                    </a>
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const getCustomerAddress = (order: OrderRecord) =>
  order?.orderFormData?.shippingAddress ||
  order?.customerSnapshot?.shippingAddress ||
  order?.checkoutSnapshot?.shippingAddress ||
  order?.shippingAddress ||
  order?.deliveryAddress ||
  order?.address ||
  order?.shipping_address ||
  order?.billingAddress ||
  order?.billing_address ||
  {};

const getCustomerPhone = (order: OrderRecord) => {
  const addr = getCustomerAddress(order);
  return (
    addr.phone ||
    addr.mobile ||
    addr.mobileNumber ||
    addr.phoneNumber ||
    addr.recipientPhone ||
    addr.contactNumber ||
    addr.contactPhone ||
    order.orderFormData?.phone ||
    order.orderFormData?.customerPhone ||
    order.customerSnapshot?.phone ||
    order.customerSnapshot?.customerPhone ||
    order.checkoutSnapshot?.phone ||
    order.checkoutSnapshot?.customerPhone ||
    order.customerPhone ||
    order.customerMobile ||
    order.mobile ||
    order.phone ||
    order.phoneNumber ||
    order.recipientPhone ||
    order.customer?.phone ||
    order.customer?.mobile ||
    ""
  );
};

const getCustomerEmail = (order: OrderRecord) => {
  const addr = getCustomerAddress(order);
  return (
    addr.email ||
    order.orderFormData?.email ||
    order.orderFormData?.customerEmail ||
    order.customerSnapshot?.email ||
    order.customerSnapshot?.customerEmail ||
    order.checkoutSnapshot?.email ||
    order.checkoutSnapshot?.customerEmail ||
    order.customerEmail ||
    order.email ||
    order.customer?.email ||
    "N/A"
  );
};

const getCustomerName = (order: OrderRecord) => {
  const addr = getCustomerAddress(order);
  return (
    addr.fullName ||
    addr.name ||
    addr.recipientName ||
    order.orderFormData?.fullName ||
    order.orderFormData?.customerName ||
    order.customerSnapshot?.fullName ||
    order.customerSnapshot?.customerName ||
    order.checkoutSnapshot?.fullName ||
    order.checkoutSnapshot?.customerName ||
    order.customerName ||
    order.customer?.name ||
    "Customer"
  );
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Tracking Modal State
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<OrderRecord | null>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [courierInput, setCourierInput] = useState("");
  const [provider, setProvider] = useState("");
  const couriers = useCourierCapabilities(trackingModalOpen);
  const trackingPending = useRef(false);
  const [trackingUnconfirmed, setTrackingUnconfirmed] = useState(false);
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);
  const [markDispatched, setMarkDispatched] = useState(true);

  // Customer Shipping Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedOrderForAddress, setSelectedOrderForAddress] = useState<OrderRecord | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const copyFullAddress = (order: OrderRecord) => {
    if (!order) return;
    const addr = getCustomerAddress(order);
    const enteredEmail = getCustomerEmail(order);
    const enteredPhone = getCustomerPhone(order) || "Not Provided";
    const recipientName = getCustomerName(order);
    const lines = [
      `Recipient: ${recipientName}`,
      `Phone: ${enteredPhone}`,
      `Email: ${enteredEmail}`,
      `Address: ${addr.addressLine1 || addr.street || addr.address || "Address Line 1"}`,
      addr.addressLine2 ? `Address Line 2: ${addr.addressLine2}` : null,
      `City: ${addr.city || ""}`,
      `State / Postal PIN: ${addr.state ? addr.state + " - " : ""}${addr.postalCode || addr.pincode || addr.pinCode || ""}`,
      `Country: ${addr.country || "India"}`,
    ].filter(Boolean).join("\n");

    navigator.clipboard.writeText(lines);
    setCopiedAddress(true);
    toast.success("Full shipping address copied to clipboard! 📋");
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Debounce the search box: one request per pause in typing, not per keystroke (429 risk).
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const [totalOrders, setTotalOrders] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string | number> = { page: 1, limit: 100, sort: "-createdAt" };
      if (statusFilter !== "all") params.status = statusFilter.toUpperCase();
      if (debouncedSearch) params.search = debouncedSearch;

      // Tracking lives on the Shipment, not the Order, so shipments are merged in; without them
      // the Tracking ID dialog reopened with the old value and saved IDs never showed here.
      const [{ data }, shipmentsRes] = await Promise.all([
        api.get("/admin/orders", { params, cache: "no-store" }),
        api.get("/admin/shipments", { params: { limit: 100 }, cache: "no-store" }).catch(() => null),
      ]);
      setOrders(mergeShipmentsIntoOrders(adminRows<OrderRecord>(data, "orders"), extractList(shipmentsRes?.data, "shipments")));
      setTotalOrders(typeof data?.pagination?.total === "number" ? data.pagination.total : null);
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      const status = err?.response?.status;
      // 401 is handled by the api client (refresh or logout) and 403/429 already show a toast.
      if (status !== undefined && status >= 500) {
        console.error(
          "Admin orders failed:",
          status,
          "X-Request-Id:",
          err?.response?.headers?.["x-request-id"] || "n/a"
        );
      } else {
        console.error("Failed to fetch admin orders:", describeApiError(err));
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch]);

  useEffect(() => scheduleRequest(fetchOrders), [fetchOrders]);

  const [paymentAction, setPaymentAction] = useState<string | null>(null);

  const verifyPayment = async (paymentId: string, action: "approve" | "reject") => {
    if (paymentAction) return;
    const reason = action === "reject" ? window.prompt("Enter the reason for rejecting this payment.")?.trim() : "";
    if (action === "reject" && !reason) return;
    setPaymentAction(paymentId);
    try {
      const result = action === "approve"
        ? await approveAdminPayment(paymentId)
        : await rejectAdminPayment(paymentId, { reason });
      adminResponse(result);
      toast.success(action === "approve" ? "Payment confirmed." : "Payment rejected.");
      await fetchOrders();
    } catch (caughtError) {
      const error = describeApiError(caughtError);
      toast.error(error.response?.data.message || error.message);
    } finally {
      setPaymentAction(null);
    }
  };

  // Action 3: Mark as Printed / Physical printing completed
  const handleMarkAsPrinted = async (orderMongoId?: string) => {
    if (!orderMongoId) {
      toast.error("No valid Order ID found.");
      return;
    }
    try {
      adminResponse((await api.put(`/admin/orders/${orderMongoId}/status`, {
        status: "Printed",
        reason: "Book physically printed",
      })).data);

      toast.success("Order status updated to Printed 🖨️");
      fetchOrders();
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(err.response?.data?.message || "Failed to update order status.");
    }
  };

  // Action 4: Submit Tracking ID & URL, Mark Shipped
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForTracking) {
      toast.error("No order selected.");
      return;
    }
    if (trackingPending.current || trackingUnconfirmed || couriers.error || !couriers.data?.some((item) => item.provider === provider && canEnterTracking(item))) return;
    if (!courierInput.trim() || (!trackingNumberInput.trim() && !trackingUrlInput.trim())) {
      toast.error("Enter the courier service and a tracking number or URL.");
      return;
    }

    const orderMongoId = getMongoId(selectedOrderForTracking._id) || getMongoId(selectedOrderForTracking.id);
    if (!orderMongoId) {
      toast.error("Order Mongo ID missing for tracking update.");
      return;
    }

    const enteredTrackingUrl = trackingUrlInput.trim();
    if (enteredTrackingUrl && !getSafeExternalUrl(enteredTrackingUrl)) {
      toast.error("Tracking URL must be a valid http or https link.");
      return;
    }

    trackingPending.current = true;
    setIsSubmittingTracking(true);

    try {
      const finalTrackingNumber = trackingNumberInput.trim();
      const resolvedTrackingUrl =
        getSafeExternalUrl(enteredTrackingUrl) ||
        (finalTrackingNumber ? resolveCourierTrackingUrl(courierInput, finalTrackingNumber) : "");

      // Tracking is only persisted on the Shipment record (CourierAssignRequest).
      // PUT /admin/orders/{id}/status ignores tracking fields, which is why readers
      // and authors never saw the tracking ID when it was saved from this page.
      const shipmentRes = await api.get("/admin/shipments", {
        params: { order: orderMongoId, limit: 100 },
        cache: "no-store",
      });
      const shipment = extractList<ShipmentRecord>(shipmentRes.data, "shipments").find((s) =>
        shipmentBelongsToOrder(s, selectedOrderForTracking)
      );
      // Admin shipment actions take shipment._id only (never orderNumber / shipmentId UUID / AWB).
      const shipmentId = shipment?._id || shipment?.id;
      if (!shipmentId) {
        toast.error(
          "No shipment exists for this order yet. A shipment is created automatically after the payment is verified and the invoice is generated. Confirm the payment, wait a few seconds, then try again.",
          { duration: 7000 }
        );
        return;
      }
      if (!canEditTracking(shipment.status)) {
        toast.error(
          `This shipment is already "${getShipmentLabel(shipment.status)}". Update its progress from Shipments & Courier.`,
          { duration: 6000 }
        );
        return;
      }

      const currentStatus = await assignCourier(
        shipment,
        {
          provider,
          courierName: courierInput.trim(),
          serviceName: courierInput.trim(),
          trackingNumber: finalTrackingNumber,
          trackingUrl: resolvedTrackingUrl || undefined,
        },
      );

      // Mark it dispatched via the shipment (COURIER_ASSIGNED -> IN_TRANSIT). The backend then
      // syncs the order to SHIPPED; the order status must not be updated separately. A shipment
      // that is already in transit (only its AWB was corrected) needs no step.
      if (markDispatched) {
        for (const status of getShipmentStatusPath(currentStatus, "IN_TRANSIT")) {
          const { data } = await api.post(`/admin/shipments/${shipmentId}/update-status`, {
            status,
            description: `Dispatched via ${courierInput.trim()}`,
            occurredAt: new Date().toISOString(),
            metadata: { source: "admin-orders" },
          });
          adminResponse(data);
        }
      }

      if (markDispatched) {
        const saved = await fetchSavedShipment(shipmentId);
        if (!["IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"].includes(normalizeShipmentStatus(saved.status))) {
          throw new UnconfirmedWriteError("Courier tracking was saved. Dispatch could not be confirmed. Check Shipments before retrying.");
        }
      }
      if (markDispatched) notifyLiveChange("shipments");
      toast.success(
        markDispatched
          ? "Tracking saved and shipment confirmed in transit."
          : `${courierInput} tracking saved. Mark it in transit from Shipments & Courier when it leaves.`
      );
      setTrackingModalOpen(false);
      setTrackingNumberInput("");
      setTrackingUrlInput("");
      fetchOrders();
    } catch (caughtError) {
      if (writeOutcomeUncertain(caughtError)) { setTrackingUnconfirmed(true); void fetchOrders(); }
      const err = describeApiError(caughtError);
      const status = err.response?.status;
      toast.error(
        status === 409
          ? "That tracking number is already used on another shipment. Check the AWB and enter a different one."
          : err.response?.data?.message || err.message
      );
    } finally {
      trackingPending.current = false;
      setIsSubmittingTracking(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderNum = (order.orderNumber || order._id || order.id || "").toLowerCase();
    const utrNum = (order.utr || "").toLowerCase();
    const customer = getCustomerName(order).toLowerCase();
    const query = searchQuery.toLowerCase();

    const books = (order.items || []).map((item) => (populated(item.book)?.title || "").toLowerCase()).join(" ");
    const matchesSearch =
      orderNum.includes(query) || utrNum.includes(query) || customer.includes(query) || books.includes(query);
    const matchesStatus =
      statusFilter === "all" || normalizeOrderStatus(order.status || order.orderStatus || "") === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
          Orders & Payment Verification
        </h1>
        <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
          Verify UTR numbers, manage print processing, and add shipment tracking codes.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
              <Input
                aria-label="Search orders"
                placeholder="Search by Order ID, UTR reference, or Customer Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-[#E2E6DF]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Filter order status" className="w-full sm:w-52 bg-white border-[#E2E6DF]">
                <Filter className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Status Filter Pills with Live Counters */}
          <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-[#E2E6DF]/70 text-xs">
            {[
              // Counts reflect the loaded page; "All" shows the server total when available.
              { id: "all", label: "All Orders", count: statusFilter === "all" && totalOrders !== null ? totalOrders : orders.length },
              ...Object.entries(ORDER_STATUS_LABELS).map(([id, meta]) => ({
                id,
                label: meta.label,
                count: orders.filter((o) => normalizeOrderStatus(o.status || o.orderStatus || "") === id).length,
              })),
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setStatusFilter(pill.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer",
                  statusFilter === pill.id
                    ? "bg-[#0F3D3E] text-[#D4AF37] border-[#0F3D3E] shadow-2xs"
                    : "bg-[#F8F9F7] text-[#5C6E6E] border-[#E2E6DF] hover:bg-white hover:text-[#0F3D3E]"
                )}
              >
                <span>{pill.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold",
                    statusFilter === pill.id ? "bg-[#D4AF37] text-[#0F3D3E]" : "bg-[#E2E6DF]/80 text-[#0F3D3E]"
                  )}
                >
                  {pill.count}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      {error ? (
        <ErrorState
          title="Could not load orders"
          message="We encountered an issue fetching orders. Please try again."
          onRetry={fetchOrders}
        />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F3D3E]" />
        </div>
      ) : (
        <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div>
              <Table aria-label="Orders and payment verification" role="table" className="admin-orders-table">
                <TableHeader role="rowgroup" className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead role="columnheader" scope="col" className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Order ID</TableHead>
                    <TableHead role="columnheader" scope="col" className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Customer & Contact</TableHead>
                    <TableHead role="columnheader" scope="col" className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Books Ordered</TableHead>
                    <TableHead role="columnheader" scope="col" className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">UTR Reference</TableHead>
                    <TableHead role="columnheader" scope="col" className="text-right font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Total Amount</TableHead>
                    <TableHead role="columnheader" scope="col" className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Payment</TableHead>
                    <TableHead role="columnheader" scope="col" className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Order Status</TableHead>
                    <TableHead role="columnheader" scope="col" className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody role="rowgroup">
                  {filteredOrders.map((order: OrderRecord) => {
                    const orderDisplayId = order.orderNumber || order._id || order.id;
                    const mongoOrderId = getMongoId(order._id) || getMongoId(order.id);
                    const paymentId = (
                      typeof order.payment === "object"
                        ? getMongoId(order.payment?._id)
                        : getMongoId(order.payment)
                    ) || getMongoId(order.paymentId);
                    const rawPaymentStatus = (
                      order.payment_status ||
                      order.paymentStatus ||
                      order.paymentState ||
                      (typeof order.payment === "object" ? order.payment?.status : "") ||
                      ""
                    ).toUpperCase();
                    const isPaid = Boolean(order.isPaid || PAID_STATUSES.includes(rawPaymentStatus));
                    const paymentStatus = rawPaymentStatus || (order.utr ? "VERIFICATION_PENDING" : "PENDING");
                    const orderStatus = order.status || order.orderStatus || "PENDING";
                    const totalPrice = order.totalPrice ?? order.totalAmount ?? order.amount;
                    const canVerifyPayment = Boolean(paymentId && !isPaid && order.utr && normalizeOrderStatus(orderStatus) !== "CANCELLED");

                    return (
                      <TableRow role="row" key={orderDisplayId} className="hover:bg-[#F8F9F7]/60 text-xs">
                        {/* Order ID */}
                        <TableCell role="cell" data-label="Order ID" className="font-mono font-bold text-[#0F3D3E]">
                          {orderDisplayId}
                        </TableCell>

                        {/* Customer & Contact (Strictly Entered Data, No Overrides) */}
                        <TableCell role="cell" data-label="Customer and contact">
                          {(() => {
                            const enteredName = getCustomerName(order);
                            const enteredEmail = getCustomerEmail(order);
                            const enteredPhone = getCustomerPhone(order);
                            return (
                              <>
                                <p className="font-serif font-bold text-[#0F3D3E]">
                                  {enteredName}
                                </p>
                                <p className="text-[#5C6E6E] text-[11px] font-sans break-all">
                                  {enteredEmail}
                                </p>
                                {enteredPhone ? (
                                  <p className="text-[#0F3D3E] font-mono text-[11px] flex items-center gap-1 mt-0.5">
                                    <Phone className="h-3 w-3 text-[#8A6D1E] shrink-0" />
                                    <span>{enteredPhone}</span>
                                  </p>
                                ) : (
                                  <p className="text-amber-800/80 italic text-[10px] mt-0.5">
                                    No phone recorded
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderForAddress(order);
                              setAddressModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F3D3E] bg-[#0F3D3E]/5 hover:bg-[#0F3D3E]/15 px-2 py-0.5 rounded-md border border-[#0F3D3E]/20 transition-all mt-1.5 cursor-pointer shadow-2xs"
                            title="View Customer Shipping Address"
                          >
                            <MapPin className="h-3 w-3 text-[#8A6D1E]" />
                            <span>View Address</span>
                          </button>
                        </TableCell>

                        {/* Books (every item, not just the first) */}
                        <TableCell role="cell" data-label="Books ordered" className="align-top">
                          <OrderItemsCell items={order.items || []} />
                        </TableCell>

                        {/* UTR Number */}
                        <TableCell role="cell" data-label="UTR reference">
                          {order.utr ? (
                            <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300">
                              {order.utr}
                            </span>
                          ) : (
                            <span className="text-[#5C6E6E] italic text-[11px]">No UTR yet</span>
                          )}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell role="cell" data-label="Total" className="text-right font-serif font-bold text-[#0F3D3E]">
                          {totalPrice == null ? "Unavailable" : `₹${totalPrice.toLocaleString("en-IN")}`}
                        </TableCell>

                        {/* Payment Status */}
                        <TableCell role="cell" data-label="Payment" className="text-center">
                          {getPaymentBadge(isPaid, paymentStatus, order.payment_status)}
                        </TableCell>

                        {/* Order Status */}
                        <TableCell role="cell" data-label="Order status" className="text-center">
                          {getOrderStatusBadge(orderStatus)}
                        </TableCell>

                        {/* Actions */}
                        <TableCell role="cell" data-label="Actions" className="text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {/* 👉 Confirm Payment */}
                            {canVerifyPayment && paymentId && (
                              <Button
                                size="sm"
                                disabled={paymentAction !== null}
                                onClick={() => verifyPayment(paymentId, "approve")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                title="Confirm Payment"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Confirm Payment</span>
                              </Button>
                            )}

                            {/* 👉 Reject Payment */}
                            {canVerifyPayment && paymentId && (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={paymentAction !== null}
                                onClick={() => verifyPayment(paymentId, "reject")}
                                className="text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                title="Reject Payment"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Reject</span>
                              </Button>
                            )}

                            {/* 👉 Mark as Printed */}
                            {isPaid && normalizeOrderStatus(orderStatus) === "PROCESSING" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsPrinted(mongoOrderId)}
                                className="border-[#0F3D3E]/30 text-[#0F3D3E] hover:bg-[#F0F2ED] text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                title="Mark as Printed"
                              >
                                <Printer className="h-3 w-3" />
                                <span>Mark Printed</span>
                              </Button>
                            )}

                            {/* 👉 Add Tracking ID */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!mongoOrderId || !isPaid}
                              onClick={() => {
                                setSelectedOrderForTracking(order);
                                const existing = extractTrackingInfo(order);
                                setTrackingNumberInput(existing.trackingNumber);
                                setCourierInput(existing.courierName || "");
                                setProvider("");
                                setTrackingUnconfirmed(false);
                                setTrackingUrlInput(existing.trackingUrl);
                                setTrackingModalOpen(true);
                              }}
                              className="border-[#D4AF37] text-[#0F3D3E] hover:bg-[#D4AF37]/10 text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                              title={extractTrackingInfo(order).trackingNumber ? "Edit Tracking ID" : "Add Tracking ID"}
                            >
                              <Truck className="h-3 w-3 text-[#D4AF37]" />
                              <span className="font-mono">{extractTrackingInfo(order).trackingNumber || "Tracking ID"}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground text-xs">
                        No orders found matching search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Tracking ID Dialog */}
      <Dialog open={trackingModalOpen} onOpenChange={setTrackingModalOpen}>
        <DialogContent className="bg-white border-[#E2E6DF] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif font-bold text-lg text-[#0F3D3E]">
              Add Shipment Tracking ID
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5C6E6E]">
              Add physical parcel post tracking link and consignment ID for order{" "}
              <strong className="font-mono text-[#0F3D3E]">
                {selectedOrderForTracking?.orderNumber || selectedOrderForTracking?._id}
              </strong>
              . This will set status to SHIPPED.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTracking} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Courier Service / Delivery Plan *
              </label>
              {trackingUnconfirmed && <p role="alert">Check the saved shipment before retrying this change.</p>}
              <CourierPicker resource={couriers} value={provider} disabled={isSubmittingTracking}
                select={(courier) => { setProvider(courier.provider); if (!courierInput && courier.provider !== "manual") setCourierInput(courier.label); }} />
              <Input aria-label="Courier service" value={courierInput} onChange={(event) => setCourierInput(event.target.value)} placeholder="Courier from your shipment booking" className="border-[#E2E6DF] rounded-xl h-11 text-xs font-semibold" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E] flex items-center justify-between">
                <span>Tracking ID / Consignment Number</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Optional if URL provided
                </span>
              </label>
              <Input
                placeholder="Tracking number"
                value={trackingNumberInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setTrackingUrlInput(nextTrackingUrl(courierInput, trackingNumberInput.trim(), val.trim(), trackingUrlInput));
                  setTrackingNumberInput(val);
                }}
                className="font-mono text-sm border-[#E2E6DF] rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E] flex items-center justify-between">
                <span>Tracking URL (Direct Link)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Opens directly when user clicks &quot;Track Package&quot;</span>
              </label>
              <Input
                type="url"
                placeholder="https://www.indiapost.gov.in/... or courier tracking link"
                value={trackingUrlInput}
                onChange={(e) => setTrackingUrlInput(e.target.value)}
                className="text-xs border-[#E2E6DF] rounded-xl h-11"
              />
            </div>

            <label htmlFor="mark-dispatched" className="flex items-start gap-2 text-xs text-[#0F3D3E] cursor-pointer">
              <input
                id="mark-dispatched"
                type="checkbox"
                checked={markDispatched}
                onChange={(e) => setMarkDispatched(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                The parcel has left with the courier (marks the shipment In Transit, and the order becomes Shipped)
              </span>
            </label>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTrackingModalOpen(false)}
                className="border-[#E2E6DF]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingTracking || trackingUnconfirmed || couriers.loading || Boolean(couriers.error) || !couriers.data?.some((item) => item.provider === provider && canEnterTracking(item))}
                className="bg-[#0F3D3E] text-white hover:bg-[#174C4D]"
              >
                {isSubmittingTracking ? "Saving..." : markDispatched ? "Save Tracking & Mark Shipped" : "Save Tracking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Customer Shipping Address & Consignment Dispatch Modal */}
      <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
        <DialogContent className="max-w-lg bg-white border-[#E2E6DF] rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-[#0F3D3E] flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[#8A6D1E]" />
              <span>Customer Delivery Address</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5C6E6E]">
              Order <strong className="font-mono text-[#0F3D3E]">{selectedOrderForAddress?.orderNumber || selectedOrderForAddress?._id}</strong> — Consignment Shipping & Postal Details
            </DialogDescription>
          </DialogHeader>

          {selectedOrderForAddress && (
            <div className="space-y-4 py-2">
              {/* Postal Dispatch Card */}
              {(() => {
                const modalAddress = getCustomerAddress(selectedOrderForAddress);
                return (
                  <div className="bg-[#F8F9F7] rounded-xl p-4 border border-[#E2E6DF] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block">Recipient Full Name</span>
                        <p className="font-serif font-bold text-base text-[#0F3D3E]">
                          {getCustomerName(selectedOrderForAddress)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => copyFullAddress(selectedOrderForAddress)}
                        className="h-8 text-xs gap-1.5 bg-[#0F3D3E] hover:bg-[#174C4D] text-white rounded-lg cursor-pointer"
                      >
                        {copiedAddress ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedAddress ? "Copied" : "Copy Full Address"}</span>
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E6DF]/80 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block">Phone / Mobile</span>
                        <p className="font-mono font-bold text-[#0F3D3E] mt-0.5">
                          {getCustomerPhone(selectedOrderForAddress) || "Not Provided"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block">Entered Email</span>
                        <p className="font-sans text-[#0F3D3E] mt-0.5 break-all">
                          {getCustomerEmail(selectedOrderForAddress)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E2E6DF]/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block mb-1">
                        Postal Shipping Destination
                      </span>
                      <div className="p-3.5 bg-white rounded-xl border border-[#E2E6DF] font-sans text-xs text-[#0F3D3E] leading-relaxed select-all shadow-2xs space-y-1">
                        <p className="font-semibold text-sm">{modalAddress.addressLine1 || modalAddress.street || modalAddress.address || "Street Address not recorded"}</p>
                        {modalAddress.addressLine2 && (
                          <p className="text-[#5C6E6E]">{modalAddress.addressLine2}</p>
                        )}
                        <p className="font-semibold text-[#0F3D3E] pt-0.5">
                          {modalAddress.city ? `${modalAddress.city}, ` : ""}
                          {modalAddress.state ? `${modalAddress.state} - ` : ""}
                          <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ml-1">
                            PIN: {modalAddress.postalCode || modalAddress.pincode || modalAddress.pinCode || "N/A"}
                          </span>
                        </p>
                        <p className="text-[#5C6E6E] text-[11px] pt-0.5">
                          Country: {modalAddress.country || "India"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Ordered Items in Consignment */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E] flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-[#8A6D1E]" />
                  <span>Books in Consignment ({selectedOrderForAddress.items?.length || 0})</span>
                </span>
                <div className="max-h-40 overflow-y-auto space-y-2 divide-y divide-[#E2E6DF]/60 border border-[#E2E6DF] rounded-xl p-3 bg-[#F8F9F7]/50 text-xs">
                  {(selectedOrderForAddress.items || []).map((item, idx: number) => (
                    <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                      <div className="pr-2">
                        <p className="font-serif font-bold text-[#0F3D3E] line-clamp-1">
                          {populated(item.book)?.title ?? item.title ?? "Book no longer available"}
                        </p>
                        <p className="text-[10px] text-[#5C6E6E]">
                          Qty: <strong className="text-[#0F3D3E]">{item.quantity}</strong> {item.format ? `• ${item.format}` : (populated(item.book)?.format ? `• ${populated(item.book)?.format}` : "")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-[#0F3D3E] shrink-0">
                        ₹{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddressModalOpen(false)}
                  className="border-[#E2E6DF] w-full rounded-xl"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
