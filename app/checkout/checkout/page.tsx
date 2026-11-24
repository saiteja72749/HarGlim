"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHydration } from "@/hooks/useHydration";
import api from "@/lib/api";
import { describeApiError, record } from "@/lib/api-error";
import { getPayableAmount, getPaymentQr, getUpiDestination, normalizeUtr } from "@/lib/checkout-payment";
import { fetchSavedAddresses, getDefaultAddress, saveAddresses, withDefaultAddress, type SavedAddress } from "@/lib/saved-address";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const emptyAddress = {
  fullName: "", email: "", phone: "", addressLine1: "", addressLine2: "",
  city: "", state: "", postalCode: "", country: "India",
};

const fields = [
  { id: "fullName", label: "Full name", autoComplete: "name" },
  { id: "email", label: "Email address", autoComplete: "email", type: "email" },
  { id: "phone", label: "Phone number", autoComplete: "tel", type: "tel" },
  { id: "addressLine1", label: "Address line 1", autoComplete: "address-line1", wide: true },
  { id: "addressLine2", label: "Address line 2 (optional)", autoComplete: "address-line2", wide: true },
  { id: "city", label: "City", autoComplete: "address-level2" },
  { id: "state", label: "State or province", autoComplete: "address-level1" },
  { id: "postalCode", label: "PIN or postal code", autoComplete: "postal-code" },
  { id: "country", label: "Country", autoComplete: "country-name" },
] as const;

type ConfirmedOrder = {
  id: string;
  number: string;
  amount: number | null;
  shipping: number | null;
  qr: string;
  upi: ReturnType<typeof getUpiDestination>;
};

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function CheckoutForm() {
  const router = useRouter();
  const hydrated = useHydration();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getSubtotal());
  const user = useAuthStore((state) => state.user);
  const [address, setAddress] = useState(() => ({ ...emptyAddress, fullName: user?.name || "", email: user?.email || "" }));
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const addressEdited = useRef(false);
  const busy = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<ConfirmedOrder | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [utr, setUtr] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [addressNotice, setAddressNotice] = useState("");
  const [qrFailed, setQrFailed] = useState(false);

  const name = user?.name || "";
  const email = user?.email || "";
  useEffect(() => {
    let current = true;
    fetchSavedAddresses().then((list) => {
      if (!current) return;
      setAddresses(list);
      if (addressEdited.current) return;
      const saved = getDefaultAddress(list);
      setSelectedAddressId(saved?._id || "");
      setAddress({ ...emptyAddress, ...saved, fullName: saved?.fullName || name, email: saved?.email || email });
    }).catch(() => {
      if (current) setAddressNotice("Saved addresses are unavailable. You can still enter a delivery address.");
    });
    return () => { current = false; };
  }, [name, email]);

  const selectAddress = (id: string) => {
    const saved = addresses?.find((entry) => entry._id === id);
    addressEdited.current = true;
    setSelectedAddressId(id);
    setAddress({ ...emptyAddress, ...saved, fullName: saved?.fullName || name, email: saved?.email || email });
  };

  const confirmOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || order || uncertain || !items.length) return;
    const shippingAddress = {
      fullName: address.fullName.trim(), email: address.email.trim(), phone: address.phone.trim(),
      addressLine1: address.addressLine1.trim(), addressLine2: address.addressLine2.trim(),
      city: address.city.trim(), state: address.state.trim(), postalCode: address.postalCode.trim(), country: address.country.trim(),
    };
    if (Object.entries(shippingAddress).some(([key, value]) => key !== "addressLine2" && !value)) {
      setError("Fill in all required shipping details.");
      return;
    }
    if (!/^\+?\d{7,15}$/.test(shippingAddress.phone.replace(/[\s()-]/g, ""))) {
      setError("Enter a valid phone number with its country code if applicable.");
      return;
    }
    if (/^(india|in)$/i.test(shippingAddress.country) && !/^[1-9]\d{5}$/.test(shippingAddress.postalCode)) {
      setError("Enter a valid six-digit PIN code for India.");
      return;
    }

    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/orders", {
        items: items.map((item) => ({ book: item.book._id || item.book.id, quantity: item.quantity })),
        shippingAddress: { ...shippingAddress, addressLine2: shippingAddress.addressLine2 || undefined },
        customerEmail: shippingAddress.email,
        customerPhone: shippingAddress.phone,
        paymentMethod: "UPI",
      });
      const envelope = record(data);
      const payload = record(envelope.data ?? data);
      const createdOrder = record(payload.order ?? payload);
      const payment = record(payload.payment ?? payload);
      const id = createdOrder._id ?? createdOrder.id ?? payload._id ?? payload.id;
      if (envelope.success === false || typeof id !== "string" || !id) {
        setUncertain(true);
        setError("We could not confirm the order response. Check My Orders before placing another order.");
        window.history.replaceState(null, "", "/checkout/checkout?orderCheck=1");
        return;
      }

      const orderNumber = createdOrder.orderNumber ?? payload.orderNumber;
      const shipping = createdOrder.shippingPrice ?? createdOrder.shippingFee;
      setOrder({
        id,
        number: typeof orderNumber === "string" ? orderNumber : "",
        amount: getPayableAmount(createdOrder, payment),
        shipping: typeof shipping === "number" && Number.isFinite(shipping) ? shipping : null,
        qr: getPaymentQr(payload.qrCodeDataUrl ?? envelope.qrCodeDataUrl ?? payment.qrCodeDataUrl ?? record(payment.qr).dataUrl ?? createdOrder.qrCodeDataUrl),
        upi: getUpiDestination(payment.upiUrl ?? payload.upiUrl ?? record(payment.qr).upiUrl),
      });
      window.history.replaceState(null, "", `/checkout/checkout?orderId=${encodeURIComponent(id)}`);
      // Keep any quantities added to the cart while the order request was pending.
      const ordered = new Map(items.map(({ book, quantity }) => [book._id, quantity]));
      useCartStore.setState((state) => ({
        items: state.items.flatMap((item) => {
          const remaining = item.quantity - (ordered.get(item.book._id) || 0);
          return remaining > 0 ? [{ ...item, quantity: remaining }] : [];
        }),
      }));
      if (saveAsDefault && addresses) {
        try {
          const latest = await fetchSavedAddresses();
          const next = withDefaultAddress(latest, { ...shippingAddress, _id: selectedAddressId || undefined });
          if (next) await saveAddresses(next);
          else if (latest.length >= 10 && !selectedAddressId) {
            setAddressNotice("Your order was created. Manage your saved addresses in Profile to make room for a new one.");
          }
        } catch {
          setAddressNotice("Your order was created. The default address could not be saved.");
        }
      }
    } catch (cause) {
      const failure = describeApiError(cause);
      const status = failure.response?.status;
      if (!status || status >= 500 || status === 408) {
        setUncertain(true);
        setError("The order request could not be confirmed. Check My Orders before placing another order.");
        window.history.replaceState(null, "", "/checkout/checkout?orderCheck=1");
      } else {
        setError(failure.response?.data?.message || "Could not create the order. Check your details and try again.");
      }
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  const submitUtr = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order || busy.current || submitted) return;
    const reference = normalizeUtr(utr);
    if (!reference) {
      setError("Enter the UTR from your UPI app using 6–64 letters, digits or hyphens.");
      return;
    }
    busy.current = true;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.put(`/orders/${encodeURIComponent(order.id)}/verify-payment`, { utr: reference });
      if (data?.success === false || data?.status === "error") throw new Error("The reference could not be accepted.");
      setSubmitted(true);
    } catch (cause) {
      setError(describeApiError(cause).response?.data?.message || "Could not confirm submission. Check the payment status in My Orders before trying again.");
    } finally {
      busy.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!hydrated || order || busy.current) return;
    const params = new URLSearchParams(window.location.search);
    const createdId = params.get("orderId");
    if (createdId) {
      router.replace(`/dashboard/orders?orderId=${encodeURIComponent(createdId)}`);
    } else if (params.has("orderCheck")) {
      setUncertain(true);
      setError("The order request could not be confirmed. Check My Orders before placing another order.");
    } else if (!items.length) {
      router.replace("/checkout/cart");
    }
  }, [hydrated, items.length, order, router]);

  const ordersHref = order ? `/dashboard/orders?orderId=${encodeURIComponent(order.id)}` : "/dashboard/orders";

  if (order) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
        <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-8" aria-labelledby="payment-heading">
          <h1 id="payment-heading" className="font-serif text-3xl font-semibold">Complete payment</h1>
          {order.number && <p className="text-muted-foreground">Order {order.number}</p>}
          {order.amount !== null && <p className="text-xl font-semibold">Amount payable {rupees.format(order.amount)}</p>}
          {order.shipping !== null && <p className="text-sm text-muted-foreground">Includes shipping of {rupees.format(order.shipping)}</p>}
          {addressNotice && <p role="status" className="text-sm text-muted-foreground">{addressNotice}</p>}
          {submitted ? (
            <div role="status" className="rounded-lg bg-muted p-4">
              <p className="font-semibold">Payment details submitted. Awaiting verification.</p>
              <p className="mt-1 text-sm text-muted-foreground">Harglim’s team will manually verify your transaction.</p>
            </div>
          ) : order.amount !== null ? (
            <>
              {(order.qr && !qrFailed || order.upi) && (
                <div className="space-y-3">
                  <p className="text-sm">Pay the exact amount using the UPI details for this order.</p>
                  {order.upi?.name && <p className="text-sm">Merchant <strong>{order.upi.name}</strong></p>}
                  {order.upi?.id && <p className="break-all text-sm">UPI ID <strong>{order.upi.id}</strong></p>}
                  {order.qr && !qrFailed && (
                    // eslint-disable-next-line @next/next/no-img-element -- the API may provide an inline QR image
                    <img src={order.qr} alt="Merchant UPI payment QR" width={192} height={192} onError={() => setQrFailed(true)} className="rounded-lg border bg-white" />
                  )}
                  {order.upi && <Button asChild variant="outline"><a href={order.upi.url}>Open UPI app</a></Button>}
                </div>
              )}
              {(!order.qr || qrFailed) && !order.upi && <p className="text-sm text-muted-foreground">Open My Orders to retrieve the UPI payment details for this order.</p>}
              <form onSubmit={submitUtr} className="space-y-3">
                <label htmlFor="checkout-utr" className="block text-sm font-medium">UPI transaction reference (UTR)</label>
                <Input id="checkout-utr" autoCapitalize="characters" spellCheck={false} maxLength={64} required value={utr} onChange={(event) => setUtr(event.target.value)} className="min-h-11" />
                <Button type="submit" disabled={submitting}>Submit UTR for verification</Button>
              </form>
            </>
          ) : <p role="status">Payment amount unavailable. Open My Orders to check this order before paying.</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild><Link href={ordersHref}>View in My Orders</Link></Button>
            {submitted && <Button variant="ghost" asChild><Link href={`/checkout/success?orderId=${encodeURIComponent(order.id)}`}>View order confirmation</Link></Button>}
          </div>
        </section>
      </div>
    );
  }

  if (!hydrated || !items.length) return <p role="status" className="p-8 text-center">Loading checkout…</p>;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/checkout/cart" className="inline-flex min-h-11 items-center text-sm underline">Back to cart</Link>
      <h1 className="mb-6 font-serif text-[clamp(2rem,5vw,3rem)] font-semibold">Checkout</h1>
      <form onSubmit={confirmOrder} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-5 rounded-2xl border bg-card p-4 sm:p-6" aria-labelledby="shipping-heading">
          <h2 id="shipping-heading" className="font-serif text-2xl font-semibold">Shipping details</h2>
          {addressNotice && <p role="status" className="text-sm text-muted-foreground">{addressNotice}</p>}
          {!!addresses?.length && (
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              <span>Saved addresses</span>
              <select value={selectedAddressId} onChange={(event) => selectAddress(event.target.value)} className="min-h-11 w-full min-w-0 rounded-md border bg-background px-2">
                <option value="">Use a new address</option>
                {addresses.filter((entry) => entry._id).map((entry) => (
                  <option key={entry._id} value={entry._id}>{[entry.label, entry.addressLine1, entry.city].filter(Boolean).join(" · ")}</option>
                ))}
              </select>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
            {fields.map((field) => (
              <label key={field.id} htmlFor={field.id} className={`block space-y-2 text-sm font-medium ${"wide" in field ? "sm:col-span-2" : ""}`}>
                <span>{field.label}</span>
                <Input id={field.id} type={"type" in field ? field.type : "text"} autoComplete={field.autoComplete}
                  value={address[field.id] || ""} required={field.id !== "addressLine2"} className="min-h-11"
                  onChange={(event) => { addressEdited.current = true; setAddress({ ...address, [field.id]: event.target.value }); }} />
              </label>
            ))}
          </div>
          {addresses && (
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} className="size-4 accent-primary" />
              Save this as my default address
            </label>
          )}
        </section>
        <aside className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 sm:p-6" aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="font-serif text-2xl font-semibold">Order summary</h2>
          <ul className="space-y-2 border-b pb-4 text-sm">
            {items.map(({ book, quantity }) => (
              <li key={book._id} className="flex justify-between gap-3"><span className="[overflow-wrap:anywhere]">{book.title}</span><span className="shrink-0">× {quantity}</span></li>
            ))}
          </ul>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt>Estimated book subtotal</dt><dd>{rupees.format(subtotal)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Shipping</dt><dd className="text-right">Calculated at order confirmation</dd></div>
            <div className="flex justify-between gap-3"><dt>Payment method</dt><dd>UPI</dd></div>
          </dl>
          <p className="text-sm text-muted-foreground">You’ll see the final payable amount before paying. Harglim verifies the UPI reference after submission.</p>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {uncertain
            ? <Button asChild variant="outline" className="w-full"><Link href={ordersHref}>Check My Orders</Link></Button>
            : <Button type="submit" className="w-full min-h-11" disabled={submitting}>{submitting ? "Confirming order…" : "Confirm Order"}</Button>}
        </aside>
      </form>
    </div>
  );
}

export default function CheckoutStepPage() {
  return <AuthGuard><CheckoutForm /></AuthGuard>;
}
