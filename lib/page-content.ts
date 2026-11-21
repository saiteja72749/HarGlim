/**
 * Long-form page copy managed from Admin → Site Content → Page Sections.
 *
 * Each key is saved through PUT /admin/content and read back from GET /content like every other
 * site content field. Missing backend sections stay empty.
 */

export const PAGE_SECTION_KEYS = [
  "homeWhyChooseJson",
  "aboutValuesJson",
  "aboutTeamJson",
  "publishServicesJson",
  "publishStepsJson",
  "guidelinesSectionsJson",
  "guidelinesStepsJson",
  "royaltyScheduleJson",
  "royaltyExamplesJson",
  "royaltyFaqsJson",
  "returnsStepsJson",
  "returnsEligibleJson",
  "returnsNotEligibleJson",
  "returnsFaqsJson",
  "privacySectionsJson",
  "termsSectionsJson",
  "careersBenefitsJson",
] as const;

export type PageSectionKey = (typeof PAGE_SECTION_KEYS)[number];

/** Admin editor labels: which page a section belongs to and the JSON shape it expects. */
export const PAGE_SECTION_FIELDS: { key: PageSectionKey; page: string; label: string; shape: string }[] = [
  {
    key: "homeWhyChooseJson",
    page: "Home",
    label: "Why choose us cards",
    shape: '[{ "title", "description", "highlight" }]',
  },
  { key: "aboutValuesJson", page: "About", label: "Our values", shape: '[{ "title", "description" }]' },
  { key: "aboutTeamJson", page: "About", label: "Team members", shape: '[{ "name", "role", "image", "bio" }]' },
  {
    key: "publishServicesJson",
    page: "Publish",
    label: "Publishing services",
    shape: '[{ "title", "description", "features": [] }]',
  },
  { key: "publishStepsJson", page: "Publish", label: "How it works steps", shape: '[{ "title", "description" }]' },
  {
    key: "guidelinesSectionsJson",
    page: "Author Guidelines",
    label: "Guideline lists",
    shape: '[{ "title", "items": [] }]',
  },
  {
    key: "guidelinesStepsJson",
    page: "Author Guidelines",
    label: "Submission steps",
    shape: '[{ "title", "description" }]',
  },
  { key: "royaltyScheduleJson", page: "Royalty Info", label: "Payment process", shape: '[{ "title", "description" }]' },
  {
    key: "royaltyExamplesJson",
    page: "Royalty Info",
    label: "Earning examples",
    shape: '[{ "scenario", "retail", "charges", "royalty", "note" }]',
  },
  { key: "royaltyFaqsJson", page: "Royalty Info", label: "Royalty FAQs", shape: '[{ "question", "answer" }]' },
  { key: "returnsStepsJson", page: "Returns", label: "Return process steps", shape: '[{ "title", "description" }]' },
  { key: "returnsEligibleJson", page: "Returns", label: "Eligible reasons", shape: '["reason", ...]' },
  { key: "returnsNotEligibleJson", page: "Returns", label: "Not eligible reasons", shape: '["reason", ...]' },
  { key: "returnsFaqsJson", page: "Returns", label: "Returns FAQs", shape: '[{ "question", "answer" }]' },
  { key: "privacySectionsJson", page: "Privacy Policy", label: "Policy sections", shape: '[{ "title", "content" }]' },
  { key: "termsSectionsJson", page: "Terms", label: "Terms sections", shape: '[{ "title", "content" }]' },
  {
    key: "careersBenefitsJson",
    page: "Careers",
    label: "Benefits (leave [] to hide)",
    shape: '[{ "title", "description" }]',
  },
];

// Missing or unpublished backend sections remain empty. No marketing or policy copy is seeded here.
export const pageSectionDefaults = Object.fromEntries(
  PAGE_SECTION_KEYS.map((key) => [key, "[]"])
) as Record<PageSectionKey, string>;

export const defaultFaqsJson = "[]";

/** Read only the backend's saved list; missing or malformed content stays empty. */
export function readSection<T = unknown>(content: Partial<Record<PageSectionKey, string>> | undefined, key: PageSectionKey): T[] {
  const raw = content?.[key];
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

/** Flattens categorised FAQs ([{ category, items }]) or a plain list into question/answer pairs. */
export function flattenFaqs(raw: unknown): { question: string; answer: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((item: unknown) => {
      if (!item || typeof item !== 'object') return [];
      return 'items' in item && Array.isArray(item.items) ? item.items as unknown[] : [item];
    })
    .flatMap((item: unknown) => {
      if (!item || typeof item !== 'object' || !('question' in item) || !('answer' in item)) return [];
      return typeof item.question === 'string' && typeof item.answer === 'string' && item.question && item.answer
        ? [{ question: item.question, answer: item.answer }] : [];
    });
}
