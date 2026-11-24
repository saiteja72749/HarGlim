import { describe, expect, it } from "vitest";
import { manuscriptFileError } from "./author-manuscript";

describe("manuscript file validation", () => {
  it("accepts the documented formats at the default size boundary", () => {
    for (const type of [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]) expect(manuscriptFileError({ type, size: 25 * 1024 * 1024 })).toBeNull();
  });

  it("rejects unsupported, empty and oversized files before uploading", () => {
    expect(manuscriptFileError({ type: "image/png", size: 1 })).toMatch(/PDF/);
    expect(manuscriptFileError({ type: "application/pdf", size: 0 })).toMatch(/empty/);
    expect(manuscriptFileError({ type: "application/pdf", size: 25 * 1024 * 1024 + 1 })).toMatch(/25 MB/);
  });
});
