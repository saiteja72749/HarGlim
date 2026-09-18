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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import api from "@/lib/api";
import toast from "react-hot-toast";

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
    toast.success("Consignment / Tracking ID copied to clipboard! 📋");
    setTimeout(() => setCopiedAwb(false), 2000);
  };

  const executeTrack = async (targetOrderNo: string) => {
    if (!targetOrderNo.trim()) return;
    setIsLoading(true);

    try {
      const { data } = await api.get(`/orders/track/${targetOrderNo.trim().toUpperCase()}`);
      const orderData = data.data || data;
      setTrackedOrder({
        orderNumber: orderData.orderNumber || orderData.id,
        orderDate: orderData.createdAt || orderData.date,
        status: orderData.orderStatus || orderData.status,
        expectedDelivery: orderData.expectedDelivery || null,
        trackingNumber: orderData.trackingNumber || orderData.awbNumber || orderData.trackingId || null,
        courier: orderData.courier || orderData.courierName || orderData.carrier || "India Post",
        trackingUrl: orderData.trackingUrl || null,
        items: (orderData.items || []).map((item: any) => ({
          name: item.book?.title || item.title || "Book",
          quantity: item.quantity,
          price: `₹${item.price}`
        })),
        totalPrice: `₹${orderData.totalAmount || orderData.total}`,
        shippingAddress: orderData.shippingAddress ? `${orderData.shippingAddress.name || orderData.shippingAddress.fullName || ""}, ${orderData.shippingAddress.addressLine1 || orderData.shippingAddress.address || ""}, ${orderData.shippingAddress.city || ""}` : "Address not available",
        trackingUpdates: orderData.timeline || [
          { status: "Order Placed", date: orderData.createdAt, description: "Your order has been placed." },
          { status: orderData.orderStatus || orderData.status, date: new Date().toISOString(), description: `Order is currently ${orderData.orderStatus || orderData.status}` }
        ]
      });
    } catch (error) {
      console.error("Failed to track order:", error);
      setTrackedOrder({
        error: "Order not found. Please check your order number.",
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
    switch (s) {
      case "delivered":
      case "completed":
        return <CheckCircle className="h-6 w-6 text-emerald-600" />;
      case "shipped":
      case "in-transit":
      case "in transit":
        return <Truck className="h-6 w-6 text-blue-600" />;
      case "processing":
        return <Package className="h-6 w-6 text-amber-600" />;
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "delivered":
      case "completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-950";
      case "in-transit":
      case "shipped":
      case "in transit":
        return "bg-blue-500/10 border-blue-500/30 text-blue-950";
      case "processing":
        return "bg-amber-500/10 border-amber-500/30 text-amber-950";
      default:
        return "bg-muted/30 border-border text-foreground";
    }
  };

  const getStatusText = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "delivered":
      case "completed":
        return "Delivered";
      case "in-transit":
      case "shipped":
      case "in transit":
        return "Shipped / In Transit";
      case "processing":
        return "Processing / Printed";
      case "order placed":
      case "pending":
        return "Order Placed";
      case "cancelled":
        return "Cancelled";
      default:
        return status || "Order Placed";
    }
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
              Enter your order number to get real-time updates.
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
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                      Order {trackedOrder.orderNumber}
                    </h2>
                    <p className="text-muted-foreground">
                      Ordered on{" "}
                      {new Date(trackedOrder.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-2 text-lg font-semibold text-foreground mb-1">
                      {getStatusIcon(trackedOrder.status)}
                      <span>{getStatusText(trackedOrder.status)}</span>
                    </div>
                    {trackedOrder.expectedDelivery && (
                      <p className="text-sm text-muted-foreground">
                        Expected:{" "}
                        {new Date(
                          trackedOrder.expectedDelivery,
                        ).toLocaleDateString()}
                      </p>
                    )}
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
                        Courier Shipment & Tracking
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Courier: <strong className="text-foreground">{trackedOrder.courier || "India Post"}</strong>
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
                      <span>{copiedAwb ? "Copied" : "Copy Consignment ID"}</span>
                    </Button>
                  )}
                </div>

                {trackedOrder.trackingNumber ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Consignment / AWB Tracking Number
                        </span>
                        <span className="font-mono text-xl sm:text-2xl font-bold text-foreground tracking-wider select-all">
                          {trackedOrder.trackingNumber}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(trackedOrder.trackingNumber)}
                        className="bg-primary text-primary-foreground gap-1.5 shrink-0 font-medium"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Code</span>
                      </Button>
                    </div>

                    {/* Direct Tracking Portal Actions */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Track with Carrier Portal:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <a
                          href={trackedOrder.trackingUrl || `https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all font-semibold text-xs text-primary"
                        >
                          <span className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <span>Track on India Post (Consignment)</span>
                          </span>
                          <ExternalLink className="h-4 w-4" />
                        </a>

                        <a
                          href={`https://www.delhivery.com/tracking`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all font-semibold text-xs text-foreground"
                        >
                          <span className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            <span>Track on Delhivery</span>
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">Other Courier Websites:</span>
                        <a href="https://www.bluedart.com/tracking" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Blue Dart</a>
                        <span>•</span>
                        <a href="https://www.dtdc.in/tracking.asp" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">DTDC</a>
                        <span>•</span>
                        <a href="https://www.shiprocket.in/shipment-tracking/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Shiprocket</a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600" />
                      <h4 className="font-bold text-sm font-serif">Order In Preparation</h4>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-sans">
                      Your order is registered and being printed/prepared by our publishing team. Your India Post / Courier consignment tracking code will be generated and shown here as soon as the package is dispatched.
                    </p>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Order Items
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
                  <span className="text-2xl font-bold text-secondary">
                    {trackedOrder.totalPrice}
                  </span>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Shipping Address
                </h3>
                <p className="text-muted-foreground">
                  {trackedOrder.shippingAddress}
                </p>
              </div>
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
