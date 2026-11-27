import { beforeEach, describe, expect, it, vi } from "vitest";
import api, { getPublic } from "@/lib/api";
import { canEnterTracking, parseCourierCapabilities } from "@/lib/courier-capabilities";
import { acceptTerms, loadTerms, parseTermsConfig, parseTermsSections, parseTermsStatus, termsConflict } from "@/lib/publishing-terms";
import { parseRuntimeMetrics } from "@/lib/runtime-metrics";
import { authorAnalyticsDateQuery } from "@/lib/author-analytics-query";
import { bookLanguageError, normalizeBookLanguage } from "@/lib/book-language";
import { uploadImage } from "@/lib/image-upload";

vi.mock("@/lib/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
  getPublic: vi.fn(),
  invalidateApiCache: vi.fn(),
}));

const config = { currentVersion: "v2", effectiveAt: "2026-11-26T00:00:00.000Z", enforcementEnabled: true };

beforeEach(() => vi.resetAllMocks());

describe("frontend alignment handover", () => {
  it("normalizes optional Unicode languages and enforces the character limit", () => {
    expect(normalizeBookLanguage("  తెలుగు   (India)  ")).toBe("తెలుగు (India)");
    expect(normalizeBookLanguage(" \t ")).toBeUndefined();
    expect(bookLanguageError("𐐀".repeat(80))).toBeUndefined();
    expect(bookLanguageError("𐐀".repeat(81))).toMatch(/80/);
    expect(bookLanguageError("English\u0000")).toMatch(/control/);
  });

  it("requires both valid days and produces inclusive UTC bounds", () => {
    expect(authorAnalyticsDateQuery("2026-11-01", "2026-11-30")).toEqual({
      from: "2026-11-01T00:00:00.000Z", to: "2026-11-30T23:59:59.999Z",
    });
    expect(authorAnalyticsDateQuery("2026-11-01", "")).toBeUndefined();
    expect(authorAnalyticsDateQuery("2026-11-31", "2026-12-01")).toBeUndefined();
    expect(authorAnalyticsDateQuery("2026-11-30", "2026-11-01")).toBeUndefined();
  });

  it("sends exactly one image part for admin and author uploads", async () => {
    const file = new File(["test"], "cover.webp", { type: "image/webp" });
    vi.mocked(api.post).mockResolvedValue({ data: { data: { url: "https://example.com/cover.webp" } } });
    await expect(uploadImage(file)).resolves.toBe("https://example.com/cover.webp");
    await expect(uploadImage(file, "/authors/me/uploads/image")).resolves.toBe("https://example.com/cover.webp");
    const requests = vi.mocked(api.post).mock.calls.map(([path, body]) => {
      if (!(body instanceof FormData)) throw new Error("Expected a multipart image request.");
      return [path, Array.from(body.entries())];
    });
    expect(requests).toEqual([
      ["/uploads/image", [["image", file]]],
      ["/authors/me/uploads/image", [["image", file]]],
    ]);
  });
});

describe("publishing terms", () => {
  it("honors disabled enforcement even when the author has never accepted", () => {
    expect(parseTermsStatus({ ...config, enforcementEnabled: false, accepted: false, requiresAcceptance: false }))
      .toMatchObject({ enforced: false, required: false });
  });
  it("rejects an incomplete version or contradictory acceptance", () => {
    expect(() => parseTermsConfig({ ...config, currentVersion: "" })).toThrow();
    expect(parseTermsConfig({ currentVersion: null, effectiveAt: null, enforcementEnabled: false }))
      .toEqual({ version: null, effectiveAt: null, enforced: false });
    expect(() => parseTermsStatus({ ...config, accepted: false, requiresAcceptance: false })).toThrow();
  });
  it("reads configured CMS sections and ignores incomplete ones", () => {
    const data = { siteSettings: { siteContent: { termsSectionsJson: '[{"title":"Terms","content":"Published copy"},{"title":"Empty"}]' } } };
    expect(parseTermsSections(data)).toEqual([{ title: "Terms", content: "Published copy" }]);
  });
  it("skips public reads when terms are already accepted", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { ...config, accepted: true, requiresAcceptance: false } } });
    vi.mocked(getPublic).mockResolvedValue({ data: { data: config } } as Awaited<ReturnType<typeof getPublic>>);
    await expect(loadTerms()).resolves.toMatchObject({ required: false, sections: [] });
    expect(getPublic).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
  it("continues with the authoritative disabled status when version and date are null", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: {
      currentVersion: null, effectiveAt: null, enforcementEnabled: false,
      accepted: false, requiresAcceptance: false,
    } } });
    vi.mocked(getPublic).mockRejectedValue(new Error("Public terms unavailable"));
    await expect(loadTerms()).resolves.toMatchObject({ version: null, effectiveAt: null, required: false, sections: [] });
    expect(getPublic).not.toHaveBeenCalled();
  });
  it("recognizes a message-only terms conflict and ignores unrelated authorization failures", () => {
    expect(termsConflict({ response: { status: 403, data: { message: "Accept the current publishing terms first" } } })).toBe(true);
    expect(termsConflict({ response: { status: 403, data: { message: "Author access required" } } })).toBe(false);
  });
  it("posts the exact version and requires a fresh authenticated readback", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.get).mockResolvedValue({ data: { data: { ...config, accepted: true, requiresAcceptance: false } } });
    vi.mocked(getPublic).mockResolvedValue({ data: { data: config } } as Awaited<ReturnType<typeof getPublic>>);
    await expect(acceptTerms(config.currentVersion)).resolves.toMatchObject({ accepted: true });
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/authors/me/publishing-terms/accept", { version: config.currentVersion });
    expect(api.get).toHaveBeenCalledExactlyOnceWith("/authors/me/publishing-terms", { cache: "no-store" });
  });
  it("identifies a version changed during acceptance readback", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(api.get).mockResolvedValue({ data: { data: { ...config, accepted: true, requiresAcceptance: false } } });
    vi.mocked(getPublic).mockResolvedValue({ data: { data: config } } as Awaited<ReturnType<typeof getPublic>>);
    await expect(acceptTerms("v1")).rejects.toSatisfy(termsConflict);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});

it("allows manual tracking only for configured capabilities", () => {
  const manual = { provider: "manual", available: true, mode: "MANUAL", status: "CONFIGURED",
    supportsAutomaticBooking: false, supportsManualTracking: true };
  const automatic = { ...manual, provider: "carrier", status: "NOT_CONFIGURED", supportsAutomaticBooking: true };
  expect(parseCourierCapabilities({ data: { providers: [manual, automatic] } }).filter(canEnterTracking).map(x => x.provider)).toEqual(["manual"]);
  expect(() => parseCourierCapabilities({ data: { shipmentNumber: "fixture-1" } })).toThrow();
});

it("keeps measured zeroes and rejects generic or incomplete metrics envelopes", () => {
  const data = { uptimeSeconds: 5, requests: { total: 0, inFlight: 0, statusCounts: {}, latencyMs: { avg: 0, p50: 0, p95: 0, p99: 0 } },
    memory: { rss: 1048576, heapUsed: 2097152 } };
  expect(parseRuntimeMetrics({ data })).toMatchObject({ total: 0, average: 0, memoryMiB: { rss: 1, heapUsed: 2 } });
  expect(parseRuntimeMetrics({ data: {
    uptimeSeconds: 5,
    requests: { total: 2, inFlight: 0, statusClasses: { "2xx": 1, "3xx": 0, "4xx": 1, "5xx": 0 },
      sampleSize: 2, durationMs: { average: 4, p50: 2, p95: 6, p99: 6 } },
    memoryBytes: { rss: 1048576, heapTotal: 4194304, heapUsed: 2097152, external: 10 },
  } })).toMatchObject({ total: 2, average: 4, statusCounts: [{ status: "2xx", count: 1 }, { status: "3xx", count: 0 }, { status: "4xx", count: 1 }, { status: "5xx", count: 0 }], memoryMiB: { rss: 1, heapUsed: 2 } });
  expect(() => parseRuntimeMetrics({ data: { items: [] } })).toThrow();
});

it("distinguishes unavailable metrics, empty status counts and a real zero sample size", () => {
  expect(parseRuntimeMetrics({ uptimeSeconds: 0, requests: { total: 0, statusClasses: {}, sampleSize: 0 }, memoryBytes: { rss: 0 } }))
    .toMatchObject({ total: 0, sampleSize: 0, inFlight: null, average: null, statusCounts: [], memoryMiB: { rss: 0, heapUsed: null } });
  expect(parseRuntimeMetrics({ uptimeSeconds: 5, requests: { total: 2 } }).statusCounts).toBeNull();
  expect(() => parseRuntimeMetrics({ uptimeSeconds: 5, requests: { total: 2, durationMs: { p95: -1 } } })).toThrow();
});
