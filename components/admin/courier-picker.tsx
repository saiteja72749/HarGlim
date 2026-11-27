"use client";

import { Button } from "@/components/ui/button";
import { useApiResource } from "@/hooks/use-api-resource";
import { canEnterTracking, fetchCourierCapabilities, type CourierCapability } from "@/lib/courier-capabilities";

export function useCourierCapabilities(open: boolean) {
  return useApiResource(open ? "courier-capabilities" : null, fetchCourierCapabilities);
}

export function CourierPicker({ resource, value, select, disabled }: {
  resource: ReturnType<typeof useCourierCapabilities>;
  value: string;
  select: (courier: CourierCapability) => void;
  disabled: boolean;
}) {
  const options = resource.data?.filter(canEnterTracking) ?? [];
  if (resource.error) return <div role="alert" className="space-y-2">
    <p>{resource.error.response?.status === 403 ? "You do not have permission to view courier capabilities." : "Courier capabilities could not load."}</p>
    <Button type="button" variant="outline" disabled={disabled || resource.loading} onClick={resource.reload}>Retry</Button>
  </div>;
  if (resource.loading) return <p role="status">Loading courier capabilities…</p>;
  if (!options.length) return <p role="status">No configured courier accepts manual tracking.</p>;
  return <label className="block space-y-1">
    <span className="font-semibold">Courier provider</span>
    <select required value={options.some((option) => option.provider === value) ? value : ""} disabled={disabled}
      className="block min-h-10 w-full rounded-lg border bg-background px-3"
      onChange={(event) => {
        const selected = options.find((option) => option.provider === event.target.value);
        if (selected) select(selected);
      }}>
      <option value="" disabled>Select a configured provider</option>
      {options.map((courier) => <option key={courier.provider} value={courier.provider}>
        {courier.label} ({courier.mode}, {courier.status})
      </option>)}
    </select>
  </label>;
}
