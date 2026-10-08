import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ default: {} }));

import { getDefaultAddress, withDefaultAddress, type SavedAddress } from "./saved-address";

const home: SavedAddress = {
  _id: "a1",
  label: "Home",
  fullName: "Reader User",
  addressLine1: "12 MG Road",
  city: "Bengaluru",
  postalCode: "560001",
  country: "India",
  phone: "9000000000",
  isDefault: true,
};
const office: SavedAddress = { ...home, _id: "a2", label: "Office", addressLine1: "1 Tech Park", isDefault: false };

describe("withDefaultAddress", () => {
  it("returns null when the default address is unchanged", () => {
    expect(withDefaultAddress([home, office], { ...home })).toBeNull();
  });

  it("updates an existing address in place, keeps its _id and makes it the only default", () => {
    const next = withDefaultAddress([home, office], { ...office, phone: "9111111111" })!;
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ _id: "a2", phone: "9111111111", isDefault: true });
    expect(next.filter((a) => a.isDefault)).toHaveLength(1);
  });

  it("adds a new address as the default", () => {
    const next = withDefaultAddress([home], { fullName: "X", addressLine1: "New St", city: "Pune", postalCode: "411001", country: "India" })!;
    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ addressLine1: "New St", isDefault: true });
    expect(next[1]).toMatchObject({ _id: "a1", isDefault: false });
  });

  it("does not exceed 10 saved addresses", () => {
    const ten = Array.from({ length: 10 }, (_, i) => ({ ...office, _id: `x${i}`, addressLine1: `Street ${i}` }));
    expect(withDefaultAddress(ten, { ...office, _id: undefined, addressLine1: "Street 99" })).toBeNull();
  });
});

describe("getDefaultAddress", () => {
  it("prefers the flagged default, else the first", () => {
    expect(getDefaultAddress([office, home])?._id).toBe("a1");
    expect(getDefaultAddress([office])?._id).toBe("a2");
    expect(getDefaultAddress([])).toBeNull();
  });
});
