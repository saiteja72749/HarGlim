import { describe, expect, it } from "vitest";
import {
  canAssignCourier,
  canCancelShipment,
  extractList,
  extractTrackingInfo,
  getNextShipmentStatuses,
  getTrackingHistory,
  mergeShipmentsIntoOrders,
  normalizeShipmentStatus,
  shipmentBelongsToOrder,
} from "./tracking";

const shipment = {
  _id: "aaaaaaaaaaaaaaaaaaaaaaaa",
  order: "bbbbbbbbbbbbbbbbbbbbbbbb",
  status: "IN_TRANSIT",
  courier: { provider: "manual", serviceName: "Delhivery", trackingNumber: "DLV123456" },
  tracking: [],
};

describe("extractTrackingInfo", () => {
  it("reads tracking nested under shipment.courier (backend Shipment schema)", () => {
    const info = extractTrackingInfo(shipment);
    expect(info.trackingNumber).toBe("DLV123456");
    expect(info.courierName).toBe("Delhivery");
    expect(info.trackingUrl).toBe("https://www.delhivery.com/track/package/DLV123456");
  });

  it("reads tracking from an order with a merged shipment", () => {
    const info = extractTrackingInfo({ _id: "bbbbbbbbbbbbbbbbbbbbbbbb", shipment });
    expect(info.trackingNumber).toBe("DLV123456");
  });

  it("falls back to flattened legacy order fields", () => {
    const info = extractTrackingInfo({ tracking_id: "EE123IN", courier_name: "India Post" });
    expect(info.trackingNumber).toBe("EE123IN");
    expect(info.courierName).toBe("India Post");
  });

  it("prefers an explicit tracking URL", () => {
    const info = extractTrackingInfo({
      courier: { serviceName: "Other", trackingNumber: "X1", trackingUrl: "https://track.example.com/X1" },
    });
    expect(info.trackingUrl).toBe("https://track.example.com/X1");
  });

  it("returns empty values when nothing is assigned", () => {
    expect(extractTrackingInfo({ _id: "x" }).trackingNumber).toBe("");
  });
});

describe("shipment matching", () => {
  it("merges a shipment into its order by order id", () => {
    const [merged] = mergeShipmentsIntoOrders([{ _id: "bbbbbbbbbbbbbbbbbbbbbbbb" }], [shipment]);
    expect(merged.shipment).toBe(shipment);
  });

  it("does not match an unrelated order", () => {
    expect(shipmentBelongsToOrder(shipment, { _id: "cccccccccccccccccccccccc" })).toBe(false);
    expect(shipmentBelongsToOrder(shipment, { _id: "bbbbbbbbbbbbbbbbbbbbbbbb" })).toBe(true);
  });
});

describe("extractList", () => {
  it("handles the common envelopes", () => {
    expect(extractList({ data: [1] }, "shipments")).toEqual([1]);
    expect(extractList({ data: { shipments: [2] } }, "shipments")).toEqual([2]);
    expect(extractList({ success: true, data: {} }, "shipments")).toEqual([]);
  });
});


describe("shipment status machine", () => {
  it("never allows CREATED -> DELIVERED", () => {
    expect(getNextShipmentStatuses("CREATED")).toEqual([]);
    expect(getNextShipmentStatuses("COURIER_ASSIGNED")).not.toContain("DELIVERED");
    expect(getNextShipmentStatuses("IN_TRANSIT")).toEqual(["OUT_FOR_DELIVERY", "DELIVERED"]);
    expect(getNextShipmentStatuses("DELIVERED")).toEqual(["COMPLETED"]);
  });

  it("normalises DISPATCHED to IN_TRANSIT", () => {
    expect(normalizeShipmentStatus("dispatched")).toBe("IN_TRANSIT");
  });

  it("limits courier assignment and cancellation to early states", () => {
    expect(canAssignCourier("CREATED")).toBe(true);
    expect(canAssignCourier("IN_TRANSIT")).toBe(false);
    expect(canCancelShipment("PICKUP_SCHEDULED")).toBe(true);
    expect(canCancelShipment("PICKED_UP")).toBe(false);
  });

  it("reads trackingHistory oldest first", () => {
    const rows = getTrackingHistory({
      trackingHistory: [
        { status: "IN_TRANSIT", occurredAt: "2026-10-07T10:30:00Z", location: "Hyderabad Hub" },
        { status: "CREATED", occurredAt: "2026-10-06T10:00:00Z" },
      ],
    });
    expect(rows.map((r) => r.status)).toEqual(["CREATED", "IN_TRANSIT"]);
    expect(rows[1].location).toBe("Hyderabad Hub");
  });

  it("reads tracking fields from the documented shipment shape", () => {
    const info = extractTrackingInfo({
      shipment: {
        trackingNumber: "CP123456789IN",
        trackingUrl: "https://www.indiapost.gov.in/x",
        estimatedDelivery: "2026-10-12T18:00:00.000Z",
        courier: { provider: "manual", serviceName: "India Post" },
      },
    });
    expect(info).toMatchObject({ trackingNumber: "CP123456789IN", courierName: "India Post", estimatedDelivery: "2026-10-12T18:00:00.000Z" });
  });
});
