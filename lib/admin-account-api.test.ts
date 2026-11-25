import { describe, expect, it } from "vitest";
import { accountActive, accountId, accountRole, adminResponse, adminRows, adminUserRecord } from "./admin-account-api";

describe("admin account responses", () => {
  it("rejects a failure envelope even when the HTTP request succeeds", () => {
    expect(() => adminResponse({ success: false, message: "Update rejected" })).toThrow("Update rejected");
  });

  it("reads the backend identity and invitation result from a nested account response", () => {
    const user = adminUserRecord({ data: { user: { _id: "author-id", role: "author" }, invited: true, emailSent: false } });
    expect(accountId(user)).toBe("author-id");
    expect(user).toMatchObject({ invited: true, emailSent: false });
    expect(accountId(adminUserRecord({ success: true }))).toBe("");
  });

  it("uses canonical access status and preserves legacy reader accounts", () => {
    expect(accountActive({ isActive: false, status: "Active" })).toBe(false);
    expect(accountActive({ status: "Suspended" })).toBe(false);
    expect(accountActive({})).toBeUndefined();
    expect(accountRole("User")).toBe("reader");
  });

  it("distinguishes an empty backend list from a malformed response", () => {
    expect(adminRows({ data: { users: [] } }, "users")).toEqual([]);
    expect(() => adminRows({ data: {} }, "users")).toThrow("invalid record list");
  });
});
