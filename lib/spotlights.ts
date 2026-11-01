import api from "@/lib/api";

/**
 * Spotlight: author photos / testimonials uploaded by an admin and served by
 * GET /spotlights?page&limit → { data: [{ _id, image, thumbnail, author_name, caption, ... }], pagination }
 * (active items only, limit at most 60). Admin routes are in app/admin/spotlights.
 */

export type Spotlight = {
  id: string;
  image: string;
  thumbnail: string;
  authorName: string;
  caption: string;
};

export type SpotlightPage = { items: Spotlight[]; hasMore: boolean };

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** One API record → a Spotlight; null when it has no usable image. */
export function normalizeSpotlight(raw: any, index: number): Spotlight | null {
  const image = text(raw?.image) || text(raw?.imageUrl) || text(raw?.url);
  const thumbnail = text(raw?.thumbnail) || text(raw?.thumbnailUrl) || image;
  if (!image && !thumbnail) return null;
  return {
    id: String(raw?._id ?? raw?.id ?? `${image || thumbnail}#${index}`),
    image: image || thumbnail,
    thumbnail,
    authorName: text(raw?.author_name) || text(raw?.authorName) || text(raw?.author?.name),
    caption: text(raw?.caption),
  };
}

/** Accepts a bare array or `{ data: [...] }` / `{ data: { items | spotlights: [...] } }`. */
export function parseSpotlightResponse(payload: any, page: number, limit: number): SpotlightPage {
  const candidates = [payload?.data?.items, payload?.data?.spotlights, payload?.data, payload?.items, payload?.results, payload];
  const list: any[] = candidates.find(Array.isArray) || [];
  const items = list.map(normalizeSpotlight).filter((s): s is Spotlight => s !== null);

  const pagination = payload?.pagination ?? payload?.data?.pagination ?? payload?.meta;
  let hasMore: boolean;
  if (typeof pagination?.pages === "number") hasMore = page < pagination.pages;
  else if (typeof pagination?.total === "number") hasMore = page * limit < pagination.total;
  else if ("next" in (payload || {})) hasMore = Boolean(payload.next);
  else hasMore = list.length >= limit;
  return { items, hasMore };
}

/** Limits the backend applies to POST and PATCH /admin/spotlights. */
export const SPOTLIGHT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SPOTLIGHT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type SpotlightForm = { authorName: string; caption: string; sortOrder: string; isActive: boolean };

/** The first problem with the admin form, or null. A new spotlight must have an image. */
export function spotlightFormError(form: SpotlightForm, file: Pick<File, "type" | "size"> | null, isNew: boolean): string | null {
  const name = form.authorName.trim();
  if (isNew && !file) return "Please choose a photo.";
  if (file && !SPOTLIGHT_IMAGE_TYPES.includes(file.type)) return "The photo must be a JPG, PNG or WebP file.";
  if (file && file.size > SPOTLIGHT_MAX_IMAGE_BYTES) return "The photo must be 10 MB or smaller.";
  if (!name) return "Author name is required.";
  if (name.length > 120) return "Author name must not exceed 120 characters.";
  if (form.caption.trim().length > 500) return "Caption must not exceed 500 characters.";
  if (form.sortOrder.trim() !== "" && !Number.isFinite(Number(form.sortOrder))) return "Display order must be a number.";
  return null;
}

/** The multipart body: one `image` file (only when chosen) plus the text fields. */
export function spotlightFormData(form: SpotlightForm, file: File | null): FormData {
  const body = new FormData();
  if (file) body.append("image", file);
  body.append("author_name", form.authorName.trim());
  body.append("caption", form.caption.trim());
  if (form.sortOrder.trim() !== "") body.append("sortOrder", form.sortOrder.trim());
  body.append("isActive", String(form.isActive));
  return body;
}

/** One page of spotlights in the order the backend returns them (sortOrder, then creation date). */
export async function fetchSpotlights(page: number, limit: number): Promise<SpotlightPage> {
  const { data } = await api.get("/spotlights", { params: { page, limit } });
  return parseSpotlightResponse(data, page, limit);
}
