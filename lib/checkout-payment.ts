import { record } from "@/lib/api-error";

export function getPayableAmount(order: unknown, payment: unknown): number | null {
  const orderData = record(order), paymentData = record(payment);
  for (const value of [paymentData.amount, orderData.totalPrice, orderData.totalAmount, orderData.total]) {
    if (typeof value !== "number" && (typeof value !== "string" || !/^\d+(\.\d{1,2})?$/.test(value.trim()))) continue;
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }
  return null;
}

export function getUpiDestination(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const id = url.searchParams.get("pa");
    if (url.protocol !== "upi:" || url.hostname !== "pay" || !id?.includes("@")) return null;
    return { url: value, id, name: url.searchParams.get("pn") || "" };
  } catch {
    return null;
  }
}

export function getPaymentQr(value: unknown) {
  if (typeof value !== "string") return "";
  if (/^https:\/\//i.test(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) return value;
  return /^[A-Za-z0-9+/=]+$/.test(value) ? `data:image/png;base64,${value}` : "";
}

export function normalizeUtr(input: string): string | null {
  const reference = input.trim().toUpperCase();
  return /^[A-Z0-9-]{6,64}$/.test(reference) ? reference : null;
}
