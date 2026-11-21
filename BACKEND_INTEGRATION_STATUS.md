# Backend integration status

## Current frontend report — 21 November 2026

The detailed [frontend/API report](api-audit/frontend-api-report.html) includes the request and response JSON schemas, required fields, authentication, error/status contracts, exact frontend call sites, screen forms/buttons, role workflows, dependencies, fixes and release gates. A [machine-readable version](api-audit/frontend-api-report.json) accompanies it. Open the HTML file locally for endpoint search and expandable schemas. Regenerate it with `node tools/release-inventory.mjs` followed by `node tools/frontend-report.mjs`.

This is the Next.js frontend connected to the deployed Express/MongoDB API. Supplied API documentation, static source usage and successful live requests are separate evidence. Admin writes, payment/order transactions, manuscript changes and payouts require authorized staging verification. No production business records were changed.

The current fixes include debounced/cancellable catalog search, concurrent homepage requests, shared category request deduplication, private no-store reads, real profile persistence/readback, stricter CMS save verification and honest review errors. The local-only helpful-vote counter has been removed because no persistence endpoint is documented. Review submissions include the required real book ID; review aggregates use backend totals, rather than averaging the first 20 reviews as if they were the complete dataset.

Current validation: 150 unit tests in 23 files passed; lint has zero errors and 259 warnings (202 explicit-any, 56 synchronous effect-state warnings, one dependency warning); production build/TypeScript passed with 69 static pages; real browser/API checks finished with 59 passed and two admin checks skipped. Both npm vulnerability audits returned zero, and `npm ls --depth=0` completed without package conflicts. The first unit attempt hit a worker startup timeout; the final rerun passed after pure helpers were switched to Node while browser-persistence suites retained jsdom. A report-cleanup bug scanning a saved worktree was corrected and regression-checked; Playwright's saved passed result was preserved. These are combined check results, not a claim that the initial full command passed uninterrupted.

Image delivery observation: several Cloudinary fetches timed out in the local image optimizer during browser checks. Direct read-only HEAD checks of two affected PNG URLs subsequently returned HTTP 200 in about 1.9 and 0.6 seconds. The source URLs were not rewritten and production content was not changed. Sustained image/CDN load performance remains unverified.

Open issues include unpublished CMS section fields, unverified admin workflows, unspecified profile-photo clearing, missing review-list response documentation, and catalog filters/sorts that the backend does not apply globally. Remaining lint warnings and current test timestamps are included in the generated report. These changes do not certify the entire platform for production. The dated sections below preserve earlier verification history and are superseded by the latest report where findings differ.

Verified against the configured live backend on 18 November 2026. No backend source checkout or admin credentials are available in this workspace.

## Verified real HTTP responses

Public GET endpoints `/content`, `/books`, `/authors`, `/categories`, `/publish-packages`, `/stats/public`, and `/spotlights` returned HTTP 200.

The supplied author's real password login succeeded with role `author`. These authenticated GET endpoints returned HTTP 200:

- `/users/me/context` (publishing and dashboard capabilities granted)
- `/authors/me/dashboard`
- `/authors/me/books`
- `/authors/me/analytics?range=30d`
- `/authors/me/books/performance`
- `/authors/me/royalties`
- `/authors/me/royalty-settlements`
- `/authors/me/manual-royalties`
- `/authors/me/payment-details` (masked account details)

No orders, manuscripts, financial entries, payout details, profiles, or CMS records were modified by these checks. Login/logout tests create and revoke only their own authentication sessions.

## Frontend changes

- Removed embedded CMS marketing, policy, FAQ, package, and page-section seeds from runtime modules.
- Removed legacy string filtering: the backend's published text and explicit empty fields are authoritative.
- Removed persistent CMS cache hydration and unverified optimistic CMS saves. Failed loads show an explicit retry notice.
- Contact details, social links, SEO metadata, and organization structured data use backend values.
- Missing policy/publishing sections show an unpublished state, with any real backend summary preserved.
- Removed intercepted API responses, synthetic browser sessions, and HTTP mocks from tests. Author tests authenticate with the actual account; pure unit-test inputs remain isolated from network activity.
- Author book lists load backend pagination. Failed financial requests show unavailable values, rather than zero balances.
- OAuth configuration, active/verified account flags, and logout use actual configuration/backend state.
- Explicit sign-out waits for backend revocation with a bounded timeout, then clears the session and navigates home without racing the protected-route guard.
- Author creation requires a genuine email; category resolution no longer creates invented categories.
- Search query strings reach the backend, with cancellation of obsolete requests.

## Backend data still required

The live `/content` document does not return the 17 page-section fields listed in `PAGE_SECTION_KEYS` in `lib/page-content.ts`, and its `siteSettings.siteContent` bag is absent. Its published `faqsJson` is an empty list. The frontend now reflects these missing values instead of supplying its own claims.

An administrator must publish approved real content through the CMS. If the backend drops these fields on save, its content schema/storage must be corrected in the backend repository. The frontend verifies saved values by re-reading `/content`.

Admin-protected APIs and writes cannot be certified with an author account. Configure `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` locally to enable read-only admin checks. Payment submission, order creation, and editorial/payout mutations require a dedicated test environment and suitable accounts.

## Running verification

See [TESTING.md](TESTING.md). `npm run test:all` runs unit checks, lint, production build/type validation, and live backend/browser checks. Reports are written to the Git-ignored `test-suite-results/` and `playwright-report/` directories. Credentials remain in the Git-ignored `.env.test.local`; authenticated browser traces are disabled.

Final verification on 18 November 2026: 122 unit tests passed; lint reported zero errors and 601 warnings; production build and TypeScript validation passed; 42 real browser/API tests passed, with the admin-account check explicitly skipped. The real author login/logout test confirmed successful backend session revocation and a return to the home page. Live tests are paced to respect the shared backend's request limit.

Next.js reported a known security vulnerability and recommended upgrading. The normal retry completed successfully after its reminder; dependencies were not upgraded by this task.

## Category emergency integration — 20 November 2026

This section supersedes earlier category findings only. The wider production-release audit remains paused. This repository is the Next.js frontend. The supplied backend handover identifies Node.js/Express/MongoDB; no Django backend or backend source checkout is available here. No backend files were changed.

### Inspection and repairs

The existing admin CRUD screen and backend endpoints were reused. Confirmed frontend problems included first-page-only lists, missing case-insensitive duplicate checks, category-name form values, a stale-ID fallback on edit, invented Fiction/category-detail defaults, and inconsistent category refresh behavior.

- `lib/category-data.ts` validates category list envelopes and stable identities, normalizes duplicate names, and resolves only existing IDs. `lib/categories.ts` loads every backend page, keeps inactive admin records available, invalidates caches, and creates categories only through the real admin endpoint.
- `hooks/use-book-categories.ts` connects admin book forms and author manuscript choices to the backend with loading/error/retry states. Add/Edit Book use actual IDs, retain existing inactive relationships, and reject unavailable selections. No unrelated book fields were rewritten by the category repair.
- `app/admin/categories/page.tsx` loads active and inactive records, searches locally across the complete inventory, checks duplicate names against a fresh complete inventory, and refreshes after mutations. Unknown or nonzero book counts block deletion; an additional fresh detail read checks the count before DELETE. The backend must still enforce the association check atomically. The existing form now uses the established accessible Dialog component.
- `lib/live-sync.ts` notifies the current tab and other tabs. Public home/categories/catalog/category detail/book detail, author books, and author manuscript choices refresh category data on relevant events or focus. Runtime category options are never populated from the initial seed list.
- Category detail failures no longer become invented category records or descriptions. Empty categories have an explicit empty state, and category book listings expose real backend pagination. Combined catalog search/category filtering gathers real search pages before applying the category intersection.

### Live API evidence

Read-only requests to `https://harglimpublish-backend.onrender.com/api` confirmed:

| Request | Observed behavior |
| --- | --- |
| GET /categories?active=true&limit=100 | HTTP 200, `{success:true,data:[categories],pagination:{total,page,limit,pages}}`; nine active categories at inspection |
| GET /categories/poetry | HTTP 200, `{success:true,data:category}` with stable `_id`, name and slug |
| GET /categories/poetry/books?limit=2 | HTTP 200, three books over two pages; populated category IDs match Poetry |
| GET /books?category=poetry&limit=100 | HTTP 200, three books matching Poetry |
| GET /books?category=<Poetry ID>&limit=100 | HTTP 200, zero books: browsing expects the slug, not the ID |
| GET /admin/categories?limit=1 without authentication | HTTP 401 |

The supplied OpenAPI specifies admin GET/POST `/admin/categories`, GET/PUT/DELETE `/admin/categories/{id}`, and PATCH `/admin/categories/{id}/status`. Create requires `{name}`, with optional description, active, featured, and sortOrder. Update accepts those editable fields; status accepts `{active:boolean}`. Responses contain the category's stable `_id`. DELETE is documented as soft deletion with HTTP 409 when active books are assigned. Book create/update payloads reference the category ID. These write contracts are documentation evidence, not proof of successful live mutations.

### Seed status and blockers

`node tools/seed-categories.mjs` defaults to a read-only dry run. `--apply` requires locally configured `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`, verifies real admin context, reads active and inactive categories, adds missing names only, then verifies the inventory. Existing IDs and records are never updated/deleted. It stops on name/slug conflicts or failed requests, and does not retry ambiguous writes automatically. A subsequent dry run is idempotent. The 63 initial names live only in maintenance tooling.

The initial live public-only preview found Fiction and Poetry already present, 60 potentially missing names, and one conflict: requested **Self-Help** versus existing **Self Help** with slug `self-help`. Inactive inventory remains unverified without admin access. No live seed was applied and no category was renamed. The user subsequently confirmed that all existing names and IDs must be preserved. The seed planner now explicitly recognizes the existing Self Help record as covering the requested Self-Help category, without renaming it or creating a duplicate. Other unexpected slug conflicts still stop the seed. A second public-only dry run confirmed three covered entries (including preserved Self Help), 60 potentially missing entries and zero conflicts. Admin inventory and live seed verification remain pending.

Only author credentials are configured. No staging backend or authorized admin credentials are available. Admin browser login, category create/edit/delete/persistence across sessions, duplicate rejection by the server, association-safe deletion, book create/edit persistence, and the complete 63-name seed remain unverified. Transactional workflow tests must use an authorized test environment. Backend follow-up must verify trimmed/case-insensitive unique names under concurrency, stable IDs, atomic association-safe deletion (including unpublished books), consistent counts, active/isActive synchronization, and safe slug behavior when renaming categories. Existing production records were preserved.

### Verification

Pure category-contract and seed-planning tests plus real-backend category browser/API checks were added. The full unit run passed 138 tests. After the user approved existing-name preservation, all nine updated category checks passed separately. TypeScript validation and the production build passed (69 static pages). Full lint returned zero errors and 272 warnings; the broader warning cleanup remains paused. The real-backend browser/API suite completed with 57 passed and two admin-only checks explicitly skipped (59 total). All five executable category integration checks passed: directory/reload, slug filtering and relationships, empty category, missing category, and anonymous/author denial at admin reads. The existing author login, dashboard, analytics, financial reads, CSV, mobile navigation, public navigation, responsive catalog, slow connection, and offline checks also passed. These are read-only integration results; they do not certify admin mutations or live seeding. Logs and summaries remain in the ignored test-suite-results/ and playwright-report/ directories. No deployment was performed. Historical test counts above do not validate this emergency change.

Test configuration also explicitly scopes unit discovery to application source folders and excludes generated Next.js/Netlify output and browser reports. Test isolation is retained.
