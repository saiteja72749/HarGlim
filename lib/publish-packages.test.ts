import { describe, expect, it } from "vitest";
import { emptyPackageForm, formToCard, normalizePackages, packagePayload, packagesToImport, parsePackagesJson, sortPackages } from "./publish-packages";

// Shape as the live backend returns it (2026-10-22): card fields present but empty.
const demoPro = { _id: "d2", name: "Demo Pro Publishing", description: "Demo", price: 14999, features: [], isActive: true, tagline: "", highlighted: false, badge: "", sortOrder: 0 };

describe("publish packages", () => {
  it("reads the wrapped Site Content shape and text prices", () => {
    const cards = parsePackagesJson(JSON.stringify([{ packages: [{ name: "Basic", price: "₹999/-", features: ["ISBN"] }, { name: "Professional", price: "₹4999/-" }] }]));
    expect(cards.map((c) => [c.name, c.price])).toEqual([["Basic", 999], ["Professional", 4999]]);
    expect(cards[1].features).toEqual([]);
    expect(parsePackagesJson("{bad")).toEqual([]);
  });

  it("drops archived packages", () => {
    expect(normalizePackages([demoPro, { ...demoPro, _id: "x", isActive: false }]).map((p) => p._id)).toEqual(["d2"]);
  });

  it("sorts by display order with unset (0) last, then price", () => {
    const list = normalizePackages([{ ...demoPro, sortOrder: 0 }, { ...demoPro, name: "B", sortOrder: 2 }, { ...demoPro, name: "A", sortOrder: 1, price: 9 }]);
    expect(sortPackages(list).map((p) => p.name)).toEqual(["A", "B", "Demo Pro Publishing"]);
  });

  it("builds the create/update body from the admin form", () => {
    const form = { ...emptyPackageForm, name: " Basic ", description: "Starter kit", price: "999", features: "ISBN\n\n Cover design ", tagline: " E-book ", badge: "Popular", sortOrder: "" };
    const result = packagePayload(form, []);
    expect(result).toEqual({
      payload: { name: "Basic", description: "Starter kit", price: 999, features: ["ISBN", "Cover design"], isActive: true, tagline: "E-book", highlighted: false, badge: "", sortOrder: 0 },
    });
    // A badge is only kept on a highlighted package.
    expect(packagePayload({ ...form, highlighted: true }, [])).toMatchObject({ payload: { badge: "Popular", highlighted: true } });
  });

  it("rejects what the backend would reject, and duplicate names", () => {
    const ok = { ...emptyPackageForm, name: "Basic", description: "d", price: "999" };
    expect(packagePayload({ ...ok, name: " " }, [])).toEqual({ error: "Name is required." });
    expect(packagePayload({ ...ok, description: "" }, [])).toEqual({ error: "Description is required." });
    expect(packagePayload({ ...ok, price: "-1" }, [])).toHaveProperty("error");
    expect(packagePayload({ ...ok, price: "" }, [])).toHaveProperty("error");
    expect(packagePayload({ ...ok, sortOrder: "1.5" }, [])).toHaveProperty("error");
    expect(packagePayload(ok, [{ _id: "1", name: "basic" }])).toEqual({ error: 'A package named "Basic" already exists.' });
  });

  it("previews the form as the Publish page card", () => {
    expect(formToCard({ ...emptyPackageForm, name: "Gold", price: "3499", features: "A\n\nB" })).toMatchObject({ name: "Gold", price: 3499, features: ["A", "B"] });
  });

  it("imports only cards without a package of the same name, keeping card order", () => {
    const cards = parsePackagesJson(JSON.stringify([{ name: "Basic", price: "₹999/-" }, { name: "Demo Pro Publishing", price: 1 }, { name: "Premium", price: 9999, tagline: "All in", highlighted: true, badge: "Best" }]));
    const payloads = packagesToImport(cards, normalizePackages([demoPro]));
    expect(payloads.map((p) => [p.name, p.price, p.sortOrder])).toEqual([["Basic", 999, 1], ["Premium", 9999, 3]]);
    expect(payloads[0].description).toBe("Basic publishing package");
    expect(payloads[1]).toMatchObject({ tagline: "All in", highlighted: true, badge: "Best", description: "All in", isActive: true });
  });
});
