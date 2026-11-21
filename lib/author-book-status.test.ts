// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getAuthorBookStage } from "./author-book-status";

describe("author publishing stages", () => {
  it.each([
    ["SUBMITTED", "submitted"],
    ["UNDER_REVIEW", "under_review"],
    ["CHANGES_REQUESTED", "changes_requested"],
    ["REJECTED", "rejected"],
    ["APPROVED", "published"],
  ])("uses %s review state even while the book is draft", (status, expected) => {
    expect(getAuthorBookStage({ status: "draft", publishRequest: { status } })).toBe(expected);
  });

  it("preserves published and archived states over old requests", () => {
    expect(getAuthorBookStage({ status: "published", publishRequest: { status: "SUBMITTED" } })).toBe("published");
    expect(getAuthorBookStage({ status: "archived", publishRequest: { status: "APPROVED" } })).toBe("archived");
  });

  it("handles alternate review fields and legacy book statuses", () => {
    expect(getAuthorBookStage({ status: "draft", latestPublishRequest: { status: "UNDER_REVIEW" } })).toBe("under_review");
    expect(getAuthorBookStage({ status: "draft", publishingStatus: "CHANGES_REQUESTED" })).toBe("changes_requested");
    expect(getAuthorBookStage({ status: "submitted" })).toBe("submitted");
    expect(getAuthorBookStage({})).toBe("draft");
  });
});
