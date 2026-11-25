
import { describeApiError, record } from "@/lib/api-error";
import api, { getPublic, invalidateApiCache } from "@/lib/api";
import { categoryIsActive, findDuplicateCategory, parseCategoryPage, resolveCategoryId, type BackendCategory } from "@/lib/category-data";
import { notifyLiveChange } from "@/lib/live-sync";
export type { BackendCategory } from "@/lib/category-data";

let cachedCategories: BackendCategory[] | null = null;
let cachedAt = 0;
let fetchPromise: Promise<BackendCategory[]> | null = null;
let generation = 0;
let requestIndex = 0;

/** Reused for a minute at most, so a category an admin just added appears in forms and filters. */
const CACHE_MS = 60 * 1000;

/** Drop the cached list; called after any change in Admin → Categories. */
export function invalidateCategoryCache() {
  generation++;
  requestIndex++;
  cachedCategories = null;
  cachedAt = 0;
  fetchPromise = null;
  invalidateApiCache("/categories");
}

export function categoriesChanged(includeCurrentTab = true) {
  invalidateCategoryCache();
  notifyLiveChange("categories", includeCurrentTab);
}

export async function createBackendCategory(name: string, description: string): Promise<BackendCategory> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Category name is required.");
  const existing = await fetchAllCategories(true);
  if (findDuplicateCategory(existing, cleanName)) throw new Error("A category with this name already exists, including inactive categories.");
  const { data } = await api.post("/admin/categories", { name: cleanName, description: description.trim() });
  categoriesChanged();
  const payload = record(data);
  return parseCategoryPage({ data: [payload.data ?? payload.category ?? data] }).categories[0];
}

/** Explicit active filters include inactive records for admin duplicate checks and editing. */
export async function fetchAllCategories(admin = false): Promise<BackendCategory[]> {
  const categories = new Map<string, BackendCategory>();
  for (const active of admin ? [true, false] : [true]) {
    for (let page = 1; ; page++) {
      const params = { active, page, limit: 100 };
      const response = admin
        ? await api.get("/admin/categories", { params, cache: "no-store" })
        : await getPublic("/categories", { params });
      const parsed = parseCategoryPage(response.data);
      const previousSize = categories.size;
      parsed.categories.forEach((category) => categories.set(category._id, category));
      if (parsed.pages !== undefined ? page >= parsed.pages : parsed.categories.length < 100) break;
      if (page > 1000 || categories.size === previousSize) throw new Error("Category pagination did not advance. Please retry.");
    }
  }
  return Array.from(categories.values());
}

/**
 * Fetch all categories from backend API and cache them briefly.
 */
export async function fetchBackendCategories(forceRefresh = false): Promise<BackendCategory[]> {
  if (forceRefresh) invalidateCategoryCache();
  if (!forceRefresh && cachedCategories && Date.now() - cachedAt < CACHE_MS) {
    return cachedCategories;
  }

  if (!forceRefresh && fetchPromise) {
    return fetchPromise;
  }

  const requestGeneration = generation;
  const index = ++requestIndex;
  const request = (async () => {
    try {
      const list = (await fetchAllCategories()).filter(categoryIsActive);
      if (generation === requestGeneration) {
        cachedCategories = list;
        cachedAt = Date.now();
      }
      return list;
    } catch (err) {
      console.warn("Notice: Failed to fetch backend categories:", describeApiError(err));
      throw err;
    } finally {
      if (requestIndex === index) fetchPromise = null;
    }
  })();

  fetchPromise = request;
  return request;
}

/**
 * Resolves a category name or ID to a valid 24-character MongoDB ObjectId.
 * If no valid ObjectId can be found or created, returns undefined so Mongoose
 * does NOT throw a CastError ("Cast to ObjectId failed for value ... at path category").
 */
export async function resolveCategoryObjectId(
  categoryInput: string | null | undefined,
  fallbackId?: string | null
): Promise<string | undefined> {
  const cleanInput = (categoryInput || "").trim();

  // Verify identifiers against real categories instead of accepting arbitrary ObjectIds.
  const categories = await fetchBackendCategories();

  if (cleanInput) return resolveCategoryId(categories, cleanInput);
  if (fallbackId) return resolveCategoryId(categories, fallbackId);

  // Categories are created explicitly in the admin form, never invented during ID resolution.
  // This prevents sending invalid strings like "Fiction" that break Mongoose schema validation
  return undefined;
}

/**
 * Returns a human-friendly category display name.
 */
export function getCategoryDisplayName(
  categoryValue: unknown,
  categoriesList?: BackendCategory[]
): string {
  if (!categoryValue) return "Uncategorized";

  if (typeof categoryValue === "object" && categoryValue !== null) {
    const value = record(categoryValue);
    return typeof value.name === "string" ? value.name : typeof value.slug === "string" ? value.slug : "Uncategorized";
  }

  const strVal = String(categoryValue).trim();

  // If it's a 24-hex ObjectId, look up in categories list
  if (/^[0-9a-fA-F]{24}$/.test(strVal)) {
    const list = categoriesList || cachedCategories || [];
    const found = list.find((c) => c._id === strVal || c.id === strVal);
    if (found && found.name) {
      return found.name;
    }
  }

  return strVal || "General";
}
