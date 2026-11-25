import api from "@/lib/api";
import { adminResponse } from "@/lib/admin-account-api";
import { record } from "@/lib/api-error";
import { extractTrackingInfo, getShipmentStatusPath, normalizeShipmentStatus } from "@/lib/tracking";

export async function fetchSavedShipment(id: string) {
  const { data } = await api.get(`/admin/shipments/${encodeURIComponent(id)}`, { cache: "no-store" });
  const envelope = record(adminResponse(data));
  const shipment = record(envelope.shipment ?? envelope);
  if ((shipment._id || shipment.id) !== id) {
    throw new Error("The saved shipment could not be confirmed. Refresh Shipments before retrying.");
  }
  return shipment;
}

/**
 * POST /admin/shipments/{_id}/assign-courier, also for correcting the AWB of a shipment that is
 * already on its way. If the backend resets such a shipment to COURIER_ASSIGNED, the progress
 * steps it already had are replayed so the order does not slide back from Shipped.
 */
export async function assignCourier(shipment: { _id?: string; id?: string; status?: unknown }, payload: Record<string, unknown>, source: string) {
  const shipmentId = shipment?._id || shipment?.id;
  if (!shipmentId) throw new Error("The shipment has no backend ID.");
  const before = normalizeShipmentStatus(shipment?.status);

  const { data } = await api.post(`/admin/shipments/${encodeURIComponent(shipmentId)}/assign-courier`, payload);
  adminResponse(data);
  const saved = await fetchSavedShipment(shipmentId);
  const tracking = extractTrackingInfo(saved);
  const expectedNumber = typeof payload.trackingNumber === "string" ? payload.trackingNumber.trim().toUpperCase() : "";
  const expectedProvider = typeof payload.courierName === "string" ? payload.courierName.trim().toLowerCase() : "";
  if ((expectedNumber && tracking.trackingNumber.toUpperCase() !== expectedNumber)
    || (expectedProvider && tracking.courierName.toLowerCase() !== expectedProvider)) {
    throw new Error("The saved courier details could not be confirmed. Refresh Shipments before retrying.");
  }
  const after = normalizeShipmentStatus(saved.status);

  const steps = getShipmentStatusPath(after, before);
  for (const status of steps) {
    const { data } = await api.post(`/admin/shipments/${encodeURIComponent(shipmentId)}/update-status`, {
      status,
      description: "Tracking details corrected",
      occurredAt: new Date().toISOString(),
      metadata: { source },
    });
    adminResponse(data);
  }
  return steps.length ? before : after;
}
