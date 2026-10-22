/**
 * Publishing packages, shared by the Publish page and Admin → Publishing Packages.
 *
 * GET /publish-packages (public) and /admin/publish-packages hold the real records; their `_id`
 * is the packageId sent on manuscript submission. Site Content `packagesJson` is the older copy
 * of the Publish page cards, used until the real packages carry their own card copy.
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
  isRealPackage?: boolean;
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

/**
 * True once an admin has given a real package its Publish page card copy. The backend returns
 * tagline / highlighted / badge / sortOrder on every package (empty by default), so their mere
 * presence says nothing; only filled-in values switch the Publish page to the real packages.
 */
export const hasCardCopy = (p: Partial<PackageCard>) =>
  Boolean(p.tagline?.trim() || p.badge?.trim() || p.highlighted === true || (typeof p.sortOrder === "number" && p.sortOrder > 0));

const sortKey = (p: PackageCard) => (typeof p.sortOrder === "number" && p.sortOrder > 0 ? p.sortOrder : Number.MAX_SAFE_INTEGER);

/** Real packages in Publish page order: sortOrder first (unset last), then price. */
export const sortPackages = (list: PackageCard[]) => [...list].sort((a, b) => sortKey(a) - sortKey(b) || a.price - b.price);

const nameKey = (v: unknown) => String(v ?? "").trim().toLowerCase();

/** The real package with the card's _id/id, else the same name. Never by price alone. */
export const findRealPackage = (card: PackageCard, real: PackageCard[]) =>
  real.find((rp) => (card._id || card.id) && rp._id === (card._id || card.id)) ||
  real.find((rp) => nameKey(rp.name) === nameKey(card.name));

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
      badge: card.badge?.trim() || "",
      sortOrder,
      isActive: true,
    }));
}
