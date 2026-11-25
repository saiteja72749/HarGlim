// @vitest-environment node
import { describe, expect, it } from "vitest";
import { categoryIsActive, findDuplicateCategory, parseCategoryPage, resolveCategoryId } from "./category-data";
import { INITIAL_CATEGORY_NAMES, planCategorySeed } from "../tools/category-seed-data.mjs";

// Pure contract/identity checks. No HTTP responses or authentication are mocked.
const categories = [
  { _id: "existing-fiction", name: " Fiction ", slug: "fiction", active: true },
  { _id: "existing-poetry", name: "Poetry", slug: "poetry", active: false },
];

describe("category identity", () => {
  it("rejects duplicates across case, whitespace, Unicode and inactive records", () => {
    expect(findDuplicateCategory(categories, " fIcTiOn ")?._id).toBe("existing-fiction");
    expect(findDuplicateCategory(categories, "Ｆｉｃｔｉｏｎ")?._id).toBe("existing-fiction");
    expect(findDuplicateCategory(categories, "poetry")?._id).toBe("existing-poetry");
    expect(findDuplicateCategory(categories, "Fiction", "existing-fiction")).toBeUndefined();
  });
  it("resolves exact stable IDs and legacy names without falling back to unrelated IDs", () => {
    expect(resolveCategoryId(categories, "existing-poetry")).toBe("existing-poetry");
    expect(resolveCategoryId(categories, "fiction")).toBe("existing-fiction");
    expect(resolveCategoryId(categories, "missing")).toBeUndefined();
    expect(resolveCategoryId(categories, "")).toBeUndefined();
  });
  it("keeps inactive categories out of public choices", () => {
    expect(categories.filter(categoryIsActive)).toHaveLength(1);
    expect(categoryIsActive({ _id: "id", name: "Legacy", isActive: false })).toBe(false);
  });
});

describe("category response contract", () => {
  it("accepts documented arrays and legacy nested arrays with pagination", () => {
    expect(parseCategoryPage({ data: categories, pagination: { pages: 3 } }).pages).toBe(3);
    expect(parseCategoryPage({ data: { categories, pagination: { totalPages: 2 } } }).categories[0]._id).toBe("existing-fiction");
    expect(parseCategoryPage({ data: [] }).categories).toEqual([]);
  });
  it("fails visibly for malformed envelopes, identity fields and pagination", () => {
    for (const value of [{}, { success: false, data: [] }, { data: [{ name: "No ID" }] }, { data: [], pagination: { pages: "2" } }]) {
      expect(() => parseCategoryPage(value)).toThrow();
    }
  });
});

describe("initial category seed", () => {
  it("contains exactly the requested 63 distinct names", () => {
    expect(INITIAL_CATEGORY_NAMES).toHaveLength(63);
    expect(new Set(INITIAL_CATEGORY_NAMES).size).toBe(63);
  });
  it("preserves existing IDs and inactive records and becomes idempotent", () => {
    const before = structuredClone(categories);
    const plan = planCategorySeed(categories);
    expect(plan.present.map((entry) => entry.id)).toEqual(["existing-fiction", "existing-poetry"]);
    expect(plan.missing).toHaveLength(61);
    const after = [...categories, ...plan.missing.map((name) => ({ _id: name, name }))];
    expect(planCategorySeed(after).missing).toEqual([]);
    expect(categories).toEqual(before);
  });
  it("preserves the approved existing Self Help name and ID", () => {
    const plan = planCategorySeed([{ _id: "old-id", name: "Self Help", slug: "self-help" }]);
    expect(plan.conflicts).toEqual([]);
    expect(plan.present).toContainEqual({ name: "Self-Help", existingName: "Self Help", id: "old-id", active: true });
    expect(plan.missing).not.toContain("Self-Help");
  });
  it("reports other slug collisions without modifying the existing record", () => {
    const plan = planCategorySeed([{ _id: "old-id", name: "Different Genre", slug: "self-help" }]);
    expect(plan.conflicts).toEqual([{ name: "Self-Help", existingName: "Different Genre", id: "old-id" }]);
  });
  it("recognizes existing children's categories and retains their inactive state", () => {
    for (const name of ["Children Books", "Children’s Books", "Childrens Books"]) {
      const plan = planCategorySeed([{ _id: "old-id", name, active: false }]);
      expect(plan.missing).not.toContain("Children's Books");
      expect(plan.present).toContainEqual({ name: "Children's Books", existingName: name, id: "old-id", active: false });
    }
  });
});
