// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  defaultSiteContent,
  canonicalContentNotSaved,
  fromBackendContent,
  invalidJsonField,
  toBackendPayload,
  unsavedKeys,
  type SiteContent,
} from "./site-content-context";

const edited: SiteContent = {
  ...defaultSiteContent,
  homeTitle: "New title",
  homeCtaHeading: "Publish today",
  announcementActive: true,
  announcementText: "Sale on now",
  socialFacebook: "https://facebook.com/x",
  contactSupportEmail: "help@example.com",
  careersEmail: "jobs@example.com",
  aboutValuesJson: '[{"title":"Craft"}]',
  adminProfileImage: "https://example.com/me.png",
};

describe("site content backend mapping", () => {
  it('does not verify dropped canonical content or missing section storage from matching legacy mirrors', () => {
    const content = { ...defaultSiteContent, seoTitle: 'Requested title', faqsJson: '[{"question":"Question","answer":"Answer"}]' };
    const stored = { seoTitle: content.seoTitle, faqsJson: content.faqsJson, siteSettings: { siteContent: { seoTitle: content.seoTitle } } };
    expect(canonicalContentNotSaved(content, stored)).toEqual(expect.arrayContaining(['seoTitle', 'faqsJson', 'homeWhyChooseJson']));
    const payload = toBackendPayload(content, {});
    expect(canonicalContentNotSaved(content, payload)).toEqual([]);
    expect(fromBackendContent({ seo: {}, siteSettings: { siteContent: { seoTitle: 'Stale title' } } }).seoTitle).toBe('');
  });

  it('accepts backend-added FAQ IDs without hiding a dropped answer', () => {
    const content = { ...defaultSiteContent, faqsJson: '[{"question":"Question","answer":"Answer"}]' };
    expect(unsavedKeys(content, { ...content, faqsJson: '[{"_id":"stored-id","answer":"Answer","question":"Question"}]' })).not.toContain('faqsJson');
    expect(unsavedKeys(content, { ...content, faqsJson: '[{"_id":"stored-id","question":"Question"}]' })).toContain('faqsJson');
  });
  it('preserves other announcements, their IDs and unknown metadata when editing one banner', () => {
    const first = { _id: 'banner-one', text: 'Existing message', isActive: true, link: '/books' };
    const second = { _id: 'banner-two', text: 'Another message', isActive: false, metadata: { placement: 'footer' } };
    const original = { announcements: [first, second] };
    const payload = toBackendPayload({ ...defaultSiteContent, announcementText: 'Updated message', announcementActive: true }, original);
    expect(payload.announcements).toEqual([{ ...first, text: 'Updated message' }, second]);
    expect(original.announcements).toEqual([first, second]);
  });

  it('leaves announcement records intact when saving unrelated content and preserves unknown content-bag fields', () => {
    const original = { announcements: [{ _id: 'banner', text: 'Existing message', isActive: true }], siteSettings: { siteContent: { backendOnly: { enabled: true }, adminProfileImage: 'private-photo', homeTitle: 'Legacy title' } } };
    const content = { ...defaultSiteContent, ...fromBackendContent(original), homeTitle: 'Edited title' };
    const payload = toBackendPayload(content, original);
    expect(payload.announcements).toEqual(original.announcements);
    expect(payload.siteSettings.siteContent.backendOnly).toEqual({ enabled: true });
    expect(payload.siteSettings.siteContent).not.toHaveProperty('adminProfileImage');
    expect(payload.siteSettings.siteContent).not.toHaveProperty('homeTitle');
    expect(payload).not.toHaveProperty('adminProfileImage');
    expect(payload).not.toHaveProperty('contactAddressLine1');
  });

  it('synchronizes the documented FAQ array and respects canonical SEO/FAQ clears over stale legacy copies', () => {
    const content = { ...defaultSiteContent, faqsJson: '[{"question":"Question","answer":"Answer"}]' };
    expect(toBackendPayload(content, {}).faq).toEqual([{ question: 'Question', answer: 'Answer' }]);
    expect(fromBackendContent({ seoTitle: 'Old title', faqsJson: content.faqsJson, siteSettings: { siteContent: { seoDescription: 'Old description' } }, seo: { title: '', description: '', keywords: [], image: '' }, faq: [] })).toMatchObject({ seoTitle: '', seoDescription: '', seoKeywords: '', seoImage: '', faqsJson: '[]' });
    expect(() => toBackendPayload({ ...content, faqsJson: '["invalid FAQ"]' }, {})).toThrow('FAQs must be a JSON list of objects.');
  });

  it('preserves a cleared banner ID and reports canonical values instead of stale announcement flags', () => {
    const original = { announcementActive: true, announcementText: 'Stale message', announcements: [{ _id: 'banner', text: 'Current message', isActive: true, metadata: { priority: 1 } }] };
    const payload = toBackendPayload(defaultSiteContent, original);
    expect(payload.announcements).toEqual([{ _id: 'banner', text: '', isActive: false, metadata: { priority: 1 } }]);
    expect(fromBackendContent({ ...original, announcements: payload.announcements })).toMatchObject({ announcementText: '', announcementActive: false });
    expect(() => toBackendPayload({ ...defaultSiteContent, announcementActive: true }, {})).toThrow('Enter an announcement message');
  });

  it("stores keys the backend has no column for in siteSettings.siteContent and keeps its own settings", () => {
    const payload = toBackendPayload(edited, { siteSettings: { siteName: "Harglim", maintenanceMode: false } });

    expect(payload.siteSettings).toMatchObject({ siteName: "Harglim", maintenanceMode: false, supportEmail: "help@example.com" });
    expect(payload.siteSettings.siteContent).toMatchObject({
      homeCtaHeading: "Publish today",
      careersEmail: "jobs@example.com",
      aboutValuesJson: '[{"title":"Craft"}]',
    });
    // Backend columns, the admin's photo and the split address lines stay out of the bag.
    expect(payload.siteSettings.siteContent).not.toHaveProperty("homeTitle");
    expect(payload.siteSettings.siteContent).not.toHaveProperty("adminProfileImage");
    expect(payload.siteSettings.siteContent).not.toHaveProperty("contactAddressLine1");

    expect(payload.hero.title).toBe("New title");
    expect(payload.socialLinks.facebook).toBe("https://facebook.com/x");
    expect(payload.announcements).toEqual([{ text: "Sale on now", isActive: true }]);
  });

  it("reads back what a backend that drops unknown top-level keys keeps", () => {
    const payload = toBackendPayload(edited, null);
    // Simulate the live backend: unknown flat keys are dropped, schema fields are kept.
    const stored = {
      homeTitle: payload.homeTitle,
      hero: payload.hero,
      socialLinks: payload.socialLinks,
      announcements: payload.announcements,
      siteSettings: payload.siteSettings,
    };
    const merged = { ...defaultSiteContent, ...fromBackendContent(stored) };

    expect(unsavedKeys(edited, merged)).toEqual([]);
    expect(merged.homeCtaHeading).toBe("Publish today");
    expect(merged.announcementText).toBe("Sale on now");
  });

  it("reports fields the backend did not keep", () => {
    const merged = { ...defaultSiteContent, ...fromBackendContent({ homeTitle: "New title" }) };
    expect(unsavedKeys(edited, merged)).toEqual(
      expect.arrayContaining(["homeCtaHeading", "careersEmail", "aboutValuesJson", "socialFacebook"])
    );
    expect(unsavedKeys(edited, merged)).not.toContain("homeTitle");
  });

  it("flags the first Json field the backend would reject", () => {
    expect(invalidJsonField(defaultSiteContent)).toBeNull();
    expect(invalidJsonField({ faqsJson: '[{"q":1}]', aboutTeamJson: "{bad" })).toMatchObject({ key: "aboutTeamJson" });
    expect(invalidJsonField({ termsSectionsJson: '{"a":1}' })).toEqual({ key: "termsSectionsJson", reason: "must be a JSON list [ … ]" });
    expect(invalidJsonField({ privacySectionsJson: JSON.stringify(["x".repeat(110 * 1024)]) })).toMatchObject({ reason: "is larger than 100 KB" });
    expect(invalidJsonField({ homeTitle: "{not json but not a Json key" })).toBeNull();
  });

  it("prefers flat keys and preserves the backend's published text", () => {
    const merged = fromBackendContent({
      homeCtaHeading: "Flat",
      publishTitle: "Publish Your Book With Us",
      siteSettings: { siteContent: { homeCtaHeading: "Bag", careersEmail: "jobs@example.com" } },
    });
    expect(merged.homeCtaHeading).toBe("Flat");
    expect(merged.careersEmail).toBe("jobs@example.com");
    expect(merged.publishTitle).toBe("Publish Your Book With Us");
  });

  it("preserves explicitly empty backend values rather than restoring content", () => {
    expect(fromBackendContent({ homeTitle: "", faqsJson: "[]", hero: { title: "Older grouped title" } })).toMatchObject({ homeTitle: "", faqsJson: "[]" });
    expect(fromBackendContent({ faq: [] }).faqsJson).toBe("[]");
  });

  it("reports a clear operation the backend did not persist", () => {
    expect(unsavedKeys({ ...defaultSiteContent, homeTitle: "" }, { ...defaultSiteContent, homeTitle: "Old title" })).toContain("homeTitle");
  });

  it('round-trips grouped SEO values and reports a dropped address change', () => {
    const content = { ...defaultSiteContent, seoTitle: 'Published title', seoDescription: 'Published description', seoKeywords: 'books, authors', seoImage: 'https://example.com/image.png', contactAddressLine1: 'Approved address' };
    const payload = toBackendPayload(content, { seo: { canonical: 'https://example.com' } });
    expect(payload.seo).toMatchObject({ title: 'Published title', keywords: ['books', 'authors'], canonical: 'https://example.com' });
    expect(fromBackendContent({ seo: payload.seo })).toMatchObject({ seoTitle: content.seoTitle, seoDescription: content.seoDescription, seoKeywords: content.seoKeywords });
    expect(unsavedKeys(content, { ...content, contactAddressLine1: '' })).toContain('contactAddressLine1');
    expect(unsavedKeys({ ...content, contactAddressLine1: 'Line one', contactAddressLine2: 'Line two' }, { ...content, contactAddressLine1: 'Line one, Line two', contactAddressLine2: '' })).not.toContain('contactAddressLine1');
  });
});
