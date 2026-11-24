import { describe, expect, it } from "vitest";
import { getPayableAmount, getPaymentQr, getUpiDestination, normalizeUtr } from "./checkout-payment";

describe("manual UPI instructions", () => {
  it("requires a positive authoritative amount and never computes it from the items", () => {
    expect(getPayableAmount({ totalPrice: 470 }, { amount: "474.50" })).toBe(474.5);
    expect(getPayableAmount({ totalPrice: 470 }, { amount: 0 })).toBeNull();
    expect(getPayableAmount({ items: [{ price: 440, quantity: 2 }] }, {})).toBeNull();
  });

  it("reads UPI payee parameters and rejects other URL schemes", () => {
    const url = "upi://pay?pa=test%40example&pn=Test%20Merchant&am=470.00";
    expect(getUpiDestination(url)).toEqual({ url, id: "test@example", name: "Test Merchant" });
    expect(getUpiDestination("javascript:alert(1)")).toBeNull();
    expect(getUpiDestination("upi://collect?pa=test%40example")).toBeNull();
  });

  it("supports the documented UTR contract without requiring a fixed number of digits", () => {
    expect(normalizeUtr(" test-1234 ")).toBe("TEST-1234");
    expect(normalizeUtr("123456789012")).toBe("123456789012");
    expect(normalizeUtr("12 34 56")).toBeNull();
    expect(normalizeUtr("A".repeat(65))).toBeNull();
  });

  it("allows supported image URLs and rejects HTML and script URLs", () => {
    expect(getPaymentQr("YWJjZA==")).toBe("data:image/png;base64,YWJjZA==");
    expect(getPaymentQr("data:text/html;charset=UTF-8,code")).toBe("");
    expect(getPaymentQr("javascript:alert(1)")).toBe("");
  });
});
