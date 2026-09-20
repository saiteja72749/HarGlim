"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";

const resolveCarrierDirectUrl = (courier: string, trackingNumber: string, customUrl?: string | null) => {
  if (customUrl && (customUrl.startsWith("http://") || customUrl.startsWith("https://"))) {
    return customUrl;
  }
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

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || searchParams.get("orderId") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAwb(true);
    toast.success("Tracking ID copied to clipboard! 📋");
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const executeTrack = async (targetOrderNo: string) => {
    if (!targetOrderNo.trim()) return;
    setIsLoading(true);

    try {
      const cleanNum = targetOrderNo.trim();
      const { data } = await api.get(`/orders/track/${encodeURIComponent(cleanNum)}`).catch(() =>
        api.get(`/orders/${encodeURIComponent(cleanNum)}`)
      );
      const orderData = data?.data || data;
      const tNum = orderData.tracking_id || orderData.trackingId || orderData.trackingNumber || orderData.awbNumber || null;
      const cName = orderData.courier_name || orderData.courierName || orderData.courier || orderData.carrier || "";
      const tUrl = orderData.tracking_url || orderData.trackingUrl || (tNum ? resolveCarrierDirectUrl(cName, tNum, null) : null);

      setTrackedOrder({
        orderNumber: orderData.orderNumber || orderData._id || orderData.id,
        orderDate: orderData.createdAt || orderData.date,
        status: orderData.orderStatus || orderData.status || "Order Placed",
        expectedDelivery: orderData.expectedDelivery || null,
        trackingNumber: tNum,
        courier: cName || "Postal Courier",
        trackingUrl: tUrl,
        items: (orderData.items || []).map((item: any) => ({
          name: item.book?.title || item.title || "Book",
          quantity: item.quantity,
          price: `₹${item.price || item.book?.price || 0}`
        })),
        totalPrice: `₹${orderData.totalAmount || orderData.totalPrice || orderData.total || 0}`,
        shippingAddress: orderData.shippingAddress || null,
      });
    } catch (error: any) {
      console.error("Failed to track order:", error);
      setTrackedOrder({
        error: error?.response?.data?.message || "Order not found. Please check your order number.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber) {
      executeTrack(initialOrderNumber);
    }
  }, [initialOrderNumber]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    executeTrack(orderNumber);
  };

  const getStatusIcon = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("deliver")) {
      return <CheckCircle className="h-6 w-6 text-emerald-600" />;
    }
    if (s.includes("ship") || s.includes("transit")) {
      return <Truck className="h-6 w-6 text-blue-600" />;
    }
    if (s.includes("print")) {
      return <Package className="h-6 w-6 text-amber-600" />;
    }
    return <Clock className="h-6 w-6 text-muted-foreground" />;
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("deliver")) {
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-950";
    }
    if (s.includes("ship") || s.includes("transit")) {
      return "bg-blue-500/10 border-blue-500/30 text-blue-950";
    }
    if (s.includes("print")) {
      return "bg-amber-500/10 border-amber-500/30 text-amber-950";
    }
    return "bg-muted/30 border-border text-foreground";
  };

  const getStatusText = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("deliver")) {
      return "Delivered";
    }
    if (s.includes("ship") || s.includes("transit")) {
      return "Shipped";
    }
    if (s.includes("print")) {
      return "Printed";
    }
    if (s.includes("cancel") || s.includes("reject")) {
      return "Cancelled";
    }
    return "Order Placed";
  };

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-t from-primary/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Track Your Order
            </h1>
            <p className="text-xl text-primary-foreground/90">
              Enter your order number to check order status and external courier tracking.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Track Order Form */}
      <section className="py-20 bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-card rounded-2xl border border-border p-8 shadow-lg"
          >
            <form onSubmit={handleTrack} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-3">
                  Order Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., HG123456"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button
                    type="submit"
                    disabled={isLoading || !orderNumber}
                    className="bg-primary hover:bg-primary/90 text-white px-8"
                  >
                    {isLoading ? "Tracking..." : "Track"}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Order Details */}
          {trackedOrder && !trackedOrder.error && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="mt-12 space-y-8"
            >
              {/* Order Header */}
              <div
                className={`rounded-2xl border-2 p-8 ${getStatusColor(trackedOrder.status)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-1 font-serif">
                      Order #{trackedOrder.orderNumber}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Placed on{" "}
                      {trackedOrder.orderDate ? new Date(trackedOrder.orderDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      }) : "Recent"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-lg font-bold text-foreground mb-1">
                      {getStatusIcon(trackedOrder.status)}
                      <span>{getStatusText(trackedOrder.status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courier Shipment Tracking Card */}
              <div className="bg-card rounded-2xl border-2 border-primary/20 p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-serif text-foreground">
                        Shipment & Tracking
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Courier Partner: <strong className="text-foreground">{trackedOrder.courier || "To be assigned"}</strong>
                      </p>
                    </div>
                  </div>

                  {trackedOrder.trackingNumber && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(trackedOrder.trackingNumber)}
                      className="gap-1.5 text-xs font-mono font-bold"
                    >
                      {copiedAwb ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedAwb ? "Copied" : "Copy Tracking ID"}</span>
                    </Button>
                  )}
                </div>

                {/* CASE 1: Tracking URL Available -> Button "Track Package" */}
                {trackedOrder.trackingUrl ? (
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-primary/10 border-2 border-primary/30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Direct Courier Tracking Link
                      </span>
                      <p className="text-sm text-muted-foreground">
                        Your package has been dispatched via <strong className="text-foreground">{trackedOrder.courier}</strong>. Click below to view live external tracking.
                      </p>
                      {trackedOrder.trackingNumber && (
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          Tracking ID: <span className="font-bold text-foreground">{trackedOrder.trackingNumber}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      <a
                        href={trackedOrder.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold h-11 px-6 rounded-xl shadow-xs transition-all"
                      >
                        <Truck className="h-4 w-4" />
                        <span>Track Package</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ) : trackedOrder.trackingNumber ? (
                  /* CASE 2: Only Tracking ID Available -> ID + Instruction Message */
                  <div className="p-6 rounded-2xl bg-muted/40 border border-border space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Courier Consignment Tracking ID
                        </span>
                        <span className="font-mono text-xl font-bold text-foreground select-all mt-1 block">
                          {trackedOrder.trackingNumber}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(trackedOrder.trackingNumber)}
                        className="gap-1.5 text-xs font-mono font-bold"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Tracking ID</span>
                      </Button>
                    </div>
                    <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                      <span>Use this tracking ID on the courier website to track your order.</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <h4 className="font-bold text-sm font-serif">
                        {getStatusText(trackedOrder.status) === "Printed" ? "Book Physically Printed" : "Order Placed"}
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-sans">
                      {getStatusText(trackedOrder.status) === "Printed"
                        ? "Your book has been printed physically. Parcel post dispatch with courier tracking will be generated shortly."
                        : "Your order is confirmed and placed. Physical printing is being scheduled."}
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4 font-serif">
                  Order Items ({trackedOrder.items.length})
                </h3>
                <div className="space-y-3">
                  {trackedOrder.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between pb-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {item.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold text-foreground">
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-border flex justify-between">
                  <span className="font-bold text-foreground">Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    {trackedOrder.totalPrice}
                  </span>
                </div>
              </div>

              {/* Shipping Address */}
              {trackedOrder.shippingAddress && (
                <div className="bg-card rounded-xl border border-border p-6 space-y-2">
                  <h3 className="text-xl font-bold text-foreground mb-3 font-serif flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <span>Delivery Address</span>
                  </h3>
                  <div className="text-sm text-foreground space-y-1 font-sans">
                    <p className="font-bold">
                      {trackedOrder.shippingAddress.fullName || trackedOrder.shippingAddress.name || "Customer"}
                    </p>
                    {trackedOrder.shippingAddress.phone && (
                      <p className="text-muted-foreground">
                        Phone: {trackedOrder.shippingAddress.phone}
                      </p>
                    )}
                    <p>
                      {trackedOrder.shippingAddress.addressLine1 || trackedOrder.shippingAddress.street || trackedOrder.shippingAddress.address}
                    </p>
                    {trackedOrder.shippingAddress.addressLine2 && (
                      <p>{trackedOrder.shippingAddress.addressLine2}</p>
                    )}
                    <p className="font-medium">
                      {[
                        trackedOrder.shippingAddress.city,
                        trackedOrder.shippingAddress.state,
                        trackedOrder.shippingAddress.postalCode || trackedOrder.shippingAddress.pincode
                      ].filter(Boolean).join(", ")}
                    </p>
                    <p className="text-muted-foreground">
                      {trackedOrder.shippingAddress.country || "India"}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Error Message */}
          {trackedOrder?.error && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="mt-8 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-900/50 rounded-xl p-6 flex gap-4"
            >
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-red-900 dark:text-red-100 mb-2">
                  Order Not Found
                </h3>
                <p className="text-red-800 dark:text-red-200 mb-4">
                  {trackedOrder.error}
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Please check the order number on your confirmation email. If
                  you still can&apos;t find your order,{" "}
                  <Link
                    href="/contact"
                    className="underline font-semibold hover:no-underline"
                  >
                    contact our support team.
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Help Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center"
          >
            <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
              Need Help?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Can&apos;t find your order number? Check your confirmation email or
              contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Contact Support
                </Button>
              </Link>
              <Link href="/faq">
                <Button size="lg" variant="outline">
                  View FAQ
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-muted-foreground">Loading tracking...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
