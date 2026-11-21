"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, Copy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ErrorState } from "@/components/ui/error-state";
import { getPaymentState, getPaymentOrderId, PAYMENT_STATE_META } from "@/lib/order-status";
import { extractList } from '@/lib/tracking';
import { useAuthStore } from '@/store/auth-store';

interface OrderReceipt {
  _id: string;
  orderNumber: string;
  isPaid?: boolean;
  utr?: string;
  paymentStatus?: string;
  payment?: { status?: string } | string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const recordId = searchParams?.get("orderId") || "";
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);
  const [order, setOrder] = useState<OrderReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      if (!/^[a-f0-9]{24}$/i.test(recordId)) throw new Error('An order ID is required.');
      if (!userId) throw new Error('Sign in to view your order.');
      const [orders, payments] = await Promise.all([
        api.get(`/users/${userId}/orders`, { params: { limit: 100 }, cache: 'no-store' }),
        api.get(`/users/${userId}/payments`, { params: { limit: 100 }, cache: 'no-store' }),
      ]);
      const receipt = extractList<OrderReceipt>(orders.data, 'orders').find((candidate: OrderReceipt) => candidate._id === recordId);
      if (!receipt?._id || !receipt.orderNumber) throw new Error('Order details are unavailable.');
      const payment = extractList(payments.data, 'payments').find((candidate) => getPaymentOrderId(candidate) === recordId);
      setOrder({ ...receipt, payment: payment || receipt.payment });
    } catch { setError(true); setOrder(null); }
    finally { setLoading(false); }
  }, [recordId, userId]);
  useEffect(() => { void loadOrder(); }, [loadOrder]);

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard!'); }
    catch { toast.error('Could not copy. Please select and copy the value.'); }
  };
  if (loading) return <div role="status" className="min-h-screen flex items-center justify-center">Loading order details...</div>;
  if (error || !order) return <div className="max-w-3xl mx-auto py-16 px-4"><ErrorState title="Order details unavailable" message="Open My Orders to find your order, or retry loading its confirmed details." onRetry={loadOrder} /><Link href="/dashboard/orders">View My Orders</Link></div>;
  const orderId = order.orderNumber;
  const utrRef = order.utr || '';
  const paymentState = getPaymentState(order);
  const status = PAYMENT_STATE_META[paymentState];

  return (
    <div className="bg-background min-h-screen py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-6">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">Order Details</h1>
        <p className="mt-3 text-sm text-[#5C6E6E] max-w-xl mx-auto font-sans leading-relaxed">
          Your order information and payment status below come from your account.
        </p>

        <div className="mt-8 max-w-md mx-auto bg-card border border-border rounded-2xl p-6 text-left shadow-sm space-y-4">
          <h3 className="font-serif font-bold text-base border-b pb-3 text-[#0F3D3E]">Order Details & Payment Status</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] mb-1">Order Number</p>
              <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border/50">
                <span className="font-mono font-bold text-sm text-[#0F3D3E]">{orderId || "See My Orders"}</span>
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
              <p className="font-bold">Payment Status: {status.label}</p>
              <p className="text-[11px] text-amber-700 leading-relaxed font-sans">
                Your order is registered under <strong>Order Number {orderId || "(see My Orders)"}</strong>. Shipment tracking details will be assigned by admin after payment approval & dispatch.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Button size="lg" className="w-full sm:w-auto flex items-center gap-2 bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold" asChild><Link href="/dashboard/orders">
              <Package className="h-4 w-4" />
              View in My Orders
            </Link></Button>
          <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto flex items-center justify-center gap-2"
             asChild><Link href="/books">
              Continue Shopping
            </Link></Button>
          {orderId && (
            <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-[#5C6E6E]"
               asChild><Link href={`/track-order?orderNumber=${encodeURIComponent(orderId)}`}>
                Track this order
                <ArrowRight className="h-4 w-4" />
              </Link></Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <AuthGuard><Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense></AuthGuard>
  );
}
