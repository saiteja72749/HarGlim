import { describe, expect, it } from "vitest";
import api from "@/lib/api";

describe("successful HTTP response envelopes", () => {
  it("rejects an application failure even when HTTP status is 200", async () => {
    const request = api.post("/admin/books", {}, {
      adapter: async (config) => ({
        status: 200, statusText: "OK", config, headers: {}, data: { success: false },
      }),
    });
    await expect(request).rejects.toMatchObject({ code: "ERR_API_REJECTED", response: { status: 200 } });
  });

  it("preserves documented responses with a successful write and no body", async () => {
    const response = await api.delete("/admin/books/test", {
      adapter: async (config) => ({ status: 204, statusText: "No Content", config, headers: {}, data: "" }),
    });
    expect(response.status).toBe(204);
  });

  it("bypasses browser caching for protected GET requests by default", async () => {
    await api.get("/users/me", {
      adapter: async (config) => {
        expect(config.fetchOptions?.cache).toBe("no-store");
        return { status: 200, statusText: "OK", config, headers: {}, data: {} };
      },
    });
  });
});
