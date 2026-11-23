# Compact catalog and public API reliability

23 November 2026, Asia/Kolkata

## Source audit

The prior build mounted the featured-book hero, the general Books shelf, and the Reader Favorites grid with three independent book queries. The shelf and storefront cards reused a component with two detail links, cart and wishlist state, rating and price display, and additional actions. Card image slots and skeletons used different proportions across browse surfaces. Book details fetched reviews and related books immediately alongside the current book. Ratings also appeared in the catalog controls, book structured data, public author profiles, reader wishlists, and Author Studio reporting.

The browser CMS provider fetched `/content` even when the server layout already had the published CMS record for metadata. Categories already shared a short-lived parsed list, but focus events could force refreshes and invalidate that list. Catalog and search passed an abort signal, which excluded them from the existing generic GET cache. The dedicated search page walked every matching page. Public calls could also inherit a Bearer token from the active session and enter the auth refresh flow.

## Implementation

| Change | Files |
| --- | --- |
| Reuse cover-and-title cards, fixed-size cover frames and matching loading placeholders across the storefront. Each card has one keyboard-accessible link, an uncropped lazy image and a neutral fallback. | `components/books/book-card.tsx`, `compact-book-cover.tsx`, `book-card-skeleton.tsx`, `app/books/page.tsx`, `app/search/page.tsx`, public author and category pages |
| Keep the manually selected featured hero and a ten-book horizontal Books shelf. Remove the Reader Favorites grid and bestseller request. The shelf scrolls natively, snaps to cards and has previous/next controls on desktop. | `app/page.tsx`, `components/books/home-book-shelf.tsx` |
| Remove storefront and reader/author rating displays, controls and review fetches. Keep the author name, price, format, synopsis and purchase actions on detail pages. Add the existing wishlist operation there. Load recommendations near the viewport. | `app/books/[slug]/layout.tsx`, `components/books/book-detail-view.tsx`, `app/authors/[id]/page.tsx`, `app/dashboard/wishlist/page.tsx`, `app/author/books/page.tsx`, `app/author/analytics/page.tsx` |
| Share in-flight and recently completed public GETs through the existing Axios client. Cancel a network read once its last consumer leaves. Use server pagination on search, preserve catalog debounce, and ignore obsolete rating query keys while retaining unrelated parameters. | `lib/api.ts`, `lib/public-api-cache.ts`, `lib/api-error.ts`, `lib/catalog.ts`, `lib/public-collection.ts`, `types/axios.d.ts` |
| Initialize the CMS provider from the shared server read, preserve admin readback and metadata tag revalidation, and refresh public cache entries on relevant edits. Keep partial page failures and retry actions in context. | `app/layout.tsx`, `app/providers.tsx`, `context/site-content-context.tsx`, `lib/fetch-record.ts`, `lib/categories.ts`, `lib/public-stats.ts`, `lib/publish-packages.ts`, `lib/live-sync.ts`, `components/ui/error-state.tsx` |

The public bestseller filter still uses real backend flags. Legacy rating URLs resolve as ordinary catalog links using the default sort, while category, search, price, format and bestseller filters remain functional. Existing review endpoints, saved records and admin moderation are preserved.

## Request measurements

The baseline used Chromium against the previous local production build and live public endpoints. It counted browser-initiated GETs to `/content`, `/categories`, `/books` and `/search`. The same browser navigated from home to catalog, typed a search query, and hard-refreshed. Counts cover browser-initiated GETs only. Every baseline request received HTTP 200.

| Scenario | Before | After | Requests after |
| --- | ---: | ---: | --- |
| Cold homepage | 5 | 3 | Featured books, Books shelf, categories |
| Home to catalog | 1 | 1 | Paginated books |
| Catalog search | 1 | 1 | Debounced books query |
| Catalog hard refresh | 3 | 2 | Categories and paginated books |

The same browser flow against the updated production build started seven tracked GETs across the four steps, down from ten. Six returned HTTP 200 within their observation windows. One homepage request was still pending at its step's sampling cutoff. CMS was available from the server-rendered page.

## Rate limit and cache behavior

The earlier Chromium capture recorded HTTP 429 for categories and content with `RateLimit-Limit: 100`, `RateLimit-Policy: 100;w=900`, `RateLimit-Remaining: 0` and matching `RateLimit-Reset` and `Retry-After` of 467 seconds. The edge identified itself as Cloudflare and reported `CF-Cache-Status: DYNAMIC`. This establishes saturation of a 100-request, 15-minute policy on the API path. The HTML frontend and browser retries did not generate those 429 responses. The JSON response and policy headers are consistent with an application rate limiter behind the edge, but identifying the exact middleware, key, or shared IP scope requires access to the backend and proxy configuration. The earlier read-only retry passed after the provider window.

Browser public cache lifetimes are 60 seconds for CMS, category pages, public authors and public counts, 30 seconds for publishing packages, 20 seconds for book lists and recommendations, and 15 seconds for search. The cache is bounded and scoped to a browser tab. Identical concurrent requests share a flight, and different queries retain their own pagination and cancellation. Server record reads use Next’s existing five-minute cache and explicit CMS tag invalidation, with React request memoization between metadata and layout. Catalog and search use cached browsing results. Individual purchase details obtain a fresh price and stock response before enabling purchase actions, and checkout continues to use backend totals and availability.

Public 429 responses pause further network reads for the affected collection until the exposed `Retry-After` deadline. The browser falls back to a 15-second local pause if the header is unavailable. The captured 429 responses did not expose that header or `X-Request-Id` through CORS. The client records the request ID when the API exposes it. Server errors have a manual retry. There is no timed replay or jitter loop, and an auth refresh does not automatically replay a POST. Private author, reader, admin, financial and payment responses are excluded from the public cache.

## Backend and staging dependencies

The workspace contains the Next.js frontend and API handover. Express middleware, Render proxy settings, MongoDB access, staging credentials, and an approved load target are unavailable. MongoDB query plans, index selectivity, pool utilization, server CPU/memory, compression, response sizes under load, readiness and request correlation across services remain unverified. The evidence supports request reduction and bounded browser recovery. It does not establish production capacity, latency percentiles under concurrency, or a cache hit rate across visitors.

In staging, replay the same browse flow while increasing concurrency gradually within the environment's approved limits. Measure requests per visit and cache hits, 429 and 5xx rates, p50/p95/p99, database query latency and pool usage, and CPU and memory. Verify Render’s trusted-proxy hop count and limiter key with shared-IP clients, separate public browse/search quotas from authentication and sensitive operations, and validate a shared limit store if the API runs multiple instances. Use actual query plans before adding indexes. Expose retry and correlation headers for production and staging frontend origins. High-concurrency production traffic was outside the scope of this work.

## Verification

- Vitest passed all 175 tests across 31 files. The public cache tests cover concurrent reads, independent caller cancellation, 304 reuse, invalidation, fresh purchase reads and the 429 cooldown.
- Repository-wide ESLint reported zero errors and 243 warnings.
- The Next.js production build passed, including TypeScript and generation of 70 static pages.
- The production-build Chromium regression passed all 18 selected tests. It covered real catalog filters and pagination, search and debounce, desktop carousel arrows, mobile touch scrolling, legacy links, cart placement from book details, and live Author Studio reads. Home, catalog and book detail passed overflow checks at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 pixels.
- The offline test recovered through a real catalog GET. The browser 429 test intercepted the first request with a three-second `Retry-After`, observed zero automatic replays, and recovered through one manual retry against the API. Checkout and ambiguous order recovery used test fixtures. Live admin edits, production order writes and load capacity remain staging gates.
- Regression coverage lives in `lib/public-api-cache.test.ts`, `tests-e2e/mobile-design.spec.ts`, `tests-e2e/categories-integration.spec.ts`, and `tests-e2e/reliability.spec.ts`. Git's whitespace check passed.

## Deployment and rollback

Deploy the verified frontend artifact to authorized staging with the intended API and website base URLs. Verify catalog browsing, blank and paginated search, compact cards, updates following an authorized admin book edit, live payment and order readbacks, and a deliberately throttled public request. Confirm that CMS edits invalidate the metadata cache and that 429 headers are available cross-origin. Review request rates and error metrics before promoting with approval. Preserve the previous frontend artifact for rollback and restore it if catalog, authentication, or checkout errors increase. The change requires no data migration.
