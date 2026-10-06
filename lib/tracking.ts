import { resolveCourierTrackingUrl } from "@/lib/couriers";
import { getSafeExternalUrl } from "@/lib/utils";

/**
 * Shared tracking helpers.
 *
 * Backend contract (HM handover):
 *  - Tracking is written ONLY via POST /admin/shipments/{shipmentId}/assign-courier
 *    (CourierAssignRequest: provider, serviceName, trackingNumber, trackingUrl, estimatedDelivery).
 *  - The Shipment document stores it under `courier` and a `tracking[]` event array.
 *  - PUT /admin/orders/{id}/status (StatusUpdateRequest) does NOT accept tracking fields.
 *
 * Older records / list DTOs may still expose flattened fields, so every reader goes
 * through `extractTrackingInfo` instead of guessing field names locally.
 */

export interface TrackingInfo {
  trackingNumber: string;
  courierName: string;
  trackingUrl: string;
  estimatedDelivery: string;
}

const firstString = (...values: any[]): string =>
  values.find((value) => typeof value === "string" && value.trim())?.trim() || "";

export const extractList = (payload: any, key: string): any[] => {
  const candidates = [
    payload?.data?.[key],
    payload?.[key],
    payload?.data?.items,
    payload?.data?.docs,
    payload?.data,
    payload?.items,
    payload,
  ];
  return candidates.find(Array.isArray) || [];
};

const getShipmentCandidates = (source: any) =>
  [
    source?.shipment,
    source?.shipmentDetails,
    source?.shipping,
    source?.fulfillment,
    source?.delivery,
    ...(Array.isArray(source?.shipments) ? source.shipments : []),
  ].filter((value) => value && typeof value === "object");

const getLatestTrackingEvent = (shipment: any) => {
  const events = Array.isArray(shipment?.tracking) ? shipment.tracking : [];
  return events[events.length - 1] || {};
};

/** Works for an order (with or without merged shipment) or a raw shipment document. */
export function extractTrackingInfo(source: any): TrackingInfo {
  if (!source || typeof source !== "object") {
    return { trackingNumber: "", courierName: "", trackingUrl: "", estimatedDelivery: "" };
  }

  // A raw shipment is its own candidate; an order carries the shipment nested.
  const shipment = getShipmentCandidates(source)[0] || source;
  const courier =
    (typeof shipment.courier === "object" && shipment.courier) ||
    (typeof source.courier === "object" && source.courier) ||
    source.courierDetails ||
    {};
  const event = getLatestTrackingEvent(shipment);

  const trackingNumber = firstString(
    courier.trackingNumber,
    courier.trackingId,
    courier.awb,
    courier.awbNumber,
    shipment.trackingNumber,
    shipment.trackingId,
    shipment.awb,
    shipment.awbNumber,
    shipment.consignmentNumber,
    source.tracking_id,
    source.trackingId,
    source.trackingNumber,
    source.awbNumber,
    source.awb,
    source.consignmentNumber,
    event.trackingNumber,
    event.trackingId,
    event.awb
  );

  const courierName = firstString(
    courier.serviceName,
    courier.courierName,
    courier.name,
    shipment.serviceName,
    shipment.courierName,
    shipment.carrier,
    typeof shipment.courier === "string" ? shipment.courier : "",
    source.courier_name,
    source.courierName,
    typeof source.courier === "string" ? source.courier : "",
    source.carrier,
    event.courierName,
    event.serviceName,
    // provider defaults to "manual" on the backend, so only use it as a last resort
    courier.provider && courier.provider !== "manual" ? courier.provider : ""
  );

  const directUrl = getSafeExternalUrl(
    firstString(
      courier.trackingUrl,
      courier.tracking_url,
      courier.trackingLink,
      shipment.trackingUrl,
      shipment.tracking_url,
      shipment.trackingLink,
      source.tracking_url,
      source.trackingUrl,
      source.trackingLink,
      event.trackingUrl,
      event.tracking_url
    )
  );

  return {
    trackingNumber,
    courierName,
    trackingUrl: directUrl || resolveCourierTrackingUrl(courierName, trackingNumber),
    estimatedDelivery: firstString(courier.estimatedDelivery, shipment.estimatedDelivery, source.estimatedDelivery),
  };
}

/** All ids/numbers an order or shipment can be matched on. */
export const getOrderMatchKeys = (record: any): string[] =>
  [
    record?._id,
    record?.id,
    record?.orderId,
    record?.orderNumber,
    typeof record?.order === "string" ? record.order : "",
    typeof record?.order === "object" ? record.order?._id : "",
    typeof record?.order === "object" ? record.order?.id : "",
    typeof record?.order === "object" ? record.order?.orderNumber : "",
  ]
    .filter(Boolean)
    .map((value) => String(value));

/** Shipment keys only — excludes the shipment's own _id so it can't collide with an order id. */
const getShipmentOrderKeys = (shipment: any): string[] =>
  [
    shipment?.orderId,
    shipment?.orderNumber,
    typeof shipment?.order === "string" ? shipment.order : "",
    typeof shipment?.order === "object" ? shipment.order?._id : "",
    typeof shipment?.order === "object" ? shipment.order?.id : "",
    typeof shipment?.order === "object" ? shipment.order?.orderNumber : "",
  ]
    .filter(Boolean)
    .map((value) => String(value));

export const shipmentBelongsToOrder = (shipment: any, order: any) => {
  const orderKeys = new Set(getOrderMatchKeys(order).filter((key) => key !== String(shipment?._id || "")));
  return getShipmentOrderKeys(shipment).some((key) => orderKeys.has(key));
};

export function mergeShipmentsIntoOrders(orders: any[], shipments: any[]) {
  if (!shipments.length) return orders;

  const byOrderKey = new Map<string, any>();
  shipments.forEach((shipment) => {
    getShipmentOrderKeys(shipment).forEach((key) => byOrderKey.set(key, shipment));
  });

  return orders.map((order) => {
    const shipment = getOrderMatchKeys(order)
      .map((key) => byOrderKey.get(key))
      .find(Boolean);
    return shipment ? { ...order, shipment } : order;
  });
}

/* ------------------------------------------------------------------ */
/* Shipment status machine (tracking handover)                         */
/* ------------------------------------------------------------------ */

export const SHIPMENT_LABELS: Record<string, string> = {
  CREATED: "Shipment Created",
  COURIER_ASSIGNED: "Courier Assigned",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "Return Requested",
  RETURNED: "Returned",
};

/** Progress moves allowed via POST /admin/shipments/{_id}/update-status (cancel has its own endpoint). */
export const NEXT_SHIPMENT_STATUSES: Record<string, string[]> = {
  CREATED: [], // must assign a courier first
  COURIER_ASSIGNED: ["PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT"],
  PICKUP_SCHEDULED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["COMPLETED"],
};

const CANCELLABLE_SHIPMENT_STATUSES = ["CREATED", "COURIER_ASSIGNED", "PICKUP_SCHEDULED"];

export function normalizeShipmentStatus(status: unknown): string {
  const s = String(status || "CREATED").toUpperCase().replace(/[\s-]+/g, "_");
  return s === "DISPATCHED" ? "IN_TRANSIT" : s;
}

export const getShipmentLabel = (status: unknown) => {
  const s = normalizeShipmentStatus(status);
  return SHIPMENT_LABELS[s] || s.replace(/_/g, " ").toLowerCase();
};
export const getNextShipmentStatuses = (status: unknown) => NEXT_SHIPMENT_STATUSES[normalizeShipmentStatus(status)] || [];
/** CREATED -> COURIER_ASSIGNED; re-assigning is only sensible before pickup. */
export const canAssignCourier = (status: unknown) =>
  ["CREATED", "COURIER_ASSIGNED"].includes(normalizeShipmentStatus(status));
export const canCancelShipment = (status: unknown) =>
  CANCELLABLE_SHIPMENT_STATUSES.includes(normalizeShipmentStatus(status));

/** Timeline rows from GET /orders/{id}/tracking (trackingHistory) or a shipment's tracking[] array. */
export function getTrackingHistory(source: any): { status: string; description?: string; location?: string; occurredAt?: string }[] {
  const raw =
    (Array.isArray(source?.trackingHistory) && source.trackingHistory) ||
    (Array.isArray(source?.trackingUpdates) && source.trackingUpdates) ||
    (Array.isArray(source?.shipment?.tracking) && source.shipment.tracking) ||
    (Array.isArray(source?.tracking) && source.tracking) ||
    [];
  return raw
    .map((e: any) => ({
      status: normalizeShipmentStatus(e.status || e.event || e.currentStatus),
      description: e.description || e.message || e.note,
      location: e.location,
      occurredAt: e.occurredAt || e.timestamp || e.createdAt || e.date,
    }))
    .sort((a: any, b: any) => new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime());
}
