'use client';

import { describeApiError, record } from "@/lib/api-error";


import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { notifyLiveChange, onLiveChange } from '@/lib/live-sync';
import { PAGE_SECTION_KEYS, type PageSectionKey } from '@/lib/page-content';

export interface SiteContent extends Record<PageSectionKey, string> {
  // Announcement Bar
  announcementActive: boolean;
  announcementText: string;

  // Home Page
  homeTitle: string;
  homeSubtitle: string;
  homeHeroCtaText: string;
  homeFeaturedTitle: string;
  homeBestsellerTitle: string;
  homeCtaHeading: string;
  homeCtaSubtitle: string;
  homeCtaButtonText: string;

  // Contact Info & Company
  contactPhone: string;
  contactEmail: string;
  contactSupportEmail: string;
  contactAddressLine1: string;
  contactAddressLine2: string;
  contactHours: string;
  socialFacebook: string;
  socialTwitter: string;
  socialInstagram: string;
  socialLinkedin: string;

  // Publish Page
  publishTitle: string;
  publishSubtitle: string;
  packagesJson: string;
  royaltySummary: string;
  authorGuidelinesText: string;

  // About Us & FAQ Pages
  aboutTitle: string;
  aboutSubtitle: string;
  aboutMission: string;
  aboutVision: string;
  faqsJson: string;

  // Careers
  careersEmail: string;

  // Admin Profile & Avatar
  adminProfileImage?: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImage: string;
}

// Empty shape only. Business content is supplied exclusively by GET /content.
export const defaultSiteContent: SiteContent = {
  announcementActive: false,
  announcementText: "",
  homeTitle: "",
  homeSubtitle: "",
  homeHeroCtaText: "",
  homeFeaturedTitle: "",
  homeBestsellerTitle: "",
  homeCtaHeading: "",
  homeCtaSubtitle: "",
  homeCtaButtonText: "",
  contactPhone: "",
  contactEmail: "",
  contactSupportEmail: "",
  contactAddressLine1: "",
  contactAddressLine2: "",
  contactHours: "",
  socialFacebook: "",
  socialTwitter: "",
  socialInstagram: "",
  socialLinkedin: "",
  publishTitle: "",
  publishSubtitle: "",
  packagesJson: "[]",
  royaltySummary: "",
  authorGuidelinesText: "",
  aboutTitle: "",
  aboutSubtitle: "",
  aboutMission: "",
  aboutVision: "",
  faqsJson: "[]",
  careersEmail: "",
  adminProfileImage: "",
  seoTitle: '',
  seoDescription: '',
  seoKeywords: '',
  seoImage: '',
  ...Object.fromEntries(PAGE_SECTION_KEYS.map((key) => [key, "[]"])) as Record<PageSectionKey, string>,
};

/** What a save stored: the content read back from the server and the keys it did not keep. */
export type SaveResult = {
  stored: SiteContent;
  notSaved: (keyof SiteContent)[];
  /** False when the save succeeded but reading it back failed. */
  verified: boolean;
};

interface SiteContentContextType {
  content: SiteContent;
  updateContent: (newContent: Partial<SiteContent>) => Promise<SaveResult>;
  loading: boolean;
  error: string | null;
  refreshContent: () => Promise<void>;
}

const SiteContentContext = createContext<SiteContentContextType>({
  content: defaultSiteContent,
  updateContent: async () => { throw new Error('Site content provider is unavailable.'); },
  loading: true,
  error: null,
  refreshContent: async () => {},
});

const nonEmpty = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);

/**
 * Flat keys the backend's Content model stores at the top level (ContentUpdateRequest plus the
 * fields GET /content is seen returning). Every other key is dropped by PUT /admin/content, so
 * those are also saved inside `siteSettings.siteContent`, which the backend keeps as a free-form
 * object (`additionalProperties: true`).
 */
const BACKEND_FLAT_KEYS = new Set<string>([
  'homeTitle',
  'homeSubtitle',
  'publishTitle',
  'publishSubtitle',
  'packagesJson',
  'authorGuidelinesText',
  'royaltySummary',
  'aboutTitle',
  'aboutSubtitle',
  'aboutMission',
  'aboutVision',
  'contactEmail',
  'contactPhone',
  'contactHours',
  'faqsJson',
]);

/** Admin-only or derived keys that are never stored in the public content bag. */
const NOT_IN_BAG = new Set<string>(['adminProfileImage', 'contactAddressLine1', 'contactAddressLine2']);

/** Keep backend values verbatim, including intentionally empty fields. */
function pickContentKeys(source: unknown): Partial<SiteContent> {
  const picked: Partial<SiteContent> = {};
  for (const [key, value] of Object.entries(record(source))) {
    if (key === 'announcementActive' && typeof value === 'boolean') picked.announcementActive = value;
    else if (Object.hasOwn(defaultSiteContent, key) && key !== 'announcementActive' && typeof value === 'string') {
      picked[key as Exclude<keyof SiteContent, 'announcementActive'>] = value;
    }
  }
  return picked;
}

/**
 * GET /content returns both the flat keys the admin editor saves (homeTitle, packagesJson, ...)
 * and the backend's own grouped sections (hero{}, about{}, contact{}, faq[], socialLinks{}).
 * Flat keys win, then the `siteSettings.siteContent` bag (keys the backend has no column for),
 * then the grouped sections. Documented SEO, FAQ and announcement groups are authoritative
 * when present, including explicit clears; stale legacy copies must not mask saved values.
 */
export function fromBackendContent(input: unknown): Partial<SiteContent> {
  const api = record(input);
  const hero = record(api.hero), about = record(api.about), contact = record(api.contact);
  const settings = record(api.siteSettings), social = record(api.socialLinks);
  const seo = record(api.seo);
  const flat = pickContentKeys(api);
  const bag = pickContentKeys(settings.siteContent);

  const grouped: Partial<SiteContent> = {};
  const set = (key: Exclude<keyof SiteContent, 'announcementActive'>, value: unknown) => {
    const v = nonEmpty(value);
    if (v !== undefined) grouped[key] = v;
  };
  set('homeTitle', hero.title);
  set('homeSubtitle', hero.subtitle);
  set('aboutTitle', about.title);
  set('aboutSubtitle', about.subtitle);
  set('aboutMission', about.mission ?? about.body);
  set('aboutVision', about.vision);
  set('contactEmail', contact.email);
  set('contactPhone', contact.phone);
  set('contactHours', contact.hours);
  // The backend keeps one address string (contact.address / contactAddress).
  set('contactAddressLine1', api?.contactAddress || contact.address);
  // A single backend address line must not get the built-in second line appended to it.
  if (grouped.contactAddressLine1) grouped.contactAddressLine2 = '';
  set('contactSupportEmail', settings.supportEmail);
  set('socialFacebook', social.facebook);
  set('socialTwitter', social.twitter);
  set('socialInstagram', social.instagram);
  set('socialLinkedin', social.linkedin);
  set('seoTitle', seo.title);
  set('seoDescription', seo.description);
  set('seoKeywords', Array.isArray(seo.keywords) ? seo.keywords.filter((value): value is string => typeof value === 'string').join(', ') : seo.keywords);
  set('seoImage', seo.image);
  if (Array.isArray(api?.faq)) grouped.faqsJson = JSON.stringify(api.faq);
  const activeAnnouncement = Array.isArray(api?.announcements)
    ? api.announcements.map(record).find((a) => a && a.isActive !== false && nonEmpty(a.text ?? a.message ?? a.title))
    : null;
  if (activeAnnouncement) {
    grouped.announcementActive = true;
    grouped.announcementText = nonEmpty(activeAnnouncement.text ?? activeAnnouncement.message ?? activeAnnouncement.title);
  }

  const result = { ...grouped, ...bag, ...flat };
  const hasCanonicalSeo = api.seo !== null && typeof api.seo === 'object' && !Array.isArray(api.seo);
  for (const [key, value] of [
    ['seoTitle', seo.title], ['seoDescription', seo.description], ['seoImage', seo.image],
  ] as const) {
    if (hasCanonicalSeo) result[key] = typeof value === 'string' ? value : '';
  }
  if (Array.isArray(seo.keywords)) result.seoKeywords = seo.keywords.filter((value): value is string => typeof value === 'string').join(', ');
  else if (hasCanonicalSeo) result.seoKeywords = typeof seo.keywords === 'string' ? seo.keywords : '';
  if (Array.isArray(api.faq) || api.faq === null) result.faqsJson = JSON.stringify(api.faq ?? []);
  if (Array.isArray(api.announcements)) {
    const announcement = record(api.announcements[editableAnnouncementIndex(api.announcements)]);
    const text = announcement.text ?? announcement.message ?? announcement.title;
    result.announcementText = typeof text === 'string' ? text : '';
    result.announcementActive = announcement.isActive !== false && Boolean(result.announcementText.trim());
  }
  return result;
}

/** Edit the displayed announcement while preserving other records and their metadata. */
function editableAnnouncementIndex(announcements: unknown[]): number {
  const hasText = (value: unknown) => {
    const announcement = record(value);
    return Boolean(nonEmpty(announcement.text ?? announcement.message ?? announcement.title));
  };
  const active = announcements.findIndex((value) => record(value).isActive !== false && hasText(value));
  if (active >= 0) return active;
  const inactive = announcements.findIndex(hasText);
  return inactive >= 0 ? inactive : announcements.length ? 0 : -1;
}

function updatedAnnouncements(content: SiteContent, current: Record<string, unknown>): unknown[] {
  const announcements = Array.isArray(current.announcements) ? [...current.announcements] : [];
  const previous = fromBackendContent(current);
  const text = content.announcementText.trim();
  if (text === (previous.announcementText ?? '').trim() && content.announcementActive === Boolean(previous.announcementActive)) return announcements;
  if (content.announcementActive && !text) throw new Error('Enter an announcement message or turn off the announcement before saving.');
  const index = editableAnnouncementIndex(announcements);
  const edited = { ...record(announcements[index]), text, isActive: content.announcementActive };
  if (index >= 0) announcements[index] = edited;
  else if (text) announcements.push(edited);
  return announcements;
}

/**
 * PUT /admin/content body: the flat keys, the extra keys in `siteSettings.siteContent`, and the
 * backend's grouped sections kept in sync, so every field survives the backend's schema.
 */
export function toBackendPayload(content: SiteContent, input: unknown) {
  const current = record(input);
  // The backend keeps one address string (contactAddress / contact.address).
  const contactAddress = [content.contactAddressLine1, content.contactAddressLine2]
    .map((line) => line?.trim())
    .filter(Boolean)
    .join(', ');

  const bag: Record<string, unknown> = { ...record(record(current.siteSettings).siteContent) };
  for (const key of [...BACKEND_FLAT_KEYS, ...NOT_IN_BAG]) delete bag[key];
  for (const [key, value] of Object.entries(content)) {
    if (!BACKEND_FLAT_KEYS.has(key) && !NOT_IN_BAG.has(key)) bag[key] = value;
  }

  // Admin profile data belongs to /users/me, and split address fields are derived UI state.
  const { adminProfileImage: _profile, contactAddressLine1: _line1, contactAddressLine2: _line2, ...publicContent } = content;
  const faq: unknown = JSON.parse(content.faqsJson || '[]');
  if (!Array.isArray(faq) || faq.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('FAQs must be a JSON list of objects.');
  }
  return {
    ...publicContent,
    contactAddress,
    hero: { ...record(current.hero), title: content.homeTitle, subtitle: content.homeSubtitle },
    about: {
      ...record(current.about),
      title: content.aboutTitle,
      subtitle: content.aboutSubtitle,
      mission: content.aboutMission,
      vision: content.aboutVision,
    },
    contact: {
      ...record(current.contact),
      email: content.contactEmail,
      phone: content.contactPhone,
      address: contactAddress,
      hours: content.contactHours,
    },
    socialLinks: {
      ...record(current.socialLinks),
      facebook: content.socialFacebook,
      twitter: content.socialTwitter,
      instagram: content.socialInstagram,
      linkedin: content.socialLinkedin,
    },
    seo: {
      ...record(current.seo),
      title: content.seoTitle,
      description: content.seoDescription,
      keywords: content.seoKeywords.split(',').map((keyword) => keyword.trim()).filter(Boolean),
      image: content.seoImage,
    },
    faq,
    announcements: updatedAnnouncements(content, current),
    siteSettings: {
      ...record(current.siteSettings),
      supportEmail: content.contactSupportEmail,
      siteContent: bag,
    },
  };
}

/** Keys whose saved value did not come back from the backend (dropped or rejected). */
export function unsavedKeys(sent: SiteContent, stored: SiteContent): (keyof SiteContent)[] {
  return (Object.keys(sent) as (keyof SiteContent)[]).filter((key) => {
    if (key === 'contactAddressLine1' || key === 'contactAddressLine2') {
      const address = (value: SiteContent) => [value.contactAddressLine1, value.contactAddressLine2].map((line) => line.trim()).filter(Boolean).join(', ');
      return address(sent) !== address(stored);
    }
    if (key === 'seoKeywords') {
      const keywords = (value: string) => value.split(',').map((word) => word.trim()).filter(Boolean).join(',');
      return keywords(sent.seoKeywords) !== keywords(stored.seoKeywords);
    }
    if (key === 'announcementText') return sent.announcementText.trim() !== stored.announcementText.trim();
    if (key === 'faqsJson') {
      try { return !containsRequestedValues(JSON.parse(sent.faqsJson), JSON.parse(stored.faqsJson)); }
      catch { return true; }
    }
    if (NOT_IN_BAG.has(key)) return false;
    const value = sent[key];
    return value !== stored[key];
  });
}

/** Server-added IDs/metadata are allowed, while every requested value must be retained. */
function containsRequestedValues(expected: unknown, stored: unknown): boolean {
  if (Array.isArray(expected)) return Array.isArray(stored) && expected.length === stored.length && expected.every((value: unknown, index) => containsRequestedValues(value, stored[index]));
  if (expected !== null && typeof expected === 'object') {
    if (stored === null || typeof stored !== 'object' || Array.isArray(stored)) return false;
    const document = record(stored);
    return Object.entries(record(expected)).every(([key, value]) => Object.hasOwn(document, key) && containsRequestedValues(value, document[key]));
  }
  return Object.is(expected, stored);
}

/** A legacy mirror must not make a dropped canonical field appear successfully saved. */
export function canonicalContentNotSaved(content: SiteContent, stored: unknown): (keyof SiteContent)[] {
  const document = record(stored), seo = record(document.seo);
  const missing = new Set<keyof SiteContent>();
  for (const [key, field] of [['seoTitle', 'title'], ['seoDescription', 'description'], ['seoImage', 'image']] as const) {
    const value = seo[field];
    if (content[key] !== (typeof value === 'string' ? value : '')) missing.add(key);
  }
  const keywords = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
  if (!containsRequestedValues(keywords(content.seoKeywords), keywords(seo.keywords))) missing.add('seoKeywords');
  const faq: unknown = JSON.parse(content.faqsJson || '[]');
  if (!containsRequestedValues(faq, document.faq ?? [])) missing.add('faqsJson');
  const bag = record(record(document.siteSettings).siteContent);
  for (const [key, value] of Object.entries(content)) {
    if (!BACKEND_FLAT_KEYS.has(key) && !NOT_IN_BAG.has(key) && !containsRequestedValues(value, bag[key])) missing.add(key as keyof SiteContent);
  }
  return [...missing];
}

function verifyPreservedContent(payload: ReturnType<typeof toBackendPayload>, input: unknown) {
  const stored = record(input);
  if (!containsRequestedValues(payload.announcements, stored.announcements ?? [])) throw new Error('The backend did not retain the complete announcement collection.');
  const bag = record(record(stored.siteSettings).siteContent);
  for (const [key, value] of Object.entries(payload.siteSettings.siteContent)) {
    if (!Object.hasOwn(defaultSiteContent, key) && !containsRequestedValues(value, bag[key])) throw new Error('The backend did not preserve existing content metadata.');
  }
}

/** Backend rule: every key ending in Json is a JSON list string of at most 100 KB. */
const MAX_JSON_BYTES = 100 * 1024;

/** The first `…Json` field that the backend would reject, with the reason; null when all are valid. */
export function invalidJsonField(content: Partial<SiteContent>): { key: keyof SiteContent; reason: string } | null {
  for (const [key, value] of Object.entries(content)) {
    if (!key.endsWith('Json') || typeof value !== 'string') continue;
    try {
      if (!Array.isArray(JSON.parse(value || '[]'))) return { key: key as keyof SiteContent, reason: 'must be a JSON list [ … ]' };
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      return { key: key as keyof SiteContent, reason: `is not valid JSON (${err?.message || 'syntax error'})` };
    }
    if (new Blob([value]).size > MAX_JSON_BYTES) return { key: key as keyof SiteContent, reason: 'is larger than 100 KB' };
  }
  return null;
}

async function fetchBackendContent(): Promise<Record<string, unknown>> {
  const res = await api.get('/content', { cache: 'no-store' });
  const apiData = res?.data?.data || res?.data;
  if (!apiData || typeof apiData !== 'object' || Array.isArray(apiData)) throw new Error('The backend returned invalid site content.');
  return apiData;
}

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The last GET /content document, so a save keeps backend-only fields (siteName, seo, ...).
  const backendDocRef = useRef<unknown>(null);

  /** Only confirmed backend documents enter shared content state. */
  const applyBackendContent = useCallback((apiData: unknown): SiteContent => {
    backendDocRef.current = apiData;
    const merged = { ...defaultSiteContent, ...fromBackendContent(apiData) };
    setContent(merged);
    return merged;
  }, []);

  const refreshContent = useCallback(async () => {
      setLoading(true);
      try {
        const apiData = await fetchBackendContent();
        applyBackendContent(apiData);
        setError(null);
      } catch (err) {
        console.error('Error fetching global site content:', describeApiError(err));
        setError('Website information could not be loaded. Please retry.');
      } finally {
        setLoading(false);
      }
  }, [applyBackendContent]);

  useEffect(() => {
    refreshContent();
    return onLiveChange('site-content', refreshContent);
  }, [refreshContent]);

  /**
   * Saves to the backend, then reads GET /content back so the site (and the admin editor) shows
   * what was actually stored, and tells the site's other open tabs to reload.
   */
  const updateContent = async (newFields: Partial<SiteContent>): Promise<SaveResult> => {
    if (!backendDocRef.current) throw new Error('Load the current backend content before saving changes.');
    const { data: adminResponse } = await api.get('/admin/content', { cache: 'no-store' });
    const adminDocument = adminResponse?.data ?? adminResponse;
    if (!adminDocument || typeof adminDocument !== 'object' || Array.isArray(adminDocument)) throw new Error('The current administrator content could not be loaded.');
    const updated = { ...content, ...newFields };
    const payload = toBackendPayload(updated, adminDocument);
    await api.put('/admin/content', payload);
    notifyLiveChange('site-content');

    try {
      const [stored, adminReadback] = await Promise.all([
        fetchBackendContent(), api.get('/admin/content', { cache: 'no-store' }),
      ]);
      const savedAdminDocument: unknown = adminReadback.data?.data ?? adminReadback.data;
      verifyPreservedContent(payload, savedAdminDocument);
      const merged = applyBackendContent(stored);
      const token = useAuthStore.getState().token;
      const refreshed = await fetch('/api/content/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
      if (!refreshed.ok) throw new Error('Published metadata could not be refreshed.');
      return { stored: merged, notSaved: [...new Set([...unsavedKeys(updated, merged), ...canonicalContentNotSaved(updated, stored), ...canonicalContentNotSaved(updated, savedAdminDocument)])], verified: true };
    } catch {
      setError('Changes were sent, but the saved website information could not be verified. Please retry.');
      return { stored: content, notSaved: Object.keys(newFields) as (keyof SiteContent)[], verified: false };
    }
  };

  return (
    <SiteContentContext.Provider
      value={{
        content,
        updateContent,
        loading,
        error,
        refreshContent,
      }}
    >
      {error && (
        <div role="alert" className="fixed bottom-4 left-4 right-4 z-[100] rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">
          {error}
          <button type="button" className="ml-3 underline" onClick={refreshContent} disabled={loading}>Retry</button>
        </div>
      )}
      {children}
    </SiteContentContext.Provider>
  );
}

/**
 * The actual backend string, or undefined when the field is unpublished.
 */
export function editedContent(content: SiteContent | undefined, key: keyof SiteContent): string | undefined {
  const value = content?.[key];
  if (typeof value !== 'string' || !value.trim()) return undefined;
  return value;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
