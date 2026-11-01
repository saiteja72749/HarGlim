import { describe, expect, it } from "vitest";
import { authorPanelProblem } from "./author-panel";

const ok = { status: "fulfilled", value: {} } as const;
const fail = (status: number, message = "") => ({ status: "rejected", reason: { response: { status, data: { message } } } }) as const;

describe("author panel", () => {
  it("says nothing when every request loaded", () => {
    expect(authorPanelProblem([{ label: "a", result: ok }])).toBeNull();
  });

  it("explains missing dashboard access instead of showing zeros", () => {
    const msg = authorPanelProblem([{ label: "your dashboard", result: fail(403, "Author dashboard access required") }]);
    expect(msg).toMatch(/dashboard access is not active/);
    expect(msg).toMatch(/Author dashboard access required/);
  });

  it("names what failed for other errors, and handles 401 and 429", () => {
    expect(authorPanelProblem([{ label: "royalty history", result: fail(500, "boom") }])).toMatch(/Couldn't load royalty history \(boom\)/);
    expect(authorPanelProblem([{ label: "x", result: fail(401) }])).toMatch(/sign in again/);
    expect(authorPanelProblem([{ label: "x", result: fail(429) }])).toMatch(/Too many requests/);
  });
});
