import api from "@/lib/api";

export interface BackendCategory {
  _id: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  active?: boolean;
}

let cachedCategories: BackendCategory[] | null = null;
let fetchPromise: Promise<BackendCategory[]> | null = null;

/**
 * Fetch all categories from backend API and cache them.
 */
export async function fetchBackendCategories(forceRefresh = false): Promise<BackendCategory[]> {
  if (!forceRefresh && cachedCategories && cachedCategories.length > 0) {
    return cachedCategories;
  }

  if (!forceRefresh && fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const res = await api.get("/categories", { params: { limit: 100 } }).catch(() =>
        api.get("/admin/categories", { params: { limit: 100 } })
      );

      const data = res?.data;
      const rawList =
        data?.data?.categories ||
        data?.categories ||
        (Array.isArray(data?.data) ? data.data : []) ||
        (Array.isArray(data) ? data : []);

      const list: BackendCategory[] = Array.isArray(rawList)
        ? rawList.map((c: any) => ({
            _id: c._id || c.id || "",
            id: c._id || c.id || "",
            name: c.name || "",
            slug: c.slug || "",
            description: c.description || "",
            active: c.active ?? true,
          }))
        : [];

      cachedCategories = list;
      return list;
    } catch (err) {
      console.warn("Notice: Failed to fetch backend categories:", err);
      return cachedCategories || [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
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

  // 1. If it's already a valid 24-character hex ObjectId, return directly
  if (/^[0-9a-fA-F]{24}$/.test(cleanInput)) {
    return cleanInput;
  }

  // 2. Fetch categories from backend to match by name or slug
  const categories = await fetchBackendCategories();

  if (cleanInput) {
    const inputLower = cleanInput.toLowerCase();
    const matched = categories.find(
      (c) =>
        c.name.toLowerCase() === inputLower ||
        (c.slug && c.slug.toLowerCase() === inputLower) ||
        c._id === cleanInput
    );

    if (matched && /^[0-9a-fA-F]{24}$/.test(matched._id)) {
      return matched._id;
    }
  }

  // 3. Check fallback ID
  const cleanFallback = (fallbackId || "").trim();
  if (/^[0-9a-fA-F]{24}$/.test(cleanFallback)) {
    return cleanFallback;
  }

  // 4. Try auto-creating category in backend if cleanInput is provided
  if (cleanInput) {
    try {
      const createRes = await api.post("/admin/categories", {
        name: cleanInput,
        description: `Auto-created category for ${cleanInput}`,
      });

      const created = createRes?.data?.data || createRes?.data?.category || createRes?.data;
      const createdId = created?._id || created?.id;
      if (createdId && /^[0-9a-fA-F]{24}$/.test(createdId)) {
        // Refresh cache
        await fetchBackendCategories(true);
        return createdId;
      }
    } catch {
      // Ignore creation error
    }
  }

  // 5. Return undefined if no valid ObjectId could be found
  // This prevents sending invalid strings like "Fiction" that break Mongoose schema validation
  return undefined;
}

/**
 * Returns a human-friendly category display name.
 */
export function getCategoryDisplayName(
  categoryValue: any,
  categoriesList?: BackendCategory[]
): string {
  if (!categoryValue) return "Uncategorized";

  if (typeof categoryValue === "object" && categoryValue !== null) {
    return categoryValue.name || categoryValue.slug || "General";
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
