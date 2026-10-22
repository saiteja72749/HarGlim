import api from "@/lib/api";
import { getShipmentStatusPath, normalizeShipmentStatus } from "@/lib/tracking";

/**
 * POST /admin/shipments/{_id}/assign-courier, also for correcting the AWB of a shipment that is
 * already on its way. If the backend resets such a shipment to COURIER_ASSIGNED, the progress
 * steps it already had are replayed so the order does not slide back from Shipped.
 */
export async function assignCourier(shipment: any, payload: Record<string, any>, source: string) {
  const shipmentId = shipment?._id || shipment?.id;
  const before = normalizeShipmentStatus(shipment?.status);

  const { data } = await api.post(`/admin/shipments/${shipmentId}/assign-courier`, payload);
  const returned = data?.data?.status ?? data?.status;
  const after = returned ? normalizeShipmentStatus(returned) : before;

  for (const status of getShipmentStatusPath(after, before)) {
    await api.post(`/admin/shipments/${shipmentId}/update-status`, {
      status,
      description: "Tracking details corrected",
      occurredAt: new Date().toISOString(),
      metadata: { source },
    });
  }
}
