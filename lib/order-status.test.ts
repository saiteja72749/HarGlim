import { describe, expect, it } from "vitest";
import {
  getFulfilmentStage,
  getOrderTotal,
  getPaymentState,
  indexPaymentsByOrder,
  mapPaymentStatus,
} from "./order-status";

describe("mapPaymentStatus (handover §28)", () => {
  it.each([
    ["INTENT_CREATED", "awaiting_payment"],
    ["QR_GENERATED", "awaiting_payment"],
    ["PAYMENT_PENDING", "awaiting_payment"],
    ["PAYMENT_SUBMITTED", "verification_pending"],
    ["VERIFICATION_PENDING", "verification_pending"],
    ["PAYMENT_VERIFIED", "paid"],
    ["PAYMENT_REJECTED", "failed"],
    ["PAYMENT_FAILED", "failed"],
    ["PAYMENT_EXPIRED", "expired"],
    ["PAYMENT_CANCELLED", "cancelled"],
  ])("%s -> %s", (raw, expected) => {
    expect(mapPaymentStatus(raw)).toBe(expected);
  });

  it("returns null for unknown values", () => {
    expect(mapPaymentStatus("")).toBeNull();
    expect(mapPaymentStatus("SOMETHING_NEW")).toBeNull();
  });
});

describe("getPaymentState", () => {
  it("isPaid on the order always wins", () => {
    expect(getPaymentState({ isPaid: true }, { status: "PAYMENT_REJECTED" })).toBe("paid");
  });

  it("uses the payment record when the order only has a payment id", () => {
    // The real bug: a rejected payment used to show "verification pending" forever.
    expect(getPaymentState({ isPaid: false, utr: "UTR123", payment: "p1" }, { status: "PAYMENT_REJECTED" })).toBe("failed");
    expect(getPaymentState({ isPaid: false, payment: "p1" }, { status: "PAYMENT_EXPIRED" })).toBe("expired");
  });

  it("falls back to utr presence without a payment record", () => {
    expect(getPaymentState({ isPaid: false, utr: "UTR123" })).toBe("verification_pending");
    expect(getPaymentState({ isPaid: false })).toBe("awaiting_payment");
  });
});

describe("order helpers", () => {
  it("prefers the server totalPrice", () => {
    expect(getOrderTotal({ totalPrice: 598, items: [{ price: 1, quantity: 1 }] })).toBe(598);
    expect(getOrderTotal({ items: [{ price: 299, quantity: 2 }] })).toBe(598);
  });

  it("maps fulfilment stages", () => {
    expect(getFulfilmentStage({ status: "PENDING" })).toBe("placed");
    expect(getFulfilmentStage({ status: "Processing" })).toBe("processing");
    expect(getFulfilmentStage({ status: "SHIPPED" })).toBe("shipped");
    expect(getFulfilmentStage({ status: "DELIVERED" })).toBe("delivered");
    expect(getFulfilmentStage({ status: "CANCELLED" })).toBe("cancelled");
  });

  it("keeps the latest payment attempt per order", () => {
    const map = indexPaymentsByOrder([
      { _id: "a", order: "o1", status: "PAYMENT_REJECTED", createdAt: "2026-10-01T00:00:00Z" },
      { _id: "b", order: { _id: "o1" }, status: "QR_GENERATED", createdAt: "2026-10-02T00:00:00Z" },
    ]);
    expect(map.get("o1")?._id).toBe("b");
  });
});
