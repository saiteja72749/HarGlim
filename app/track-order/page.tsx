"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Truck,
  Copy,
  Check,
  Search,
  AlertCircle,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import toast from "react-hot-toast";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderNumber = searchParams.get("orderNumber") || searchParams.get("orderId") || "";

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAwb, setCopiedAwb] = useState(false);

  const copyToClipboard = (text: string) => {
    if (!text) return;
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
      const tNum =
        orderData.tracking_id ||
        orderData.trackingId ||
        orderData.trackingNumber ||
        orderData.awbNumber ||
        null;
      const cName =
        orderData.courier_name ||
        orderData.courierName ||
        orderData.courier ||
        orderData.carrier ||
        "";

      setTrackedOrder({
        orderNumber: orderData.orderNumber || orderData._id || orderData.id,
        trackingNumber: tNum,
        courier: cName || "Postal / Express Courier",
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

  return (
    <div className="min-h-[75vh] bg-[#F8F9F7] py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F3D3E] text-[#D4AF37] shadow-sm mb-2">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            Track Shipment
          </h1>
          <p className="text-sm text-[#5C6E6E] font-sans">
            Enter your Order ID to get your courier partner and tracking number.
          </p>
        </div>

        {/* Minimal Search Input */}
        <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl">
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleTrack} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                <input
                  type="text"
                  placeholder="Enter Order ID (e.g. HG-1002)"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E2E6DF] bg-white text-[#0F3D3E] font-mono text-sm placeholder:text-[#5C6E6E]/60 focus:outline-none focus:ring-2 focus:ring-[#0F3D3E]/20"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !orderNumber.trim()}
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold px-6 h-10 rounded-xl cursor-pointer shrink-0"
              >
                {isLoading ? "Searching..." : "Track"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Minimal Result Display (Only Courier Name & Tracking ID) */}
        {trackedOrder && !trackedOrder.error && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white border border-[#E2E6DF] shadow-md rounded-2xl overflow-hidden">
              <div className="bg-[#0F3D3E] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-semibold block">
                    Shipment Details
                  </span>
                  <h2 className="text-lg font-mono font-bold">
                    Order #{trackedOrder.orderNumber}
                  </h2>
                </div>
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center text-[#D4AF37]">
                  <Package className="h-5 w-5" />
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* 1. Courier Name */}
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Courier Partner
                  </span>
                  <p className="text-xl font-serif font-bold text-[#0F3D3E]">
                    {trackedOrder.courier}
                  </p>
                </div>

                {/* 2. Tracking ID */}
                <div className="space-y-2 pt-4 border-t border-[#E2E6DF]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Tracking ID / Consignment No.
                  </span>

                  {trackedOrder.trackingNumber ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF]">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-[#0F3D3E] select-all tracking-wider break-all">
                        {trackedOrder.trackingNumber}
                      </span>
                      <Button
                        type="button"
                        onClick={() => copyToClipboard(trackedOrder.trackingNumber)}
                        className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white text-xs font-semibold gap-2 h-9 px-4 rounded-xl cursor-pointer shrink-0"
                      >
                        {copiedAwb ? (
                          <Check className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        <span>{copiedAwb ? "Copied" : "Copy Tracking ID"}</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-sans">
                      <p className="font-semibold">Tracking ID Pending</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Your parcel is being packaged. A tracking ID will appear here as soon as the courier partner scans your consignment.
                      </p>
                    </div>
                  )}
                </div>

                {/* Simple manual check note */}
                {trackedOrder.trackingNumber && (
                  <div className="pt-2 text-center">
                    <p className="text-xs text-[#5C6E6E] leading-relaxed">
                      Copy your tracking ID above and paste it into the official website of{" "}
                      <strong className="text-[#0F3D3E]">{trackedOrder.courier}</strong> to check live delivery transit updates.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error State */}
        {trackedOrder?.error && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3.5"
          >
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm">Order Not Found</h3>
              <p className="text-xs text-rose-800">
                {trackedOrder.error}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-[#5C6E6E]">Loading tracking...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
