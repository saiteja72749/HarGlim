// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PAGE_SECTION_KEYS, defaultFaqsJson, flattenFaqs, pageSectionDefaults, readSection } from "./page-content";

describe("page content", () => {
  it("has a valid JSON list default for every section", () => {
    for (const key of PAGE_SECTION_KEYS) expect(Array.isArray(JSON.parse(pageSectionDefaults[key]))).toBe(true);
  });

  it("uses only the saved backend list and leaves invalid or missing sections empty", () => {
    expect(readSection({ aboutValuesJson: '[{"title":"A"}]' }, "aboutValuesJson")).toEqual([{ title: "A" }]);
    expect(readSection({ aboutValuesJson: "{bad" }, "aboutValuesJson")).toEqual([]);
    expect(readSection(undefined, "aboutTeamJson")).toEqual([]);
    expect(readSection({ careersBenefitsJson: "[]" }, "careersBenefitsJson")).toEqual([]);
  });

  it("does not include seeded FAQ content", () => {
    const faqs = flattenFaqs(JSON.parse(defaultFaqsJson));
    expect(faqs).toEqual([]);
    expect(flattenFaqs([{ question: "Q", answer: "A" }])).toEqual([{ question: "Q", answer: "A" }]);
    expect(defaultFaqsJson).not.toMatch(/70%/);
  });
});
