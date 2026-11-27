import api from "@/lib/api";
import { adminResponse } from "@/lib/admin-account-api";
import { record, UnconfirmedWriteError } from "@/lib/api-error";
import { extractTrackingInfo, normalizeShipmentStatus } from "@/lib/tracking";
import type { components } from "@/types/openapi.generated";
import { notifyLiveChange } from "@/lib/live-sync";

export async function fetchSavedShipment(id: string) {
  const { data } = await api.get(`/admin/shipments/${encodeURIComponent(id)}`, { cache: "no-store" });
  const envelope = record(adminResponse(data));
  const shipment = record(envelope.shipment ?? envelope);
  if ((shipment._id || shipment.id) !== id) {
    throw new Error("The saved shipment could not be confirmed. Refresh Shipments before retrying.");
  }
  return shipment;
}

export async function assignCourier(shipment: { _id?: string; id?: string; status?: unknown }, payload: components["schemas"]["CourierAssignRequest"]) {
  const shipmentId = shipment?._id || shipment?.id;
  if (!shipmentId) throw new Error("The shipment has no backend ID.");
  const before = normalizeShipmentStatus(shipment?.status);

  const { data } = await api.post(`/admin/shipments/${encodeURIComponent(shipmentId)}/assign-courier`, payload);
  adminResponse(data);
  const saved = await fetchSavedShipment(shipmentId).catch(() => {
    throw new UnconfirmedWriteError("The API acknowledged the courier save, but readback failed. Check Shipments before retrying.");
  });
  const tracking = extractTrackingInfo(saved);
  const expectedNumber = typeof payload.trackingNumber === "string" ? payload.trackingNumber.trim().toUpperCase() : "";
  const expectedService = payload.courierName?.trim().toLowerCase();
  const savedProvider = record(saved.courier).provider ?? saved.provider;
  if ((expectedNumber && tracking.trackingNumber.toUpperCase() !== expectedNumber)
    || (expectedService && tracking.courierName.toLowerCase() !== expectedService)
    || (payload.provider && savedProvider !== payload.provider)
    || (payload.trackingUrl && tracking.trackingUrl !== payload.trackingUrl)) {
    throw new UnconfirmedWriteError("The saved courier details could not be confirmed. Refresh Shipments before retrying.");
  }
  const after = normalizeShipmentStatus(saved.status);

  if (["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(before) && after === "COURIER_ASSIGNED") {
    throw new UnconfirmedWriteError("Tracking was saved, but the shipment status regressed. Check the shipment history before making another change.");
  }
  notifyLiveChange("shipments");
  return after;
}
