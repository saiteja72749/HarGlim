import { record } from "@/lib/api-error";
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

const firstString = (...values: unknown[]): string =>
  values.find((value): value is string => typeof value === "string" && Boolean(value.trim()))?.trim() || "";

export const extractList = <T = Record<string, unknown>>(input: unknown, key: string): T[] => {
  const payload = record(input), data = record(payload.data);
  const candidates = [data[key], payload[key], data.items, data.docs, payload.data, payload.items, input];
  return (candidates.find(Array.isArray) || []) as T[];
};

const getShipmentCandidates = (input: unknown) => {
  const source = record(input);
  return [source.shipment, source.shipmentDetails, source.shipping, source.fulfillment, source.delivery,
    ...(Array.isArray(source.shipments) ? source.shipments : [])]
    .filter((value) => value && typeof value === 'object').map(record);
};
const getLatestTrackingEvent = (shipment: Record<string, unknown>) => {
  const events = Array.isArray(shipment.tracking) ? shipment.tracking : [];
  return record(events[events.length - 1]);
};

/** Works for an order (with or without merged shipment) or a raw shipment document. */
export function extractTrackingInfo(input: unknown): TrackingInfo {
  const source = record(input);
  if (!input || typeof input !== "object") {
    return { trackingNumber: "", courierName: "", trackingUrl: "", estimatedDelivery: "" };
  }

  // A raw shipment is its own candidate; an order carries the shipment nested.
  const shipment = getShipmentCandidates(source)[0] || source;
  const courier = record(
    (typeof shipment.courier === 'object' && shipment.courier) ||
    (typeof source.courier === 'object' && source.courier) || source.courierDetails
  );
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
export const getOrderMatchKeys = (input: unknown): string[] => {
  const value = record(input), order = record(value.order);
  return [value._id, value.id, value.orderId, value.orderNumber,
    typeof value.order === 'string' ? value.order : '', order._id, order.id, order.orderNumber]
    .filter(Boolean).map(String);
};

/** Exclude a shipment's own ID when matching it to an order. */
const getShipmentOrderKeys = (input: unknown): string[] => {
  const shipment = record(input), order = record(shipment.order);
  return [shipment.orderId, shipment.orderNumber, typeof shipment.order === 'string' ? shipment.order : '', order._id, order.id, order.orderNumber]
    .filter(Boolean).map(String);
};

export const shipmentBelongsToOrder = (shipment: unknown, order: unknown) => {
  const orderKeys = new Set(getOrderMatchKeys(order).filter((key) => key !== String(record(shipment)._id || "")));
  return getShipmentOrderKeys(shipment).some((key) => orderKeys.has(key));
};

export function mergeShipmentsIntoOrders<T extends object>(orders: T[], shipments: unknown[]): Array<T & { shipment?: Record<string, unknown> }> {
  if (!shipments.length) return orders;

  const byOrderKey = new Map<string, Record<string, unknown>>();
  shipments.forEach((shipment) => {
    getShipmentOrderKeys(shipment).forEach((key) => byOrderKey.set(key, record(shipment)));
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
  TRACKING_UPDATED: "Tracking Details Updated",
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
export function getTrackingHistory(input: unknown): { status: string; description?: string; location?: string; occurredAt?: string }[] {
  const source = record(input);
  const shipment = record(source.shipment);
  const raw =
    (Array.isArray(source?.trackingHistory) && source.trackingHistory) ||
    (Array.isArray(source?.trackingUpdates) && source.trackingUpdates) ||
    (Array.isArray(shipment.tracking) && shipment.tracking) ||
    (Array.isArray(source?.tracking) && source.tracking) ||
    [];
  return raw
    .map(record).map((e) => ({
      status: normalizeShipmentStatus(e.status || e.event || e.currentStatus),
      description: firstString(e.description, e.message, e.note),
      location: firstString(e.location),
      occurredAt: firstString(e.occurredAt, e.timestamp, e.createdAt, e.date),
    }))
    .sort((a, b) => new Date(a.occurredAt || 0).getTime() - new Date(b.occurredAt || 0).getTime());
}

/** Shipment still on the road (or not yet picked up), so its courier/AWB can be corrected. */
const TRACKING_EDITABLE_STATUSES = ["CREATED", "COURIER_ASSIGNED", "PICKUP_SCHEDULED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"];
export const canEditTracking = (status: unknown) => TRACKING_EDITABLE_STATUSES.includes(normalizeShipmentStatus(status));

/**
 * update-status steps that lead from `from` to `to` (excluding `from`), or [] when `to` is not
 * reachable. Used to put a dispatched shipment back where it was if re-assigning the courier
 * resets it to COURIER_ASSIGNED.
 */
export function getShipmentStatusPath(from: unknown, to: unknown): string[] {
  const start = normalizeShipmentStatus(from);
  const goal = normalizeShipmentStatus(to);
  if (start === goal) return [];
  const previous = new Map<string, string>([[start, ""]]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const next of NEXT_SHIPMENT_STATUSES[current] || []) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      if (next === goal) {
        const path = [next];
        for (let step = current; step !== start; step = previous.get(step)!) path.unshift(step);
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

/**
 * Keeps a tracking URL in step with an edited tracking number: a courier-generated URL wins,
 * otherwise an old URL that embedded the previous number gets the new one swapped in.
 */
export function nextTrackingUrl(courier: string, previousNumber: string, nextNumber: string, previousUrl: string): string {
  const generated = resolveCourierTrackingUrl(courier, nextNumber);
  if (generated) return generated;
  if (previousNumber && previousUrl.includes(previousNumber)) {
    return nextNumber ? previousUrl.split(previousNumber).join(nextNumber) : "";
  }
  return previousUrl;
}
