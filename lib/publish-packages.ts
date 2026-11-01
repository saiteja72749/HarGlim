import api from "@/lib/api";
import { notifyLiveChange, onLiveChange } from "@/lib/live-sync";

/**
 * Publishing packages: one source of truth, the backend PublishPackage records.
 *
 *   Admin → Publishing Packages  →  POST/PATCH/DELETE /admin/publish-packages
 *   Publish page, manuscript form →  GET /publish-packages (active only)
 *
 * A package's `_id` is the packageId sent on manuscript submission. Site Content `packagesJson`
 * is legacy card text; it is only read by the admin's one-time "Import from Site Content".
 */

export type PackageCard = {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  tagline?: string;
  price: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  sortOrder?: number;
  isActive?: boolean;
  updatedAt?: string;
};

/**
 * Accepts a package array or the wrapped `[{ packages: [...] }]` shape of CMS packagesJson,
 * drops inactive ones and turns text prices like "₹999/-" into numbers.
 */
export function normalizePackages(raw: any): PackageCard[] {
  let list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.packages) ? raw.packages : [];
  if (list.length > 0 && list.every((item) => Array.isArray(item?.packages))) {
    list = list.flatMap((item) => item.packages);
  }
  return list
    .filter((p) => p?.name && p.isActive !== false)
    .map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
      price: typeof p.price === "number" ? p.price : Number(String(p.price ?? "").replace(/[^0-9.]/g, "")) || 0,
    }));
}

/** packagesJson parsed into cards; [] when it is missing or not valid JSON. */
export function parsePackagesJson(json: string | undefined): PackageCard[] {
  try {
    return json ? normalizePackages(JSON.parse(json)) : [];
  } catch {
    return [];
  }
}

const sortKey = (p: PackageCard) => (typeof p.sortOrder === "number" && p.sortOrder > 0 ? p.sortOrder : Number.MAX_SAFE_INTEGER);

/** Display order everywhere (Publish page, manuscript form, admin list): sortOrder 1, 2, … then unset, then price. */
export const sortPackages = <T extends PackageCard>(list: T[]) => [...list].sort((a, b) => sortKey(a) - sortKey(b) || a.price - b.price);

/** Active packages in display order. Throws when the request fails, so pages can show a retry. */
export async function fetchPublicPackages(): Promise<PackageCard[]> {
  const { data } = await api.get("/publish-packages", { cache: "no-store" } as any);
  return sortPackages(normalizePackages(data?.data ?? data));
}

/** Reload packages when an admin saves them in another tab, or when this tab regains focus. */
export const onPackagesChanged = (reload: () => void) => onLiveChange("publish-packages", reload);

/** Called by the admin page after every successful create, edit, archive or restore. */
export const notifyPackagesChanged = () => notifyLiveChange("publish-packages");

export type PackageForm = {
  name: string;
  description: string;
  price: string;
  features: string;
  isActive: boolean;
  tagline: string;
  highlighted: boolean;
  badge: string;
  sortOrder: string;
};

export const emptyPackageForm: PackageForm = {
  name: "",
  description: "",
  price: "",
  features: "",
  isActive: true,
  tagline: "",
  highlighted: false,
  badge: "",
  sortOrder: "",
};

/** The form as a card, for the admin's live preview. */
export const formToCard = (form: PackageForm): PackageCard => ({
  name: form.name,
  description: form.description,
  tagline: form.tagline,
  price: Number(form.price) || 0,
  features: form.features.split("\n").map((line) => line.trim()).filter(Boolean),
  highlighted: form.highlighted,
  badge: form.badge,
});

/**
 * Validates the admin form against the backend contract (PublishPackageCreateRequest) and returns
 * the request body, or the first problem to show.
 */
export function packagePayload(
  form: PackageForm,
  others: Pick<PackageCard, "_id" | "name">[]
): { error: string } | { payload: Record<string, unknown> } {
  const name = form.name.trim();
  const description = form.description.trim();
  const price = Number(form.price);
  const sortOrder = form.sortOrder.trim() === "" ? 0 : Number(form.sortOrder);

  if (!name) return { error: "Name is required." };
  if (others.some((p) => p.name.trim().toLowerCase() === name.toLowerCase())) {
    return { error: `A package named "${name}" already exists.` };
  }
  if (!description) return { error: "Description is required." };
  if (form.price.trim() === "" || !Number.isFinite(price) || price < 0) return { error: "Price must be a number of 0 or more." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0) return { error: "Display order must be a whole number of 0 or more." };

  return {
    payload: {
      name,
      description,
      price,
      features: form.features.split("\n").map((line) => line.trim()).filter(Boolean),
      isActive: form.isActive,
      tagline: form.tagline.trim(),
      highlighted: form.highlighted,
      // Empty strings (not undefined) so clearing a field on edit is saved.
      badge: form.highlighted ? form.badge.trim() : "",
      sortOrder,
    },
  };
}

const nameKey = (v: unknown) => String(v ?? "").trim().toLowerCase();

/**
 * Create payloads for the Site Content cards that have no real package of the same name yet.
 * sortOrder follows the card order, so the Publish page keeps the order admins set there.
 */
export function packagesToImport(cards: PackageCard[], existing: PackageCard[]) {
  return cards
    .map((card, idx) => ({ card, sortOrder: idx + 1 }))
    .filter(({ card }) => !existing.some((rp) => nameKey(rp.name) === nameKey(card.name)))
    .map(({ card, sortOrder }) => ({
      name: card.name.trim(),
      description: (card.description || card.tagline || `${card.name.trim()} publishing package`).trim(),
      price: card.price,
      features: card.features,
      tagline: card.tagline?.trim() || "",
      highlighted: Boolean(card.highlighted),
      badge: card.highlighted ? card.badge?.trim() || "" : "",
      sortOrder,
      isActive: true,
    }));
}
