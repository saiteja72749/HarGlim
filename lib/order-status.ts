import { record } from '@/lib/api-error';

/**
 * Order + payment state, mapped from the backend contract (HM handover §28 and §32).
 *
 * The Order document only carries `isPaid`, `utr` and a `payment` id. The real payment
 * state (rejected / expired / cancelled ...) lives on the Payment record, available via
 * GET /users/{id}/payments. Every reader-facing screen should go through these helpers
 * instead of guessing from ad-hoc strings like "PAID" or "REJECTED".
 */

export type PaymentState =
  | "awaiting_payment"
  | "verification_pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export const PAYMENT_STATE_META: Record<PaymentState, { label: string; tone: string }> = {
  awaiting_payment: { label: "Awaiting Payment", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  verification_pending: { label: "Verification Pending", tone: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  paid: { label: "Payment Verified", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  failed: { label: "Payment Could Not Be Verified", tone: "bg-rose-500/10 text-rose-700 border-rose-500/30" },
  expired: { label: "Payment Expired", tone: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
  cancelled: { label: "Payment Cancelled", tone: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
};

export function mapPaymentStatus(raw: unknown): PaymentState | null {
  const s = String(raw || "").toUpperCase().replace(/[\s-]+/g, "_");
  if (!s) return null;
  if (["PAYMENT_VERIFIED", "VERIFIED", "PAID", "SUCCESS", "COMPLETED", "APPROVED", "CONFIRMED", "PAYMENT_APPROVED"].includes(s)) return "paid";
  if (["PAYMENT_SUBMITTED", "VERIFICATION_PENDING", "SUBMITTED"].includes(s)) return "verification_pending";
  if (["PAYMENT_REJECTED", "PAYMENT_FAILED", "REJECTED", "FAILED"].includes(s)) return "failed";
  if (["PAYMENT_EXPIRED", "EXPIRED"].includes(s)) return "expired";
  if (["PAYMENT_CANCELLED", "CANCELLED", "CANCELED"].includes(s)) return "cancelled";
  if (["INTENT_CREATED", "QR_GENERATED", "PAYMENT_PENDING", "PENDING", "CREATED"].includes(s)) return "awaiting_payment";
  return null;
}

/** `payment` is the matching Payment record if one was loaded. */
export function getPaymentState(orderInput: unknown, paymentInput?: unknown): PaymentState {
  const order = record(orderInput), payment = record(paymentInput);
  if (order?.isPaid === true) return "paid";
  const fromRecord =
    mapPaymentStatus(payment?.status) ??
    mapPaymentStatus(record(order.payment).status) ??
    mapPaymentStatus(order?.paymentStatus ?? order?.payment_status);
  if (fromRecord) return fromRecord;
  return order?.utr ? "verification_pending" : "awaiting_payment";
}

export type FulfilmentStage = "placed" | "processing" | "printed" | "shipped" | "delivered" | "cancelled";

export const FULFILMENT_META: Record<FulfilmentStage, { label: string; tone: string }> = {
  placed: { label: "Order Placed", tone: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20" },
  processing: { label: "Processing", tone: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  printed: { label: "Printed", tone: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  shipped: { label: "Shipped", tone: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  delivered: { label: "Delivered", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  cancelled: { label: "Cancelled", tone: "bg-rose-500/10 text-rose-700 border-rose-500/20" },
};

export function getFulfilmentStage(input: unknown): FulfilmentStage {
  const order = record(input);
  const s = String(order?.status || order?.orderStatus || "").toUpperCase().replace(/[-_]/g, " ");
  if (s.includes("CANCEL") || s.includes("REJECT")) return "cancelled";
  if (s.includes("DELIVER") || s.includes("COMPLETE")) return "delivered";
  if (s.includes("SHIP") || s.includes("TRANSIT") || s.includes("DISPATCH")) return "shipped";
  if (s.includes("PRINT")) return "printed";
  if (s.includes("PROCESS")) return "processing";
  return "placed";
}

const firstNumber = (...values: unknown[]) => {
  for (const v of values) {
    if (typeof v !== 'number' && typeof v !== 'string') continue;
    if (typeof v === 'string' && !v.trim()) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

/** Server totals only (handover: never recompute money client-side when the server sent it). */
export function getOrderTotal(input: unknown): number {
  const order = record(input);
  const itemsTotal = Array.isArray(order?.items)
    ? order.items.reduce(
        (sum: number, value: unknown) => {
          const item = record(value), book = record(item.book);
          return sum + firstNumber(item.price, book.price, book.mrp) * firstNumber(item.quantity, 1);
        },
        0
      )
    : 0;
  return firstNumber(order?.totalPrice, order?.totalAmount, order?.total, order?.amount, itemsTotal);
}

/** Order id stored on a Payment record (string or populated object). */
export function getPaymentOrderId(input: unknown): string {
  const payment = record(input), order = record(payment.order);
  return String((typeof payment.order === 'object' ? order._id || order.id : payment.order) || payment.orderId || '');
}

/** Related records can be expanded objects or an ID in older API responses. */
export function populated<T extends object>(value: T | string | null | undefined): T | undefined {
  return value && typeof value === 'object' ? value : undefined;
}

export function relatedId(value: { _id?: string; id?: string } | string | null | undefined): string {
  return typeof value === 'string' ? value : value?._id || value?.id || '';
}

const paymentTimestamp = (input: unknown) => {
  const value = record(input).createdAt;
  const time = typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : value instanceof Date ? value.getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

/** Latest payment per order id (a rejected attempt followed by a new one keeps the newest). */
export function indexPaymentsByOrder<T>(payments: readonly T[]): Map<string, T> {
  const byOrder = new Map<string, T>();
  for (const payment of payments) {
    const orderId = getPaymentOrderId(payment);
    if (!orderId) continue;
    const current = byOrder.get(orderId);
    const t = paymentTimestamp(payment);
    if (!current || t >= paymentTimestamp(current)) byOrder.set(orderId, payment);
  }
  return byOrder;
}
