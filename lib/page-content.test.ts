import { describe, expect, it } from "vitest";
import { PAGE_SECTION_KEYS, defaultFaqsJson, flattenFaqs, pageSectionDefaults, readSection } from "./page-content";

describe("page content", () => {
  it("has a valid JSON list default for every section", () => {
    for (const key of PAGE_SECTION_KEYS) expect(Array.isArray(JSON.parse(pageSectionDefaults[key]))).toBe(true);
  });

  it("uses the saved list, falling back to the default when it is invalid", () => {
    expect(readSection({ aboutValuesJson: '[{"title":"A"}]' }, "aboutValuesJson")).toEqual([{ title: "A" }]);
    expect(readSection({ aboutValuesJson: "{bad" }, "aboutValuesJson")).toEqual(JSON.parse(pageSectionDefaults.aboutValuesJson));
    expect(readSection({ careersBenefitsJson: "[]" }, "careersBenefitsJson")).toEqual([]);
  });

  it("flattens categorised FAQs and keeps no old royalty percentage claims", () => {
    const faqs = flattenFaqs(JSON.parse(defaultFaqsJson));
    expect(faqs.length).toBeGreaterThan(10);
    expect(flattenFaqs([{ question: "Q", answer: "A" }])).toEqual([{ question: "Q", answer: "A" }]);
    expect(defaultFaqsJson).not.toMatch(/70%/);
  });
});
