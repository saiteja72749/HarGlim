import { describe, expect, it } from "vitest";
import api from "./api";

// Stands in for the network and reports what would have been sent.
const capture = async (config: any) => ({ data: config, status: 200, statusText: "OK", headers: {}, config });

describe("api client", () => {
  it("sends FormData as a file upload, not as JSON text", async () => {
    const form = new FormData();
    form.append("document", new Blob(["hello"], { type: "application/pdf" }), "manuscript.pdf");

    const { data: sent } = await api.post("/authors/me/uploads/document", form, { adapter: capture as any });

    expect(sent.data).toBeInstanceOf(FormData);
    expect((sent.data as FormData).get("document")).toBeInstanceOf(Blob);
    expect(String(sent.headers.getContentType())).not.toContain("application/json");
  });

  it("still sends plain objects as JSON", async () => {
    const { data: sent } = await api.post("/authors/me/books", { title: "A" }, { adapter: capture as any });

    expect(sent.data).toBe('{"title":"A"}');
    expect(sent.headers.getContentType()).toBe("application/json");
  });
});
