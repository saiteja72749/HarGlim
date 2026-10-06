"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, ExternalLink, Loader2, Package, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { getSafeExternalUrl } from "@/lib/utils";
import { getShipmentLabel, getTrackingHistory, normalizeShipmentStatus } from "@/lib/tracking";

/**
 * Public order tracking: GET /orders/track/{orderNumber} (no login).
 * Uses the public order number (e.g. HM-0B282DEA), never the courier AWB.
 */

const ORDER_LABELS: Record<string, string> = {
  PENDING: "Payment Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const formatDate = (value?: string, withTime = false) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "";

function TrackOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = (searchParams.get("orderNumber") || "").trim();

  const [input, setInput] = useState(initial);
  const [result, setResult] = useState<any>(null);
  const [state, setState] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");

  const lookup = useCallback(async (orderNumber: string) => {
    const value = orderNumber.trim().toUpperCase();
    if (!value) return;
    setState("loading");
    setResult(null);
    try {
      const { data } = await api.get(`/orders/track/${encodeURIComponent(value)}`, { cache: "no-store" } as any);
      setResult(data?.data || data);
      setState("found");
    } catch (err: any) {
      setState(err?.response?.status === 404 ? "notfound" : "error");
    }
  }, []);

  useEffect(() => {
    if (initial) lookup(initial);
  }, [initial, lookup]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim().toUpperCase();
    if (!value) return;
    // Keep the order number in the URL so the page can be bookmarked or shared.
    router.replace(`/track-order?orderNumber=${encodeURIComponent(value)}`);
    lookup(value);
  };

  const trackingUrl = getSafeExternalUrl(result?.trackingUrl);
  const history = result ? getTrackingHistory(result) : [];
  const shipmentStatus = result?.shipmentStatus ? normalizeShipmentStatus(result.shipmentStatus) : "";
  const delivered = ["DELIVERED", "COMPLETED"].includes(shipmentStatus) || String(result?.status).toUpperCase() === "DELIVERED";
  const items: any[] = Array.isArray(result?.items) ? result.items : [];

  return (
    <div className="bg-[#F8F9F7] min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">Track Your Order</h1>
          <p className="text-sm text-[#5C6E6E] mt-1">
            Enter the order number from your confirmation (for example HM-0B282DEA). This is not the courier tracking number.
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <label htmlFor="order-number" className="sr-only">Order number</label>
            <Input
              id="order-number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="HM-XXXXXXXX"
              className="pl-9 h-11 bg-white font-mono uppercase"
              autoComplete="off"
            />
          </div>
          <Button type="submit" disabled={state === "loading" || !input.trim()} className="h-11 bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-2">
            {state === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
            Track
          </Button>
        </form>

        {state === "notfound" && (
          <div className="rounded-2xl border border-[#E2E6DF] bg-white p-6 text-sm text-[#5C6E6E]">
            We couldn&apos;t find an order with that number. Check it against your order confirmation, or sign in to see{" "}
            <Link href="/dashboard/orders" className="underline text-[#0F3D3E] font-semibold">My Orders</Link>.
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800 flex items-center justify-between gap-3">
            <span>Tracking is temporarily unavailable. Please try again.</span>
            <Button variant="outline" size="sm" onClick={() => lookup(input)}>Retry</Button>
          </div>
        )}

        {state === "found" && result && (
          <div className="rounded-2xl border border-[#E2E6DF] bg-white overflow-hidden">
            <div className="p-5 sm:p-6 bg-[#F8F9F7] border-b border-[#E2E6DF] flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-[#5C6E6E]">Order</p>
                <p className="font-mono font-bold text-lg text-[#0F3D3E]">{result.orderNumber}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-white">
                  {ORDER_LABELS[String(result.status || "").toUpperCase()] || result.status || "—"}
                </Badge>
                {result.paymentStatus && (
                  <Badge variant="outline" className="bg-white">
                    Payment: {String(result.paymentStatus).replace(/_/g, " ").toLowerCase()}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Shipment summary */}
              {result.trackingNumber || shipmentStatus ? (
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-xs text-[#5C6E6E]">Shipment status</p>
                    <p className="font-semibold text-[#0F3D3E] flex items-center gap-1.5">
                      {delivered ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Truck className="h-4 w-4" />}
                      {shipmentStatus ? getShipmentLabel(shipmentStatus) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6E6E]">Courier</p>
                    <p className="font-semibold text-[#0F3D3E]">{result.courierName || "To be assigned"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6E6E]">Tracking number</p>
                    <p className="font-mono font-semibold text-[#0F3D3E] select-all">{result.trackingNumber || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#5C6E6E]">{delivered ? "Delivered" : "Estimated delivery"}</p>
                    <p className="font-semibold text-[#0F3D3E]">{formatDate(result.estimatedDelivery) || "—"}</p>
                  </div>
                  {trackingUrl && (
                    <div className="sm:col-span-2">
                      <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                        <Button className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] gap-2">
                          Track with courier
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-[#E2E6DF] p-4 text-sm text-[#5C6E6E]">
                  <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#0F3D3E]">Preparing your shipment</p>
                    <p>Tracking information will be available after payment verification.</p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {history.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-3">Tracking history</p>
                  <ol className="relative border-l-2 border-[#0F3D3E]/15 ml-2 space-y-4">
                    {[...history].reverse().map((event, i) => (
                      <li key={`${event.status}-${event.occurredAt}-${i}`} className="ml-4">
                        <span className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full border-2 border-white ${i === 0 ? "bg-[#0F3D3E]" : "bg-[#0F3D3E]/30"}`} />
                        <p className="text-sm font-semibold text-[#0F3D3E]">
                          {getShipmentLabel(event.status)}
                          {event.location && <span className="font-normal text-[#5C6E6E]"> · {event.location}</span>}
                        </p>
                        {event.description && <p className="text-xs text-[#5C6E6E]">{event.description}</p>}
                        {event.occurredAt && <p className="text-[11px] text-[#5C6E6E]">{formatDate(event.occurredAt, true)}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Ordered books */}
              {items.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-3">Books in this order</p>
                  <ul className="divide-y divide-[#E2E6DF] border border-[#E2E6DF] rounded-xl">
                    {items.map((item, i) => {
                      const book = item.book && typeof item.book === "object" ? item.book : null;
                      return (
                        <li key={item._id || i} className="flex items-center gap-3 p-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={book?.coverImage || "/placeholder-book.svg"} alt="" className="h-12 w-9 rounded object-cover border border-[#E2E6DF]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0F3D3E] truncate">
                              {book?.title ?? item.title ?? "Book no longer available"}
                            </p>
                            <p className="text-xs text-[#5C6E6E]">Qty {item.quantity || 1}</p>
                          </div>
                          <Package className="h-4 w-4 text-[#5C6E6E]" />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
