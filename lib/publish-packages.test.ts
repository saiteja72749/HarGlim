import { describe, expect, it } from "vitest";
import { findRealPackage, hasCardCopy, normalizePackages, packagesToImport, parsePackagesJson, sortPackages } from "./publish-packages";

// Shapes as the live backend returns them (2026-10-22): card fields present but empty.
const demoStarter = { _id: "d1", name: "Demo Starter Publishing", description: "Demo", price: 4999, features: [], isActive: true, tagline: "", highlighted: false, badge: "", sortOrder: 0 };
const demoPro = { _id: "d2", name: "Demo Pro Publishing", description: "Demo", price: 14999, features: [], isActive: true, tagline: "", highlighted: false, badge: "", sortOrder: 0 };

describe("publish packages", () => {
  it("reads the wrapped Site Content shape and text prices", () => {
    const cards = parsePackagesJson(JSON.stringify([{ packages: [{ name: "Basic", price: "₹999/-", features: ["ISBN"] }, { name: "Professional", price: "₹4999/-" }] }]));
    expect(cards.map((c) => [c.name, c.price])).toEqual([["Basic", 999], ["Professional", 4999]]);
    expect(cards[1].features).toEqual([]);
    expect(parsePackagesJson("{bad")).toEqual([]);
  });

  it("does not treat empty card fields from the backend as card copy", () => {
    expect([demoStarter, demoPro].some(hasCardCopy)).toBe(false);
    expect(hasCardCopy({ ...demoStarter, sortOrder: 2 })).toBe(true);
    expect(hasCardCopy({ ...demoStarter, tagline: "Starter kit" })).toBe(true);
    expect(hasCardCopy({ ...demoStarter, highlighted: true })).toBe(true);
  });

  it("never matches a card to a different package by price", () => {
    const real = normalizePackages([demoStarter, demoPro]);
    expect(findRealPackage({ name: "Professional", price: 4999, features: [] }, real)).toBeUndefined();
    expect(findRealPackage({ name: " demo starter publishing ", price: 1, features: [] }, real)?._id).toBe("d1");
  });

  it("sorts by sortOrder with unset (0) last, then price", () => {
    const list = normalizePackages([{ ...demoPro, sortOrder: 0 }, { ...demoStarter, name: "B", sortOrder: 2 }, { ...demoStarter, name: "A", sortOrder: 1, price: 9 }]);
    expect(sortPackages(list).map((p) => p.name)).toEqual(["A", "B", "Demo Pro Publishing"]);
  });

  it("imports only cards without a package of the same name, keeping card order", () => {
    const cards = parsePackagesJson(JSON.stringify([{ name: "Basic", price: "₹999/-" }, { name: "Demo Pro Publishing", price: 1 }, { name: "Premium", price: 9999, tagline: "All in", highlighted: true }]));
    const payloads = packagesToImport(cards, normalizePackages([demoPro]));
    expect(payloads.map((p) => [p.name, p.price, p.sortOrder])).toEqual([["Basic", 999, 1], ["Premium", 9999, 3]]);
    expect(payloads[0].description).toBe("Basic publishing package");
    expect(payloads[1]).toMatchObject({ tagline: "All in", highlighted: true, description: "All in", isActive: true });
  });
});
