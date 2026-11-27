import api from "@/lib/api";
import { record } from "@/lib/api-error";

export type CourierCapability = {
  provider: string;
  label: string;
  available: boolean;
  mode: string;
  status: string;
  supportsAutomaticBooking: boolean;
  supportsManualTracking: boolean;
};

export function parseCourierCapabilities(input: unknown): CourierCapability[] {
  const payload = record(input).data ?? input;
  const data = record(payload);
  const list = Array.isArray(payload) ? payload : data.providers ?? data.couriers;
  if (!Array.isArray(list)) throw new Error("The API did not return courier capabilities.");
  const seen = new Set<string>();
  return list.map((row: unknown) => {
    const item = record(row);
    const provider = item.provider ?? item.id ?? item.key;
    const label = item.label ?? item.name ?? item.serviceName ?? provider;
    const { available, mode, status, supportsAutomaticBooking, supportsManualTracking } = item;
    if (typeof provider !== "string" || !provider.trim() || seen.has(provider) ||
      typeof label !== "string" || !label.trim() || typeof available !== "boolean" ||
      typeof mode !== "string" || !mode.trim() || typeof status !== "string" || !status.trim() ||
      typeof supportsAutomaticBooking !== "boolean" || typeof supportsManualTracking !== "boolean") {
      throw new Error("The API returned incomplete courier capabilities.");
    }
    seen.add(provider);
    return { provider, label, available, mode, status, supportsAutomaticBooking, supportsManualTracking };
  });
}

export const canEnterTracking = (courier: CourierCapability) => courier.available &&
  courier.supportsManualTracking && !/^(NOT_CONFIGURED|UNAVAILABLE|DISABLED)$/i.test(courier.status);

export async function fetchCourierCapabilities() {
  const { data } = await api.get("/admin/shipments/couriers", { cache: "no-store" });
  return parseCourierCapabilities(data);
}
