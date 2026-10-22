import { describe, expect, it } from "vitest";
import {
  defaultSiteContent,
  fromBackendContent,
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

  it("prefers flat keys over the content bag and ignores stored legacy defaults", () => {
    const merged = fromBackendContent({
      homeCtaHeading: "Flat",
      publishTitle: "Publish Your Book With Us",
      siteSettings: { siteContent: { homeCtaHeading: "Bag", careersEmail: "jobs@example.com" } },
    });
    expect(merged.homeCtaHeading).toBe("Flat");
    expect(merged.careersEmail).toBe("jobs@example.com");
    expect(merged).not.toHaveProperty("publishTitle");
  });
});
