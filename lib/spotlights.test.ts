import { describe, expect, it } from "vitest";
import { normalizeSpotlight, parseSpotlightResponse, spotlightFormData, spotlightFormError } from "./spotlights";

const raw = (n: number) => ({ _id: `s${n}`, image: `https://img/${n}.jpg`, thumbnail: `https://img/${n}_t.jpg`, author_name: ` Author ${n} `, caption: "Launch day" });

describe("spotlights", () => {
  it("maps the API fields and falls back to the image when there is no thumbnail", () => {
    expect(normalizeSpotlight(raw(1), 0)).toEqual({ id: "s1", image: "https://img/1.jpg", thumbnail: "https://img/1_t.jpg", authorName: "Author 1", caption: "Launch day" });
    expect(normalizeSpotlight({ image: "https://img/x.jpg" }, 3)).toMatchObject({ thumbnail: "https://img/x.jpg", authorName: "", id: "https://img/x.jpg#3" });
    expect(normalizeSpotlight({ caption: "no photo" }, 0)).toBeNull();
  });

  it("reads a bare array, and stops when a short page comes back", () => {
    expect(parseSpotlightResponse([raw(1), raw(2)], 1, 6)).toMatchObject({ hasMore: false });
    expect(parseSpotlightResponse(Array.from({ length: 6 }, (_, i) => raw(i)), 1, 6).hasMore).toBe(true);
  });

  it("uses pagination when the backend sends it", () => {
    const page = { success: true, data: [raw(1)], pagination: { page: 1, pages: 3, total: 30 } };
    expect(parseSpotlightResponse(page, 1, 10)).toMatchObject({ hasMore: true, items: [{ id: "s1" }] });
    expect(parseSpotlightResponse({ ...page, pagination: { pages: 3 } }, 3, 10).hasMore).toBe(false);
    expect(parseSpotlightResponse({ data: { items: [raw(2)] }, pagination: { total: 1 } }, 1, 10)).toMatchObject({ hasMore: false, items: [{ id: "s2" }] });
  });
});

describe("spotlight admin form", () => {
  const ok = { authorName: "Kushika", caption: "", sortOrder: "", isActive: true };
  const jpg = { type: "image/jpeg", size: 1000 };

  it("needs a photo only for a new spotlight", () => {
    expect(spotlightFormError(ok, null, true)).toMatch(/choose a photo/);
    expect(spotlightFormError(ok, null, false)).toBeNull();
    expect(spotlightFormError(ok, jpg, true)).toBeNull();
  });

  it("applies the backend's limits", () => {
    expect(spotlightFormError(ok, { type: "image/gif", size: 10 }, true)).toMatch(/JPG, PNG or WebP/);
    expect(spotlightFormError(ok, { type: "image/png", size: 11 * 1024 * 1024 }, true)).toMatch(/10 MB/);
    expect(spotlightFormError({ ...ok, authorName: " " }, jpg, true)).toMatch(/Author name is required/);
    expect(spotlightFormError({ ...ok, authorName: "x".repeat(121) }, jpg, true)).toMatch(/120/);
    expect(spotlightFormError({ ...ok, caption: "x".repeat(501) }, jpg, true)).toMatch(/500/);
    expect(spotlightFormError({ ...ok, sortOrder: "abc" }, jpg, true)).toMatch(/number/);
  });

  it("builds the multipart body with the backend's field names", () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const body = spotlightFormData({ authorName: " Kushika ", caption: "Launch", sortOrder: "2", isActive: false }, file);
    expect(body.get("image")).toBeInstanceOf(File);
    expect(Object.fromEntries([...body.entries()].filter(([k]) => k !== "image"))).toEqual({ author_name: "Kushika", caption: "Launch", sortOrder: "2", isActive: "false" });
    expect(spotlightFormData(ok, null).has("image")).toBe(false);
  });
});
