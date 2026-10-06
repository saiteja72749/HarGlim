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
  paid: { label: "Payment Confirmed", tone: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  failed: { label: "Payment Rejected", tone: "bg-rose-500/10 text-rose-700 border-rose-500/30" },
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
export function getPaymentState(order: any, payment?: any): PaymentState {
  if (order?.isPaid === true) return "paid";
  const fromRecord =
    mapPaymentStatus(payment?.status) ??
    mapPaymentStatus(typeof order?.payment === "object" ? order.payment?.status : null) ??
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

export function getFulfilmentStage(order: any): FulfilmentStage {
  const s = String(order?.status || order?.orderStatus || "").toUpperCase().replace(/[-_]/g, " ");
  if (s.includes("CANCEL") || s.includes("REJECT")) return "cancelled";
  if (s.includes("DELIVER") || s.includes("COMPLETE")) return "delivered";
  if (s.includes("SHIP") || s.includes("TRANSIT") || s.includes("DISPATCH")) return "shipped";
  if (s.includes("PRINT")) return "printed";
  if (s.includes("PROCESS")) return "processing";
  return "placed";
}

const firstNumber = (...values: any[]) => {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

/** Server totals only (handover: never recompute money client-side when the server sent it). */
export function getOrderTotal(order: any): number {
  const itemsTotal = Array.isArray(order?.items)
    ? order.items.reduce(
        (sum: number, item: any) => sum + firstNumber(item.price, item.book?.price, item.book?.mrp) * firstNumber(item.quantity, 1),
        0
      )
    : 0;
  return firstNumber(order?.totalPrice, order?.totalAmount, order?.total, order?.amount, itemsTotal);
}

/** Order id stored on a Payment record (string or populated object). */
export const getPaymentOrderId = (payment: any): string =>
  String((typeof payment?.order === "object" ? payment.order?._id || payment.order?.id : payment?.order) || payment?.orderId || "");

/** Latest payment per order id (a rejected attempt followed by a new one keeps the newest). */
export function indexPaymentsByOrder(payments: any[]): Map<string, any> {
  const byOrder = new Map<string, any>();
  for (const payment of payments) {
    const orderId = getPaymentOrderId(payment);
    if (!orderId) continue;
    const current = byOrder.get(orderId);
    const t = new Date(payment.createdAt || 0).getTime();
    if (!current || t >= new Date(current.createdAt || 0).getTime()) byOrder.set(orderId, payment);
  }
  return byOrder;
}
