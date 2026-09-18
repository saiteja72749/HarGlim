"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, Copy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useCartStore } from "@/store/cart-store";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("orderId") || `ORD-${Date.now().toString().slice(-6)}`;
  const [_copied, setCopied] = useState(false);
  const clearCart = useCartStore((state) => state.clearCart);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const utrRef = searchParams?.get("utr") || "";

  return (
    <div className="bg-background min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-6">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">Order Submitted Successfully!</h1>
        <p className="mt-3 text-sm text-[#5C6E6E] max-w-xl mx-auto font-sans leading-relaxed">
          Thank you for your purchase! Your order has been registered and your payment UTR has been submitted for admin verification.
        </p>

        <div className="mt-8 max-w-md mx-auto bg-card border border-border rounded-2xl p-6 text-left shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base border-b pb-3 text-[#0F3D3E]">Order Details & Payment Status</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-1">Order Number</p>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border/50">
                <span className="font-mono font-bold text-sm text-[#0F3D3E]">{orderId}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(orderId)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {utrRef && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-1">Submitted UTR Reference</p>
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border/50">
                  <span className="font-mono font-bold text-xs text-[#0F3D3E]">{utrRef}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(utrRef)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 space-y-1">
              <p className="font-bold">Payment Status: Pending Admin Verification</p>
              <p className="text-[11px] text-amber-700 leading-relaxed font-sans">
                Your order is registered under <strong>Order Number {orderId}</strong>. Shipment tracking details will be assigned by admin after payment approval & dispatch.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link href={`/track-order?orderNumber=${encodeURIComponent(orderId)}`}>
            <Button size="lg" className="w-full sm:w-auto flex items-center gap-2 bg-[#0F3D3E] hover:bg-[#174C4D] text-white">
              <Package className="h-4 w-4" />
              Track Order & Courier
            </Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              My Orders
            </Button>
          </Link>
          <Link href="/books">
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto flex items-center justify-center gap-2 text-[#5C6E6E]"
            >
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
