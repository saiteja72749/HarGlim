"use client";

import Image from '@/components/ui/backend-image';
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import type { CartItem } from "@/types";
import { getCartUnitPrice, publishedNumber } from "@/lib/book-presentation";
import { useHydration } from "@/hooks/useHydration";

import { RecentOrdersSection } from "@/components/orders/recent-orders-section";

function CartItemRow({ item }: { item: CartItem }) {
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const price = getCartUnitPrice(item.book);
  const stock = publishedNumber(item.book.stock);
  const available = stock === null ? Infinity : Math.max(0, stock - (publishedNumber(item.book.reservedStock) ?? 0));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <Image
            src={item.book.coverImage}
            alt={item.book.title}
            width={80}
            height={112}
            className="h-28 w-20 shrink-0 rounded-md object-contain"
          />
          <div className="min-w-0 [overflow-wrap:anywhere]">
            <Link
              href={`/books/${item.book.slug || item.book._id}`}
              className="text-lg font-semibold hover:text-primary"
            >
              {item.book.title}
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              {item.book.author && typeof item.book.author === "object"
                ? item.book.author.name
                : item.book.author}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              {item.book.format && <span className="rounded-full bg-muted px-3 py-1 text-foreground">
                {item.book.format}
              </span>}
              <span className="font-semibold">{price === null ? "Price unavailable" : `₹${price.toLocaleString("en-IN")} each`}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-right lg:items-end">
          <div className="flex items-center justify-end gap-2 rounded-full border border-border bg-background px-3 py-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Decrease quantity of ${item.book.title}`}
              disabled={item.quantity <= 1}
              onClick={() => updateQuantity(item.book._id, item.quantity - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span aria-live="polite" className="min-w-[2rem] text-center font-semibold">
              {item.quantity}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Increase quantity of ${item.book.title}`}
              disabled={item.quantity >= available}
              onClick={() => updateQuantity(item.book._id, item.quantity + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {price !== null && <p className="text-sm font-medium">Line subtotal ₹{(price * item.quantity).toLocaleString("en-IN")}</p>}
          <Button
            variant="outline"
            size="sm"
            aria-label={`Remove ${item.book.title} from cart`}
            onClick={() => removeItem(item.book._id)}
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const hydrated = useHydration();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getSubtotal());
  const { user } = useAuthStore();

  const handleCheckout = () => {
    router.push("/checkout/checkout");
  };

  if (!hydrated) return <p className="p-8 text-center" role="status">Loading cart…</p>;
  if (!items.length) {
    return (
      <div className="bg-background min-h-screen py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl border border-dashed bg-card p-6 sm:p-12">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Your cart is empty</h1>
            
            {!user ? (
              <>
                <p className="text-muted-foreground mt-3 text-lg">
                  Create an account to start building your personal library.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <Button size="lg" asChild><Link href="/login">Log In</Link></Button>
                  <Button size="lg" variant="outline" asChild><Link href="/register">Sign Up</Link></Button>
                </div>
                <Button className="mt-4" variant="ghost" asChild><Link href="/books">Browse Books</Link></Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mt-3">
                  Browse our catalog and add a few books to get started.
                </p>
                <Button className="mt-8" size="lg" asChild><Link href="/books">
                    Browse Books
                  </Link></Button>
              </>
            )}
          </div>

          {/* Recent Orders for Logged-In User */}
          <RecentOrdersSection />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Cart
            </p>
            <h1 className="text-3xl font-bold">Your Shopping Basket</h1>
            <p className="text-muted-foreground mt-2">
              Review items, update quantities, and proceed to checkout.
            </p>
          </div>
          <Button size="lg" onClick={handleCheckout}>
            Proceed to Checkout
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="space-y-4">
            {items.map((item) => (
              <CartItemRow key={item.book._id} item={item} />
            ))}
          </section>

          <aside className="self-start rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20">
              <Truck className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-emerald-800">Delivery details</p>
                <p className="text-xs text-emerald-700">
                  Review the final delivery charges when your order is created.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Estimated book subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-medium text-emerald-600">
                <span>Shipping</span>
                <span>Confirmed at checkout</span>
              </div>
            </div>


            <div className="mt-6 space-y-3">
              <Button className="w-full" onClick={handleCheckout}>
                Checkout Now
              </Button>
              <Button variant="outline" className="w-full" asChild><Link href="/books">
                  Continue Shopping
                </Link></Button>
            </div>
          </aside>
        </div>

        {/* Recent Orders Section */}
        <RecentOrdersSection />
      </div>
    </div>
  );
}
