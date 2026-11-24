"use client";
import type { OrderRecord } from "@/types/commerce-api";
import { describeApiError } from "@/lib/api-error";


import { useEffect, useState } from "react";
import Image from '@/components/ui/backend-image';
import Link from "next/link";
import { Package, Truck, Clock, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import { extractList } from "@/lib/tracking";
import {
  FULFILMENT_META,
  PAYMENT_STATE_META,
  getFulfilmentStage,
  getOrderTotal, populated,
  getPaymentState,
} from "@/lib/order-status";

export function RecentOrdersSection() {
  const { user } = useAuthStore();
  const userId = user?._id || user?.id;
  const [result, setResult] = useState<{ userId: string; orders: OrderRecord[] }>();
  const orders = result?.userId === userId ? result?.orders : undefined;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    const fetchOrders = async () => {
      try {
        // /users/{id}/orders is the documented route; "me" is not an id.
        const { data } = await api.get(`/users/${userId}/orders`, { params: { limit: 20 }, signal: controller.signal });
        const ordersData = extractList<OrderRecord>(data, "orders").sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        if (!controller.signal.aborted) setResult({ userId, orders: ordersData.slice(0, 3) });
      } catch (err) {
        if (!controller.signal.aborted) console.error("Failed to load user orders for recent orders section:", describeApiError(err));
      }
    };

    void fetchOrders();
    return () => controller.abort();
  }, [userId]);

  if (!orders?.length) {
    return null;
  }

  const getStatusBadge = (order: OrderRecord) => {
    const payment = getPaymentState(order);
    const stage = getFulfilmentStage(order);
    const meta = payment === "paid" || stage === "cancelled" ? FULFILMENT_META[stage] : PAYMENT_STATE_META[payment];
    const Icon = stage === "shipped" ? Truck : stage === "delivered" ? CheckCircle2 : payment === "paid" ? Package : Clock;
    return (
      <Badge className={`${meta.tone} font-semibold flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        <span>{meta.label}</span>
      </Badge>
    );
  };

  return (
    <div className="w-full mt-10 space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold font-serif text-foreground">
            Your Recent Orders & Active Shipments
          </h2>
        </div>
        <Link
          href="/dashboard/orders"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <span>View All Orders</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
        {orders.map((order) => {
          const orderId = order._id || order.id;
          const orderNo = order.orderNumber || orderId;
          const orderDate = order.createdAt || order.date;
          const items = order.items || [];

          return (
            <div
              key={orderId}
              className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/30 space-y-4"
            >
              {/* Order Header Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Order #</span>
                  <span className="font-bold text-foreground block font-mono">
                    {orderNo}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Placed On</span>
                  <p className="font-medium text-foreground">
                    {orderDate ? new Date(orderDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) : "Recent"}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Total</span>
                  <p className="font-bold text-foreground">
                    ₹{getOrderTotal(order).toLocaleString("en-IN")}
                  </p>
                </div>

                <div>{getStatusBadge(order)}</div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3">
                {items.slice(0, 2).map((item, idx) => {
                  const bookObj = populated(item.book) || {};
                  const title = bookObj.title || item.title || "Book";
                  const cover = bookObj.coverImage || "/logo.png";
                  const slug = bookObj.slug;

                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-muted">
                        <Image
                          src={cover}
                          alt={title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        {slug ? (
                          <Link
                            href={`/books/${slug}`}
                            className="text-xs font-semibold text-foreground hover:text-primary truncate block"
                          >
                            {title}
                          </Link>
                        ) : (
                          <p className="text-xs font-semibold text-foreground truncate">
                            {title}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          Qty: {item.quantity || 1} • ₹{(item.price || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {items.length > 2 && (
                  <p className="text-[11px] text-muted-foreground italic">
                    +{items.length - 2} more item(s) in this order
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between border-t border-border/40 gap-2">
                <Button
                    size="sm"
                    className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 h-8"
                   asChild><Link href="/dashboard/orders">
                    <Truck className="h-3.5 w-3.5" />
                    <span>View Shipment</span>
                  </Link></Button>

                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground h-8"
                   asChild><Link href="/dashboard/orders">
                    <span>Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link></Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
