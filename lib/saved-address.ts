import api from "@/lib/api";

/**
 * Saved delivery addresses: GET / PUT /users/me/addresses.
 *
 * PUT replaces the whole list (max 10). Existing entries keep their `_id`; the backend
 * keeps exactly one default (the first one when none is flagged). Saving an address never
 * creates or changes an order; checkout copies the chosen address into shippingAddress.
 */
export interface SavedAddress {
  _id?: string;
  label?: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault?: boolean;
}

export const MAX_SAVED_ADDRESSES = 10;

const ADDRESS_FIELDS = [
  "_id",
  "label",
  "fullName",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "phone",
  "email",
  "isDefault",
] as const;

const clean = (address: Partial<SavedAddress>): SavedAddress => {
  const out: Record<string, unknown> = {};
  for (const key of ADDRESS_FIELDS) {
    const value = address[key];
    if (typeof value === "string") {
      if (value.trim()) out[key] = value.trim();
    } else if (value !== undefined && value !== null) {
      out[key] = value;
    }
  }
  return out as unknown as SavedAddress;
};

export async function fetchSavedAddresses(): Promise<SavedAddress[]> {
  const { data } = await api.get("/users/me/addresses", { cache: "no-store" } as any);
  const list = data?.data ?? data?.addresses ?? [];
  return Array.isArray(list) ? list : [];
}

export async function saveAddresses(addresses: Partial<SavedAddress>[]): Promise<SavedAddress[]> {
  const { data } = await api.put("/users/me/addresses", {
    addresses: addresses.slice(0, MAX_SAVED_ADDRESSES).map(clean),
  });
  const list = data?.data ?? data?.addresses ?? [];
  return Array.isArray(list) ? list : [];
}

export const getDefaultAddress = (addresses: SavedAddress[]) =>
  addresses.find((a) => a.isDefault) || addresses[0] || null;

const sameAddress = (a: Partial<SavedAddress>, b: Partial<SavedAddress>) =>
  ["fullName", "addressLine1", "addressLine2", "city", "state", "postalCode", "country", "phone"].every(
    (key) =>
      String((a as any)[key] || "").trim().toLowerCase() === String((b as any)[key] || "").trim().toLowerCase()
  );

/**
 * Returns the list to PUT after saving `address` as the default: updates the entry with
 * the same `_id` (or identical fields), otherwise adds it. Returns null when nothing changes.
 */
export function withDefaultAddress(
  addresses: SavedAddress[],
  address: Partial<SavedAddress>
): Partial<SavedAddress>[] | null {
  const index = addresses.findIndex(
    (a) => (address._id && a._id === address._id) || sameAddress(a, address)
  );
  if (index >= 0) {
    const existing = addresses[index];
    const unchanged = existing.isDefault && sameAddress(existing, address) && (existing.email || "") === (address.email || existing.email || "");
    if (unchanged) return null;
  }
  if (index < 0 && addresses.length >= MAX_SAVED_ADDRESSES) return null;

  const merged = index >= 0 ? { ...addresses[index], ...address, _id: addresses[index]._id } : { ...address };
  const others = addresses.filter((_, i) => i !== index).map((a) => ({ ...a, isDefault: false }));
  return [{ ...merged, isDefault: true }, ...others];
}
