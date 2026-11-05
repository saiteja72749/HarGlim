import { afterEach, describe, expect, it, vi } from "vitest";
import api from "./api";
import { fetchBackendCategories, invalidateCategoryCache } from "./categories";

const reply = (names: string[]) =>
  ({ data: { success: true, data: names.map((name, i) => ({ _id: `c${i}`, name, slug: name.toLowerCase() })) } }) as any;

describe("category list cache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    invalidateCategoryCache();
  });

  it("asks the backend for every category and bypasses the GET cache", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValueOnce(reply(["Fiction"]));
    await fetchBackendCategories();
    expect(get).toHaveBeenCalledWith("/categories", expect.objectContaining({ params: { limit: 100 }, cache: "no-store" }));
  });

  it("shows a category an admin just created once the cache is invalidated", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValueOnce(reply(["Fiction"])).mockResolvedValueOnce(reply(["Fiction", "Poetry"]));
    expect((await fetchBackendCategories()).map((c) => c.name)).toEqual(["Fiction"]);
    expect((await fetchBackendCategories()).map((c) => c.name)).toEqual(["Fiction"]); // cached
    invalidateCategoryCache(); // what Admin → Categories does after a save
    expect((await fetchBackendCategories()).map((c) => c.name)).toEqual(["Fiction", "Poetry"]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("refreshes on its own after a minute, even without an invalidation", async () => {
    vi.useFakeTimers();
    const get = vi.spyOn(api, "get").mockResolvedValueOnce(reply(["Fiction"])).mockResolvedValueOnce(reply(["Fiction", "Poetry"]));
    await fetchBackendCategories();
    vi.advanceTimersByTime(61 * 1000);
    expect((await fetchBackendCategories()).map((c) => c.name)).toEqual(["Fiction", "Poetry"]);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
