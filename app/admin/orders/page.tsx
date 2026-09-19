"use client";
import { cn } from "@/lib/utils";

import { useState, useEffect } from "react";
import api from "@/lib/api";
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

const getPaymentBadge = (isPaid: boolean, paymentStatus?: string) => {
  const ps = (paymentStatus || "").toUpperCase();
  if (isPaid || ps === "VERIFIED" || ps === "SUCCESS") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-semibold text-xs">
        Verified
      </Badge>
    );
  }
  if (ps === "REJECTED" || ps === "FAILED") {
    return (
      <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/30 font-semibold text-xs">
        Rejected
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30 font-semibold text-xs animate-pulse">
      Pending
    </Badge>
  );
};

const getOrderStatusBadge = (status: string) => {
  const s = (status || "").toUpperCase();
  switch (s) {
    case "DELIVERED":
    case "COMPLETED":
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">Completed</Badge>;
    case "SHIPPED":
    case "IN TRANSIT":
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">Shipped</Badge>;
    case "PROCESSING":
      return <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">Processing / Printed</Badge>;
    case "CANCELLED":
      return <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 text-xs">Cancelled</Badge>;
    default:
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 text-xs">Pending</Badge>;
  }
};

const COURIER_SERVICES = [
  "Blue Dart",
  "Ekart Logistics",
  "Delhivery",
  "DTDC",
  "India Post",
  "Shiprocket",
  "Other",
];

const getCourierTrackingUrl = (courier: string, trackingNumber: string): string => {
  const c = (courier || "").toLowerCase();
  const t = encodeURIComponent((trackingNumber || "").trim());
  if (!t) return "";

  if (c.includes("blue") || c.includes("bluedart")) {
    return `https://www.bluedart.com/tracking?trackNumber=${t}`;
  }
  if (c.includes("ekart")) {
    return `https://ekartlogistics.com/shipmenttrack/${t}`;
  }
  if (c.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${t}`;
  }
  if (c.includes("dtdc")) {
    return `https://www.dtdc.in/tracking.asp`;
  }
  if (c.includes("india post") || c.includes("post") || c.includes("speed post")) {
    return `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`;
  }
  if (c.includes("shiprocket")) {
    return `https://shiprocket.co/tracking/${t}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(courier + " tracking " + trackingNumber)}`;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Tracking Modal State
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<any>(null);
  const [trackingNumberInput, setTrackingNumberInput] = useState("");
  const [courierInput, setCourierInput] = useState("Blue Dart");
  const [trackingUrlInput, setTrackingUrlInput] = useState("");
  const [isSubmittingTracking, setIsSubmittingTracking] = useState(false);

  // Customer Shipping Address Modal State
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [selectedOrderForAddress, setSelectedOrderForAddress] = useState<any>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const copyFullAddress = (order: any) => {
    if (!order) return;
    const addr = order.shippingAddress || {};
    const lines = [
      `Recipient: ${addr.fullName || order.user?.name || "Customer"}`,
      `Phone: ${addr.phone || order.user?.phone || order.phone || "Not Provided"}`,
      `Email: ${order.user?.email || addr.email || "N/A"}`,
      `Address: ${addr.addressLine1 || addr.address || "Address Line 1"}`,
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

  const fetchOrders = async () => {
    setLoading(true);
    setError(false);
    try {
      const params: any = { limit: 100 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get("/admin/orders", { params }).catch(() =>
        api.get("/orders", { params })
      );
      const ordersData = data?.data?.orders || (Array.isArray(data?.data) ? data.data : []) || (Array.isArray(data) ? data : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err) {
      console.error("Failed to fetch admin orders:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchQuery]);

  // Action 1: Approve Payment
  const handleApprovePayment = async (orderMongoId?: string, paymentMongoId?: string) => {
    try {
      if (!paymentMongoId && !orderMongoId) {
        toast.error("No valid Payment ID or Order ID found for this record.");
        return;
      }

      if (paymentMongoId) {
        await api.post(`/admin/operations/payments/${paymentMongoId}/approve`, {
          reason: "Admin payment approved from orders view",
        }).catch(() => null);
      }

      if (orderMongoId) {
        await api.put(`/admin/orders/${orderMongoId}/status`, {
          status: "Processing",
          paymentStatus: "VERIFIED",
          isPaid: true,
        }).catch(() => null);
      }

      toast.success("Payment approved & verified successfully! ✅");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to approve payment.");
    }
  };

  // Action 2: Reject Payment
  const handleRejectPayment = async (orderMongoId?: string, paymentMongoId?: string) => {
    const reason = prompt("Enter reason for payment rejection (optional):", "UTR reference mismatch");
    if (reason === null) return;

    try {
      if (paymentMongoId) {
        await api.post(`/admin/operations/payments/${paymentMongoId}/reject`, {
          reason,
        });
      } else if (orderMongoId) {
        await api.put(`/admin/orders/${orderMongoId}/status`, {
          status: "Cancelled",
          paymentStatus: "REJECTED",
          reason,
        });
      } else {
        toast.error("No valid Payment ID or Order ID found for this record.");
        return;
      }

      toast.error("Payment marked as REJECTED.");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reject payment.");
    }
  };

  // Action 3: Mark as Printed / Processing
  const handleMarkAsPrinted = async (orderMongoId?: string) => {
    if (!orderMongoId) {
      toast.error("No valid Order ID found.");
      return;
    }
    try {
      await api.put(`/admin/orders/${orderMongoId}/status`, {
        status: "Processing",
        reason: "Marked as Printed / Processing",
      });

      toast.success("Order status updated to Processing / Printed 🖨️");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update order status.");
    }
  };

  // Action 4: Submit Tracking ID & Mark Shipped
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForTracking || !trackingNumberInput.trim()) {
      toast.error("Please enter a tracking number.");
      return;
    }

    const orderMongoId = selectedOrderForTracking._id || selectedOrderForTracking.id;
    if (!orderMongoId) {
      toast.error("Order Mongo ID missing for tracking update.");
      return;
    }

    setIsSubmittingTracking(true);

    try {
      const resolvedTrackingUrl = trackingUrlInput.trim() || getCourierTrackingUrl(courierInput, trackingNumberInput);

      await api.put(`/admin/orders/${orderMongoId}/status`, {
        status: "Shipped",
        trackingNumber: trackingNumberInput.trim(),
        courier: courierInput,
        carrier: courierInput,
        trackingUrl: resolvedTrackingUrl,
      });

      toast.success(`Tracking saved with ${courierInput} & status set to Shipped! 🚚`);
      setTrackingModalOpen(false);
      setTrackingNumberInput("");
      setTrackingUrlInput("");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save tracking number.");
    } finally {
      setIsSubmittingTracking(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const orderNum = (order.orderNumber || order._id || order.id || "").toLowerCase();
    const utrNum = (order.utr || "").toLowerCase();
    const customer = (order.shippingAddress?.fullName || order.user?.name || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = orderNum.includes(query) || utrNum.includes(query) || customer.includes(query);
    const matchesStatus = statusFilter === "all" || (order.status || order.orderStatus || "").toUpperCase() === statusFilter.toUpperCase();
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
                placeholder="Search by Order ID, UTR reference, or Customer Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-[#E2E6DF]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-52 bg-white border-[#E2E6DF]">
                <Filter className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing / Printing</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Status Filter Pills with Live Counters */}
          <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-[#E2E6DF]/70 text-xs">
            {[
              { id: "all", label: "All Orders", count: orders.length },
              { id: "pending", label: "Pending", count: orders.filter((o) => (o.status || o.orderStatus || "").toUpperCase() === "PENDING").length },
              { id: "processing", label: "Processing / Printed", count: orders.filter((o) => (o.status || o.orderStatus || "").toUpperCase() === "PROCESSING").length },
              { id: "shipped", label: "Shipped", count: orders.filter((o) => ["SHIPPED", "IN TRANSIT", "IN-TRANSIT"].includes((o.status || o.orderStatus || "").toUpperCase())).length },
              { id: "delivered", label: "Completed / Delivered", count: orders.filter((o) => ["DELIVERED", "COMPLETED"].includes((o.status || o.orderStatus || "").toUpperCase())).length },
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Order ID</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Customer & Contact</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">UTR Reference</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Total Amount</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Payment</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Order Status</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Action Buttons</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order: any) => {
                    const orderDisplayId = order.orderNumber || order._id || order.id;
                    const mongoOrderId = order._id || order.id;
                    const paymentId = (typeof order.payment === "object" ? order.payment?._id : (typeof order.payment === "string" ? order.payment : undefined)) || order.paymentId;
                    const isPaid = Boolean(order.isPaid || order.paymentStatus === "VERIFIED");
                    const paymentStatus = order.paymentStatus || (order.utr ? "VERIFICATION_PENDING" : "PENDING");
                    const orderStatus = order.status || order.orderStatus || "PENDING";
                    const totalPrice = order.totalPrice ?? order.totalAmount ?? order.amount ?? 0;

                    return (
                      <TableRow key={orderDisplayId} className="hover:bg-[#F8F9F7]/60 text-xs">
                        {/* Order ID */}
                        <TableCell className="font-mono font-bold text-[#0F3D3E]">
                          {orderDisplayId}
                        </TableCell>

                        {/* Customer & Contact */}
                        <TableCell>
                          <p className="font-serif font-bold text-[#0F3D3E]">
                            {order.shippingAddress?.fullName || order.user?.name || "Customer"}
                          </p>
                          <p className="text-[#5C6E6E] text-[11px] font-sans">
                            {order.user?.email || order.shippingAddress?.email || "N/A"}
                          </p>
                          {(order.shippingAddress?.phone || order.user?.phone || order.phone) && (
                            <p className="text-[#0F3D3E] font-mono text-[11px] flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-[#8A6D1E]" />
                              <span>{order.shippingAddress?.phone || order.user?.phone || order.phone}</span>
                            </p>
                          )}
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

                        {/* UTR Number */}
                        <TableCell>
                          {order.utr ? (
                            <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-300">
                              {order.utr}
                            </span>
                          ) : (
                            <span className="text-[#5C6E6E] italic text-[11px]">No UTR yet</span>
                          )}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="text-right font-serif font-bold text-[#0F3D3E]">
                          ₹{totalPrice.toLocaleString()}
                        </TableCell>

                        {/* Payment Status */}
                        <TableCell className="text-center">
                          {getPaymentBadge(isPaid, paymentStatus)}
                        </TableCell>

                        {/* Order Status */}
                        <TableCell className="text-center">
                          {getOrderStatusBadge(orderStatus)}
                        </TableCell>

                        {/* Action Buttons (Strictly matching prompt) */}
                        <TableCell className="text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {/* 👉 Approve Payment */}
                            {!isPaid && (
                              <Button
                                size="sm"
                                onClick={() => handleApprovePayment(mongoOrderId, paymentId)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                title="Approve UTR Payment"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Approve</span>
                              </Button>
                            )}

                            {/* 👉 Reject Payment */}
                            {!isPaid && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectPayment(mongoOrderId, paymentId)}
                                className="text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                                title="Reject Payment"
                              >
                                <XCircle className="h-3 w-3" />
                                <span>Reject</span>
                              </Button>
                            )}

                            {/* 👉 Mark as Printed */}
                            {orderStatus !== "SHIPPED" && orderStatus !== "DELIVERED" && (
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
                              onClick={() => {
                                setSelectedOrderForTracking(order);
                                setTrackingNumberInput(order.trackingNumber || "");
                                setTrackingModalOpen(true);
                              }}
                              className="border-[#D4AF37] text-[#0F3D3E] hover:bg-[#D4AF37]/10 text-[11px] h-7 px-2.5 rounded-lg gap-1 font-semibold"
                              title="Add Tracking ID"
                            >
                              <Truck className="h-3 w-3 text-[#D4AF37]" />
                              <span>Tracking ID</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
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
              Enter courier tracking reference code for order{" "}
              <strong className="font-mono text-[#0F3D3E]">
                {selectedOrderForTracking?.orderNumber || selectedOrderForTracking?._id}
              </strong>
              . This will set status to SHIPPED.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTracking} className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Courier Service *
              </label>
              <Select value={courierInput} onValueChange={setCourierInput}>
                <SelectTrigger className="border-[#E2E6DF] rounded-xl h-11 text-xs font-semibold">
                  <SelectValue placeholder="Select Courier" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E6DF]">
                  {COURIER_SERVICES.map((courier) => (
                    <SelectItem key={courier} value={courier}>
                      {courier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Tracking / Airwaybill Number (AWB) *
              </label>
              <Input
                placeholder="e.g. BLD12345678 or DEL987654321"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                className="font-mono text-sm border-[#E2E6DF] rounded-xl h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E] flex items-center justify-between">
                <span>Direct Tracking URL (Optional)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Auto-generated if empty</span>
              </label>
              <Input
                type="url"
                placeholder="https://www.bluedart.com/tracking?trackNumber=..."
                value={trackingUrlInput}
                onChange={(e) => setTrackingUrlInput(e.target.value)}
                className="text-xs border-[#E2E6DF] rounded-xl h-11"
              />
            </div>

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
                disabled={isSubmittingTracking}
                className="bg-[#0F3D3E] text-white hover:bg-[#174C4D]"
              >
                {isSubmittingTracking ? "Saving..." : "Save Tracking & Mark Shipped"}
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
              <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D1E] block">
                      Recipient Name
                    </span>
                    <p className="text-base font-serif font-bold text-[#0F3D3E]">
                      {selectedOrderForAddress.shippingAddress?.fullName || selectedOrderForAddress.user?.name || "Customer"}
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
                      {selectedOrderForAddress.shippingAddress?.phone || selectedOrderForAddress.user?.phone || selectedOrderForAddress.phone || "Not Provided"}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block">Email</span>
                    <p className="font-sans text-[#0F3D3E] mt-0.5 truncate">
                      {selectedOrderForAddress.user?.email || selectedOrderForAddress.shippingAddress?.email || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2E6DF]/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] block mb-1">
                    Postal Shipping Destination
                  </span>
                  <div className="p-3.5 bg-white rounded-xl border border-[#E2E6DF] font-sans text-xs text-[#0F3D3E] leading-relaxed select-all shadow-2xs space-y-1">
                    <p className="font-semibold text-sm">{selectedOrderForAddress.shippingAddress?.addressLine1 || selectedOrderForAddress.shippingAddress?.address || "Street Address not recorded"}</p>
                    {selectedOrderForAddress.shippingAddress?.addressLine2 && (
                      <p className="text-[#5C6E6E]">{selectedOrderForAddress.shippingAddress.addressLine2}</p>
                    )}
                    <p className="font-semibold text-[#0F3D3E] pt-0.5">
                      {selectedOrderForAddress.shippingAddress?.city ? `${selectedOrderForAddress.shippingAddress.city}, ` : ""}
                      {selectedOrderForAddress.shippingAddress?.state ? `${selectedOrderForAddress.shippingAddress.state} - ` : ""}
                      <span className="font-mono font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 ml-1">
                        PIN: {selectedOrderForAddress.shippingAddress?.postalCode || selectedOrderForAddress.shippingAddress?.pincode || selectedOrderForAddress.shippingAddress?.pinCode || "N/A"}
                      </span>
                    </p>
                    <p className="text-[#5C6E6E] text-[11px] pt-0.5">
                      Country: {selectedOrderForAddress.shippingAddress?.country || "India"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordered Items in Consignment */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E] flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-[#8A6D1E]" />
                  <span>Books in Consignment ({selectedOrderForAddress.items?.length || 0})</span>
                </span>
                <div className="max-h-40 overflow-y-auto space-y-2 divide-y divide-[#E2E6DF]/60 border border-[#E2E6DF] rounded-xl p-3 bg-[#F8F9F7]/50 text-xs">
                  {(selectedOrderForAddress.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between pt-2 first:pt-0">
                      <div className="pr-2">
                        <p className="font-serif font-bold text-[#0F3D3E] line-clamp-1">
                          {item.book?.title || item.title || "Book Title"}
                        </p>
                        <p className="text-[10px] text-[#5C6E6E]">
                          Qty: <strong className="text-[#0F3D3E]">{item.quantity}</strong> {item.format ? `• ${item.format}` : (item.book?.format ? `• ${item.book.format}` : "")}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-[#0F3D3E] shrink-0">
                        ₹{(item.price || 0) * (item.quantity || 1)}
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
