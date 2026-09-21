"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, QrCode, CheckCircle2, Loader2, X, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import { AnimatePresence, motion } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const defaultAddress = {
  fullName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  phone: '',
  email: '',
};

import { AuthGuard } from '@/components/auth/auth-guard';

export default function CheckoutStepPage() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const subtotal = useCartStore((state) => state.getSubtotal());
  useCartStore((state) => state.getTax());
  useCartStore((state) => state.getShipping());
  const total = useCartStore((state) => state.getTotal());
  const clearCart = useCartStore((state) => state.clearCart);

  const [address, setAddress] = useState(defaultAddress);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod'>('upi');
  const [submitting, setSubmitting] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiStatus, setUpiStatus] = useState<'waiting' | 'success'>('waiting');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [backendOrder, setBackendOrder] = useState<any>(null);
  const [backendPayment, setBackendPayment] = useState<any>(null);
  const [utr, setUtr] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmt, setCopiedAmt] = useState(false);

  const copyText = (text: string, type: 'upi' | 'amt') => {
    navigator.clipboard.writeText(text);
    if (type === 'upi') {
      setCopiedUpi(true);
      toast.success("UPI ID copied! 📋");
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedAmt(true);
      toast.success("Amount copied! 📋");
      setTimeout(() => setCopiedAmt(false), 2000);
    }
  };

  const [upiUrl, setUpiUrl] = useState('');

  useEffect(() => {
    if (!items.length) {
      router.push('/checkout/cart');
    }
  }, [items.length, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!address.fullName || !address.addressLine1 || !address.city || !address.state || !address.postalCode || !address.country || !address.phone || !address.email) {
      toast.error("Please fill in all required shipping address fields (including phone, state, and pincode).");
      return;
    }

    processOrder();
  };

  const processOrder = async () => {
    setSubmitting(true);
    try {
      const formattedItems = items.map(item => ({
        book: item.book._id || (item.book as any).id,
        quantity: item.quantity
      }));

      const enteredFullName = address.fullName.trim();
      const enteredEmail = address.email.trim();
      const enteredPhone = address.phone.trim();
      const enteredAddressLine1 = address.addressLine1.trim();
      const enteredAddressLine2 = address.addressLine2 ? address.addressLine2.trim() : "";
      const enteredCity = address.city.trim();
      const enteredState = address.state.trim();
      const enteredPostalCode = address.postalCode.trim();
      const enteredCountry = (address.country || "India").trim();

      const shippingAddressObj = {
        fullName: enteredFullName,
        name: enteredFullName,
        phone: enteredPhone,
        phoneNumber: enteredPhone,
        recipientPhone: enteredPhone,
        email: enteredEmail,
        addressLine1: enteredAddressLine1,
        street: enteredAddressLine1,
        address: enteredAddressLine1,
        addressLine2: enteredAddressLine2 || undefined,
        city: enteredCity,
        state: enteredState,
        postalCode: enteredPostalCode,
        pincode: enteredPostalCode,
        pinCode: enteredPostalCode,
        country: enteredCountry,
      };

      // NOTE: Root level email, phone, and customerName are explicitly sent
      // so backend never overrides them with the registered user's account email.
      const payload = {
        items: formattedItems,
        email: enteredEmail,
        customerEmail: enteredEmail,
        phone: enteredPhone,
        customerPhone: enteredPhone,
        recipientPhone: enteredPhone,
        fullName: enteredFullName,
        customerName: enteredFullName,
        name: enteredFullName,
        shippingAddress: shippingAddressObj,
        deliveryAddress: shippingAddressObj,
        paymentMethod: 'UPI'
      };

      const { data } = await api.post('/orders', payload);

      if (data.success || data.status === 'success' || data._id || data.data?._id) {
        const responseData = data.data || data;
        const orderObj = responseData.order || responseData;
        const paymentObj = typeof responseData.payment === 'object' ? responseData.payment : responseData;

        setBackendOrder(orderObj);
        setBackendPayment(paymentObj);

        const orderId = orderObj._id || orderObj.id || responseData._id || responseData.id || '';
        const orderNum = orderObj.orderNumber || responseData.orderNumber || 'HM-ORDER';

        setCurrentOrderId(orderId);
        setCurrentOrderNumber(orderNum);

        let rawQr = responseData.qrCodeDataUrl || data.qrCodeDataUrl || paymentObj?.qrCodeDataUrl || orderObj?.qrCodeDataUrl || '';
        if (rawQr && !rawQr.startsWith('data:') && !rawQr.startsWith('http')) {
          rawQr = `data:image/png;base64,${rawQr}`;
        }
        setQrCodeDataUrl(rawQr);
        setUpiUrl(paymentObj?.upiUrl || responseData?.upiUrl || '');
        setShowUpiModal(true);
      } else {
        throw new Error(data.message || "Failed to create order");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyUtr = async () => {
    const sanitizedUtr = utr.trim().toUpperCase();

    // UTR Validation: A-Z, 0-9, hyphen. Length 6 to 64 characters
    const utrRegex = /^[A-Z0-9-]{6,64}$/;
    if (!utrRegex.test(sanitizedUtr)) {
      toast.error("Invalid UTR format. Must be 6 to 64 alphanumeric characters or hyphens.");
      return;
    }

    try {
      const { data } = await api.put(`/orders/${currentOrderId}/verify-payment`, { utr: sanitizedUtr });
      if (data.success || data.status === "success" || data._id || data.data?._id) {
        setUpiStatus('success');
        clearCart();
        toast.success("Payment UTR submitted for admin verification! 💳");
        await new Promise(resolve => setTimeout(resolve, 1800));
        setShowUpiModal(false);
        router.push(`/checkout/success?orderId=${currentOrderNumber}&paymentId=UPI&utr=${sanitizedUtr}`);
      } else {
        throw new Error(data.message || "Payment verification failed");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error?.message || "Failed to verify payment");
      setUpiStatus('waiting');
    }
  };

  return (
    <AuthGuard>
      <div className="bg-background min-h-screen py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 3-Step Checkout Progress Stepper */}
          <div className="mb-8 bg-card border border-border rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between max-w-2xl mx-auto text-xs font-serif font-bold">
              <Link href="/checkout/cart" className="flex items-center gap-2 text-emerald-700 hover:underline">
                <span className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-sans text-xs">✓</span>
                <span>1. Cart Review</span>
              </Link>
              <div className="h-0.5 w-10 sm:w-16 bg-emerald-300" />
              <div className="flex items-center gap-2 text-foreground">
                <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-sans text-xs">2</span>
                <span>2. Delivery Address</span>
              </div>
              <div className="h-0.5 w-10 sm:w-16 bg-border" />
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-sans text-xs">3</span>
                <span>3. UPI Payment &amp; UTR</span>
              </div>
            </div>
          </div>
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Checkout</p>
            <h1 className="text-3xl font-bold">Complete Your Order</h1>
            <p className="text-muted-foreground mt-2">Enter shipping details, select payment, and confirm your purchase.</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[2fr_1fr]">
            <section className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div>
                <h2 className="text-xl font-semibold">Shipping Address</h2>
                <p className="text-sm text-muted-foreground mt-1">Where should we deliver your books?</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: 'fullName', label: 'Full Name', type: 'text' },
                  { name: 'email', label: 'Email Address', type: 'email' },
                ].map((field) => (
                  <label key={field.name} className="space-y-2">
                    <span className="text-sm font-medium">{field.label}</span>
                    <input
                      type={field.type}
                      required
                      placeholder={field.name === 'email' ? 'e.g. yourname@gmail.com' : 'e.g. John Doe'}
                      value={(address as any)[field.name]}
                      onChange={(event) => setAddress({ ...address, [field.name]: event.target.value })}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary/80"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { name: 'addressLine1', label: 'Address Line 1 *' },
                  { name: 'addressLine2', label: 'Address Line 2 (optional)' },
                ].map((field) => (
                  <label key={field.name} className="space-y-2">
                    <span className="text-sm font-medium">{field.label}</span>
                    <input
                      type="text"
                      required={field.name === 'addressLine1'}
                      value={(address as any)[field.name]}
                      onChange={(event) => setAddress({ ...address, [field.name]: event.target.value })}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary/80"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { name: 'city', label: 'City' },
                  { name: 'state', label: 'State' },
                  { name: 'postalCode', label: 'PIN / Postal Code' },
                  { name: 'country', label: 'Country' },
                ].map((field) => (
                  <label key={field.name} className="space-y-2">
                    <span className="text-sm font-medium">{field.label}</span>
                    <input
                      type="text"
                      value={(address as any)[field.name]}
                      onChange={(event) => setAddress({ ...address, [field.name]: event.target.value })}
                      className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary/80"
                      required
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium">Phone Number *</span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 9876543210"
                    value={address.phone}
                    onChange={(event) => setAddress({ ...address, phone: event.target.value })}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary/80"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium">Delivery Notes</span>
                  <input
                    type="text"
                    value={address.addressLine2}
                    onChange={(event) => setAddress({ ...address, addressLine2: event.target.value })}
                    className="w-full rounded-2xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary/80"
                  />
                </label>
              </div>

              <div className="space-y-4 rounded-3xl border border-border bg-background p-4">
                <h2 className="text-lg font-semibold">Payment Method</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([
                    { value: 'upi', label: 'UPI' },
                  ] as const).map((method) => (
                    <button
                      type="button"
                      key={method.value}
                      onClick={() => setPaymentMethod(method.value)}
                      className={`rounded-2xl border p-4 text-left transition ${paymentMethod === method.value ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
                    >
                      <p className="font-semibold">{method.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pay via Google Pay, PhonePe, Paytm QR Code
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Once submitted, your order will appear in the dashboard.</p>
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            </section>

            <aside className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-4">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Order Summary</p>
                  <p className="text-sm text-muted-foreground">Review your purchase before confirming.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{(backendOrder?.subtotal ?? subtotal).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium text-emerald-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Order Total</span>
                  <span>₹{(backendOrder?.totalPrice ?? backendPayment?.amount ?? total).toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background p-4">
                <p className="text-sm font-medium">Items</p>
                <div className="mt-3 space-y-3">
                  {items.map((item) => (
                    <div key={item.book._id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate">{item.book.title}</span>
                      <span className="text-muted-foreground">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </form>
        </div>

        {/* UPI Modal Simulation */}
        <AnimatePresence>
          {showUpiModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-center"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4"
                  onClick={() => {
                    setShowUpiModal(false);
                    setUpiStatus('waiting');
                  }}
                  disabled={upiStatus === 'success'}
                  aria-label="Close payment dialog"
                >
                  <X className="h-4 w-4" />
                </Button>

                {upiStatus === 'waiting' ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center rounded-2xl mb-3">
                      <QrCode className="h-8 w-8 text-[#0F3D3E]" />
                    </div>

                    <div className="space-y-1 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37]/20 text-[#0F3D3E] px-2.5 py-0.5 rounded-md">
                        Order #{currentOrderNumber}
                      </span>
                      <h3 className="text-xl font-serif font-bold text-[#0F3D3E]">Scan to Pay with UPI</h3>
                      <div className="flex items-center justify-center gap-2 text-xs text-[#5C6E6E]">
                        <span>Amount: <strong className="text-[#0F3D3E] text-base font-bold font-serif">₹{(backendPayment?.amount ?? backendOrder?.totalPrice ?? total).toFixed(2)}</strong></span>
                        <button
                          type="button"
                          onClick={() => copyText((backendPayment?.amount ?? backendOrder?.totalPrice ?? total).toFixed(2), 'amt')}
                          className="p-1 text-[#5C6E6E] hover:text-[#0F3D3E] rounded border border-[#E2E6DF] bg-white text-[10px] font-mono cursor-pointer"
                          title="Copy amount"
                        >
                          {copiedAmt ? <Check className="h-3 w-3 text-emerald-600 inline" /> : <Copy className="h-3 w-3 inline" />}
                        </button>
                      </div>
                    </div>

                    <div className="aspect-square bg-white w-48 mx-auto rounded-2xl border-2 border-dashed border-[#E2E6DF] flex items-center justify-center mb-4 overflow-hidden shadow-xs">
                      {qrCodeDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- client-generated data URI; next/image adds no benefit here.
                        <img src={qrCodeDataUrl} alt="UPI payment QR" className="w-full h-full object-contain p-2" />
                      ) : (
                        <QrCode className="h-24 w-24 text-muted-foreground/30" />
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => copyText("harglimpublications@okaxis", 'upi')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F9F7] hover:bg-[#F0F2ED] border border-[#E2E6DF] rounded-xl text-xs font-mono font-semibold text-[#0F3D3E] transition-colors cursor-pointer"
                        >
                          {copiedUpi ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{copiedUpi ? "UPI ID Copied" : "Copy UPI ID"}</span>
                        </button>
                      </div>
                      {upiUrl && (
                      <a
                        href={upiUrl}
                        target="_self"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 mb-4 text-xs font-serif font-bold rounded-xl bg-[#0F3D3E] text-[#D4AF37] hover:bg-[#174C4D] transition-colors shadow-xs"
                      >
                        <span>Pay via UPI App (PhonePe / GPay / Paytm)</span>
                      </a>
                    )}

                    <p className="text-xs text-[#5C6E6E] mb-4 font-sans leading-relaxed">
                      Open your UPI app, scan this QR code or click the button above to pay, then enter your 12-digit UTR below.
                    </p>

                    <div className="space-y-2 mb-4">
                      <input
                        type="text"
                        placeholder="Enter UTR / Transaction ID (e.g. UPI1234567890)"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value.toUpperCase())}
                        maxLength={64}
                        className="w-full rounded-xl border border-[#E2E6DF] bg-[#F8F9F7] px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider outline-none transition focus:border-[#0F3D3E]"
                      />
                      <p className="text-[10px] text-[#5C6E6E] text-left">
                        * Minimum 6 characters (Letters, numbers, hyphens allowed)
                      </p>
                    </div>

                    <Button className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold text-sm h-11 rounded-xl shadow-xs" onClick={handleVerifyUtr}>
                      Submit UTR for Verification
                    </Button>
                  </>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-8 space-y-4"
                  >
                    <div className="mx-auto w-20 h-20 bg-emerald-500/10 text-emerald-600 flex items-center justify-center rounded-full shadow-sm">
                      <CheckCircle2 className="h-10 w-10" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#0F3D3E]">Payment Submitted!</h3>
                      <p className="text-xs text-amber-700 font-medium mt-1 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                        ⏳ Payment UTR submitted. Waiting for admin verification.
                      </p>
                    </div>
                    <p className="text-xs text-[#5C6E6E] flex items-center justify-center gap-2 font-sans pt-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#0F3D3E]" /> Redirecting to order confirmation...
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}
