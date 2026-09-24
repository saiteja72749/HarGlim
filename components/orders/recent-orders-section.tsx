"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Package, Truck, Clock, CheckCircle2, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";

export function RecentOrdersSection() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id && !user?.id) {
      setLoading(false);
      return;
    }

    async function fetchOrders() {
      try {
        const { data } = await api.get("/users/me/orders");
        const ordersData = data?.data?.orders || data?.orders || data?.data || data || [];
        if (Array.isArray(ordersData)) {
          setOrders(ordersData.slice(0, 3)); // show top 3 recent orders
        }
      } catch (err) {
        console.error("Failed to load user orders for recent orders section:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  if (!user || loading || !orders.length) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "SHIPPED" || s === "IN TRANSIT") {
      return (
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 font-semibold flex items-center gap-1">
          <Truck className="h-3 w-3 text-blue-600" />
          <span>In Transit / Shipped</span>
        </Badge>
      );
    }
    if (s === "DELIVERED" || s === "COMPLETED") {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          <span>Delivered</span>
        </Badge>
      );
    }
    if (s === "PROCESSING") {
      return (
        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold flex items-center gap-1">
          <Package className="h-3 w-3 text-amber-600" />
          <span>Processing</span>
        </Badge>
      );
    }
    return (
      <Badge className="bg-muted text-muted-foreground font-medium flex items-center gap-1">
        <Clock className="h-3 w-3" />
        <span>{status || "Order Placed"}</span>
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
          const status = order.orderStatus || order.status || "PROCESSING";

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
                    ₹{(order.totalAmount || order.total || 0).toLocaleString()}
                  </p>
                </div>

                <div>{getStatusBadge(status)}</div>
              </div>

              {/* Order Items List */}
              <div className="space-y-3">
                {items.slice(0, 2).map((item: any, idx: number) => {
                  const bookObj = item.book || {};
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
                <Link href="/dashboard/orders">
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 h-8"
                  >
                    <Truck className="h-3.5 w-3.5" />
                    <span>View Shipment</span>
                  </Button>
                </Link>

                <Link href="/dashboard/orders">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground h-8"
                  >
                    <span>Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
