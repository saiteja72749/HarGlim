import api, { getPublic, invalidateApiCache } from "@/lib/api";
import { describeApiError, record } from "@/lib/api-error";
import type { components } from "@/types/openapi.generated";

export function parseTermsConfig(input: unknown) {
  const data = record(input);
  const version = typeof data.currentVersion === "string" && data.currentVersion.trim() ? data.currentVersion : null;
  const effectiveAt = typeof data.effectiveAt === "string" && Number.isFinite(Date.parse(data.effectiveAt)) ? data.effectiveAt : null;
  if (typeof data.enforcementEnabled !== "boolean" || (data.enforcementEnabled && (!version || !effectiveAt))) {
    throw new Error("The API returned incomplete publishing terms configuration.");
  }
  return { version, effectiveAt, enforced: data.enforcementEnabled };
}

export function parseTermsStatus(input: unknown) {
  const config = parseTermsConfig(input);
  const { accepted, requiresAcceptance } = record(input);
  if (typeof accepted !== "boolean" || typeof requiresAcceptance !== "boolean" ||
    (config.enforced && accepted === requiresAcceptance)) throw new Error("The API returned inconsistent publishing terms status.");
  return { ...config, accepted, required: config.enforced && requiresAcceptance };
}

export function parseTermsSections(input: unknown) {
  const content = record(input);
  const raw = content.sections ?? record(record(content.siteSettings).siteContent).termsSectionsJson ?? content.termsSectionsJson;
  const sections: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!Array.isArray(sections)) return [];
  return sections.flatMap((entry) => {
    const section = record(entry);
    return typeof section.title === "string" && section.title.trim() &&
      typeof section.content === "string" && section.content.trim()
      ? [{ title: section.title, content: section.content }] : [];
  });
}

const body = (value: unknown) => record(value).data ?? value;

class TermsVersionChangedError extends Error {}

export async function loadTerms(refreshContent = false) {
  const authorStatus = await api.get("/authors/me/publishing-terms", { cache: "no-store" });
  const status = parseTermsStatus(body(authorStatus.data));
  if (!status.required) return { ...status, sections: [] };

  const publicConfig = await getPublic("/publishing-terms");
  const current = body(publicConfig.data);
  const config = parseTermsConfig(current);
  if (config.version !== status.version || config.effectiveAt !== status.effectiveAt || config.enforced !== status.enforced) {
    throw new TermsVersionChangedError("Publishing terms changed during the request. Refresh and try again.");
  }
  if (refreshContent) invalidateApiCache("/content");
  const sections = parseTermsSections(Array.isArray(record(current).sections) ? current : body((await getPublic("/content")).data));
  return { ...status, sections };
}

export async function acceptTerms(version: string) {
  const payload: components["schemas"]["PublishingTermsAcceptanceRequest"] = { version };
  await api.post("/authors/me/publishing-terms/accept", payload);
  const status = await loadTerms();
  if (status.version !== version) throw new TermsVersionChangedError("Publishing terms changed before acceptance readback.");
  if (!status.accepted || status.required) {
    throw new Error("The API has not confirmed acceptance of the current terms. Refresh before continuing.");
  }
  return status;
}

export function termsConflict(error: unknown) {
  if (error instanceof TermsVersionChangedError) return true;
  const failure = describeApiError(error);
  const detail = record(record(record(error).response).data);
  return /PUBLISHING_TERM|TERMS_VERSION|TERMS_ACCEPTANCE/i.test(String(detail.code ?? detail.error ?? "")) ||
    (failure.response?.status === 403 || failure.response?.status === 409) &&
      /\b(publishing terms|terms version)\b/i.test(failure.response?.data.message ?? "");
}
