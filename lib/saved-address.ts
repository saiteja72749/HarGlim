/**
 * Default delivery address, kept per user on this device.
 *
 * The backend user profile only stores name / bio / profilePicture (UserUpdateRequest),
 * so phone and address typed on the Profile page used to be silently dropped. They are
 * kept here instead and used to pre-fill checkout; each order still sends its own
 * shippingAddress to the backend.
 */
export interface SavedAddress {
  fullName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

const keyFor = (userId?: string | null) => `harglim:default-address:${userId || "guest"}`;

export function loadSavedAddress(userId?: string | null): SavedAddress | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as SavedAddress) : null;
  } catch {
    return null;
  }
}

export function saveAddress(userId: string | null | undefined, address: SavedAddress): boolean {
  try {
    const clean = Object.fromEntries(
      Object.entries(address).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
    );
    localStorage.setItem(keyFor(userId), JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}
