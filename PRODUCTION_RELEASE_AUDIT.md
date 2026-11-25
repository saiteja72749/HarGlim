# Production release audit

## 25 November 2026 validation

**Release decision: NOT READY.** Dedicated staging access, a functioning reader test session, an authorized admin session, backend observability, and server-side publishing terms acceptance are release gates.

### Validation results

| Check | Result |
| --- | --- |
| Dependency install and Chromium setup | Passed. A lockfile-preserving npm cache retry completed the clean install. |
| Unit tests | 179 discovered and passed across 32 files. |
| Lint, TypeScript, production build | Passed. Repository lint reported zero errors and warnings. The current build generated 68 static pages. |
| Chromium full run | 91 discovered across 12 files, with 86 passed, 2 failed and 3 skipped. The three skips require admin credentials. |
| Offline recovery targeted rerun | Passed after the test waited for the page to become interactive before disconnecting. The full run's earlier failure remains in its report. |
| Reader mobile | Failed at real sign-in with HTTP 401. Authenticated reader coverage remains blocked. |
| npm advisory checks | Zero listed vulnerabilities in the complete lockfile and production-only checks. |

Chromium passed manual carousel and swipe navigation, the absence of public ratings, responsive order controls, the local Admin layout, the saved public author profile, real author dashboard and owned data, cross-tab logout, offline catalog recovery, and handling a controlled HTTP 429 without an automatic replay. The checkout and UTR interaction checks used local fixtures. Their success provides no production transaction evidence.

| Severity | Finding | Evidence and remaining work |
| --- | --- | --- |
| High | Staging transactions and capacity are blocked | No isolated backend or service metrics were available. Verify the staging journeys in [TESTING.md](TESTING.md), then use the 1, 10, 25, 50, and 100-user ladder. Advance only after stable latency, error rates, resource usage, and recovery at the prior stage. Record hardware and service configuration, p50/p95/p99, throughput, 429s, 5xx, CPU, memory, connections, MongoDB latency, and cache hit rate. |
| High | Publishing terms acceptance lacks a persistence contract | The deployed OpenAPI has no current terms version and no per-author acceptance read/write operation. The manuscript form currently checks acknowledgement on submission. Backend must return the required version, the author's accepted version/time, accept the current version, and enforce the version on submission. |
| High | Full role and financial coverage is blocked | The workspace has author and reader credentials configured and no admin credentials. Role checks exercise only permitted sessions. Cross-author financial isolation and complete admin-to-reader and admin-to-author writes require dedicated staging accounts and records. |
| Medium | Historical 429 root cause is unresolved | Live responses advertise `RateLimit-Limit: 100`. A sampled categories preflight returned HTTP 204 with no rate-limit headers. The client previously set JSON content type even for bodyless reads and a public category hook could force cache invalidation. These are request overhead contributors. Backend logs and proxy/limiter configuration are required to attribute historical 429s to a specific policy, traffic source, or database bottleneck. |
| Medium | Courier catalogue contract is missing | Swagger provides shipment status and manual courier assignment, and contains no separate catalogue or delivery-plan API. Backend provisioning and tracker integration require staged verification. |
| Medium | Session storage and server controls require coordination | Existing refresh tokens remain in browser storage. Backend session rotation, access enforcement, CORS, and CSRF behavior must be validated before changing the session contract. This pass keeps rate limiting and authorization controls enabled. |
| Medium | Deployed Swagger contains invalid response keys | The generator found 832 occurrences of settlement schema names stored as HTTP response keys. This corrupts machine-readable contracts, even when individual endpoints return valid live responses. Move these definitions into the schema registry and reference them from valid HTTP responses. |
| Low | ESLint 9 is deprecated | The pinned integration passed lint with zero errors and warnings. The clean install still emits the upstream support notice. Migrate once the compatible Next.js/React lint stack is available. |

Public readiness observations used low-volume read requests. Live Swagger and its JSON returned HTTP 200. The live JSON contained 173 paths versus 150 in the checked-in snapshot. Public GETs to `/content`, `/categories?limit=2`, `/books?limit=2`, `/authors?limit=2`, `/publish-packages`, `/spotlights?limit=2`, and `/search?q=book` returned 200. Signed-out GETs to `/admin/dashboard` and `/authors/me/manual-royalties` returned 401. These are endpoint status checks. Timings from the single sampled curl-equivalent PowerShell client ranged from 0.53 to 2.83 seconds across the five timed public collections/search requests. This sample provides no production latency percentiles or throughput estimate. [Deployed Swagger](https://harglimpublish-backend.onrender.com/api/docs)

The configured author session returned HTTP 200 from `/users/me/context`, `/authors/me/dashboard`, `/authors/me/books`, `/authors/me/payment-details`, `/authors/me/manual-royalties`, and `/authors/me/royalty-settlements`. The payment-details response specified `Cache-Control: no-store`. The same account received 403 from `/admin/dashboard` and signed out successfully. Reader sign-in returned 401. Admin credentials and a staging URL were unavailable.

The [source inventory](api-audit/release-workflow-inventory.json) covers 70 source screens and 211 HTTP call sites. It resolved 199 sites against live Swagger. Twelve require context for dynamic paths or local infrastructure. Manual inspection traced manuscript decisions and Spotlight actions to their Admin contracts, sitemap lists to public books and authors, and book details and related titles to their slug routes. The two author ledger collections map to manual royalties and royalty settlements. The three generic HTTP helpers have caller-dependent paths. `POST /api/content/revalidate` belongs to the Next.js frontend and authorizes via the backend. This inventory establishes source coverage, while live evidence establishes only the routes actually exercised.

### Browser request sample

The baseline was one Chromium browser against the currently deployed frontend and backend. It counts browser traffic to the API host, including observed preflights, and excludes backend calls originating from Netlify or Next.js. Each scenario is one sample. Browser results cannot reveal backend request volume, staging load capacity, or the cause of historical 429s.

| Scenario | Deployed requests | Candidate requests | OPTIONS before → after | Candidate p50 / p95 / p99 (ms) |
| --- | ---: | ---: | ---: | ---: |
| Homepage | 5 | 5 | 0 → 0 | 1377 / 1751 / 1751 |
| Home to catalog | 1 | 1 | 0 → 0 | 1205 / 1205 / 1205 |
| Catalog category filter | 1 | 1 | 0 → 0 | 1181 / 1181 / 1181 |
| Catalog typing | 1 | 1 | 0 → 0 | 968 / 968 / 968 |
| Book detail | 2 | 1 | 1 → 0 | 732 / 732 / 732 |
| Book detail reload | 2 | 1 | 1 → 0 | 715 / 715 / 715 |
| Catalog in second tab | 2 | 2 | 0 → 0 | 523 / 1230 / 1230 |
| Author login through dashboard landing | 10 | 10 | 5 → 5 | 283 / 1799 / 1799 |
| Author dashboard to My Books | 4 | 4 | 2 → 2 | 245 / 802 / 802 |

Neither sample observed repeated identical calls, 429s or 5xx. Chromium recorded no response event for one deployed request each on detail load and reload. The author scenarios count requests started during navigation and report timings only for responses seen within the observation window. Author request counts stayed the same, including authenticated preflights. The candidate eliminated the preflight on each public book-detail navigation. Candidate timings measure time to response headers. Some steps contain one observed response, so equal percentiles provide no capacity inference. Production server-side requests and reader/admin navigation budgets remain unmeasured.

Compact book links and Admin navigation already disable automatic prefetch where it could fan out across many routes. Next.js metadata and CMS reads have a separate server cache. The browser budget cannot quantify those server requests, rate-limit windows, database query costs, or costs across multiple instances. The local validation used Windows, Node 26.5.0 and Chromium against a production-mode Next.js build. Netlify pins Node 22. Measure parity on the release preview before promotion.

The shelf now uses bounded manual arrows, keyboard activation, and mobile swipe. Public book details omit the review widget and its request. The API client omits the default JSON header on bodyless reads, preserves JSON serialization on writes and multipart boundaries on uploads, and replays only safe reads after authentication refresh. Category consumers now reuse the public cache except when a category change explicitly invalidates it. The book editor uses the documented admin update route and checks the backend response before showing success. These source changes are separate from observed request measurements.

The public author screen now shows the saved name and biography, a genuine empty biography, or a book-list error with retry. Successful author edits notify other tabs to refresh the author record. Persistent profile updates, CMS saves, reader checkout, invoice generation, payment decisions, shipment transitions, manuscript decisions, author access changes, royalties, and settlements require staging data and are **BLOCKED** for live write verification. Backend restarts, injected upstream 5xx failures, and load recovery also remain **BLOCKED** without an isolated environment. Local failure simulations and read-only responses are labeled separately.

### Release and rollback

After all release gates pass, build the candidate from its exact commit with the production Node version and promote a Netlify deploy preview only after confirming backend URL, authentication, main reader and author navigation, admin access, CMS, and a staging transaction readback. Retain the previous successful Netlify deploy ID and commit beforehand. If smoke checks fail or errors regress after promotion, restore that previous deploy and rerun read-only smoke checks. Coordinate any backend rollback with the backend owner and retain production records. No deployment or production business mutation was performed during this validation.

### Changed files

- Storefront and author UI: `components/books/home-book-shelf.tsx`, `components/books/book-detail-view.tsx`, `app/authors/page.tsx`, `app/authors/[id]/page.tsx`, and `app/author/settings/page.tsx`. Removed the unused public review widget.
- Backend clients and Admin: `lib/api.ts`, `lib/catalog-data.ts`, `hooks/use-book-categories.ts`, and `app/admin/books/[id]/page.tsx`.
- Verification: `lib/catalog-data.test.ts`, the backend, mobile, private mobile, security, and request-budget specs under `tests-e2e/`, `tools/run-test-suite.mjs`, `tools/release-inventory.mjs`, and `tools/frontend-report.mjs`.
- Documentation and evidence: this audit, `TESTING.md`, the refreshed source inventory, and the HTML and JSON frontend/API reports under `api-audit/`.

The entries below preserve evidence from earlier validation passes. Use the current run's generated [frontend/API report](api-audit/frontend-api-report.html) for the latest available test timestamps and endpoint inventory.

Audit date: 18 November 2026 (Asia/Calcutta). **Release approval is pending.** The application is an existing frontend connected to a separately deployed backend. No backend checkout, dedicated staging URL, reader test account, or administrator credentials have been supplied. An author account is available for read-only integration checks and its own login/logout sessions.

## Scope and evidence

Follow-up: 21 November 2026. See the searchable [frontend/API report](api-audit/frontend-api-report.html) and [JSON export](api-audit/frontend-api-report.json) for current source linkage, request/response contracts and timestamped checks. Both production-only and full dependency audits returned zero vulnerabilities on this date. The earlier withdrawn development advisory no longer appears in npm's response. Release approval remains pending for the backend/staging gates below.

- `tools/release-inventory.mjs` inventories page files, JSX forms/buttons, API call sites, request expressions, available OpenAPI parameters, request bodies, response schemas, and schema definitions. Run `node tools/release-inventory.mjs` to regenerate `api-audit/release-workflow-inventory.json`.
- A documented endpoint is a contract match, not proof of deployment, authorization, correct persistence, or successful business transactions. Undocumented endpoints in the inventory require backend confirmation; existing handover documentation and read-only live checks provide additional evidence.
- Previous verification results in `BACKEND_INTEGRATION_STATUS.md` describe the earlier implementation. New release results must be recorded after all current changes pass validation.
- No production customer orders, CMS records, profiles, financial entries, manuscripts, settlements, or payouts are authorized for mutation. Automated checks must not submit these transactions.

## Dependency and security work

- Next.js, `@next/bundle-analyzer`, and `eslint-config-next` upgraded from 16.4.2 to stable 16.4.6. Compatible package updates also update React/React DOM, Axios, Vitest and Vite. `package-lock.json` records the full resolved tree.
- Removed unused `zod`, `@hookform/resolvers`, `swiper`, and direct `date-fns` dependencies. Removed the unreferenced chart wrapper and deprecated Recharts dependency.
- The production-only npm security audit reports zero vulnerabilities. Preserve the final audit output in the private test results.
- The earlier development-tool advisory was withdrawn and no longer appears in the full npm audit on 21 November. No forced downgrades or peer-check bypasses were used.
- ESLint 9.39.5 is deprecated. The current stable `eslint-plugin-react` 7.37.5 supports ESLint only through 9; ESLint 10 would violate that peer contract. A compatible upstream plugin/config update or a separately validated lint migration is still required. No peer checks have been bypassed.
- Protected frontend screens wait for fresh backend session context, reject inactive accounts, and require backend-confirmed admin capability. The backend must independently enforce all privileges and ownership; a client route guard is not a security boundary.
- Read-only probes confirmed `Cache-Control: no-store` on author bank-detail and royalty responses, and HTTP 403 for an author requesting `/admin/dashboard`. Responses currently permit `Access-Control-Allow-Origin: *`; backend owners should assess an explicit production origin allowlist, particularly before enabling cookie-based sessions.
- Explicit Authorization headers are preserved; refresh requests have a bounded timeout. Cross-tab session updates rehydrate state. Error normalization excludes request headers, credential bodies, and full financial payloads from UI error logging.
- Refresh/access tokens remain in browser storage under the existing backend contract. Moving refresh tokens to Secure, HttpOnly, appropriately SameSite cookies, rotating/revoking them server-side, and validating CSRF/CORS require backend changes and staging verification. This is an outstanding security-hardening item, not a completed server fix.
- CSP allows inline scripts for the existing Next.js runtime. A nonce-based CSP migration needs separate rendering/performance verification. Frame denial, MIME sniffing protection, HSTS, referrer/permissions policy, and environment-specific API origins remain configured. No server secrets belong in `NEXT_PUBLIC_*` variables.

## CMS contract and missing fields

Canonical storage flow: authenticated `GET /admin/content` → `PUT /admin/content` → public `GET /content`. The OpenAPI `ContentUpdateRequest` declares grouped `hero`, `about`, `contact`, `faq`, `footer`, `socialLinks`, `seo`, `announcements`, and `siteSettings` objects. `siteSettings` permits additional properties. The 17 page-section keys are not declared flat fields and were absent from the live public document. The frontend sends them both as existing flat fields and in `siteSettings.siteContent`; the backend must retain and publicly return the bag.

Each field below is a JSON **string** representing an array, limited to 100 KiB. Empty published content is `"[]"`. Missing, invalid or unpublished content must not become invented public copy.

| Field | Array element schema |
| --- | --- |
| `homeWhyChooseJson` | `{title, description, highlight?}` |
| `aboutValuesJson` | `{title, description}` |
| `aboutTeamJson` | `{name, role, image, bio}` |
| `publishServicesJson` | `{title, description, features: string[]}` |
| `publishStepsJson` | `{title, description}` |
| `guidelinesSectionsJson` | `{title, items: string[]}` |
| `guidelinesStepsJson` | `{title, description}` |
| `royaltyScheduleJson` | `{title, description}` |
| `royaltyExamplesJson` | `{scenario, retail, charges, royalty, note}` |
| `royaltyFaqsJson` | `{question, answer}` |
| `returnsStepsJson` | `{title, description}` |
| `returnsEligibleJson` | `string` |
| `returnsNotEligibleJson` | `string` |
| `returnsFaqsJson` | `{question, answer}` |
| `privacySectionsJson` | `{title, content}` |
| `termsSectionsJson` | `{title, content}` |
| `careersBenefitsJson` | `{title, description}` |

Example **schema-shaped request**, not production content: `PUT /admin/content` with `{siteSettings:{siteContent:{privacySectionsJson:"[]"}},seo:{title:"",description:"",keywords:[],image:""}}`. The actual editor preserves existing backend fields and sends the administrator's approved values. Public readback must contain identical saved values. No request from this example was submitted.

CMS saves now require administrator content to load, preserve backend-only fields, report unverified saves as errors, and re-read public content. SEO fields are editable and mapped to the backend's grouped `seo`. The local `POST /api/content/revalidate` checks a bearer session against backend `/users/me/context`, requires active admin role and capability, then expires cached public metadata. No caller-controlled tags or URLs are accepted.

The documented API has immediate content update semantics; a separate draft/review/publish/version-history API has not been established. Backend owners must define it if editorial approval before publication is required. Publishing packages use `/publish-packages` and `/admin/publish-packages`; the legacy CMS package list is not a substitute for real package records. Admin creation, updates, clearing fields, public readback, FAQs, banners, images, policies and SEO require staging/admin verification.

The source audit also found a locally populated courier-plan catalogue with hardcoded active flags in `lib/couriers.ts`. It is not evidence of configured backend courier services. No courier catalogue endpoint is established in the supplied contract. This operational display must be removed or replaced with actual backend catalogue data before release; technical tracking URL helpers must not imply that a courier is active or booked. Unknown couriers must not silently send a customer's tracking number to a web-search service.

## Role workflow verification matrix

| Workflow | Safe verification available | Release verification still required |
| --- | --- | --- |
| Reader registration/login | Registration validation and real author-account login | Dedicated reader signup, verification/reset emails, reader-role login/logout in staging |
| Catalog/search/filtering | Real public catalog/search/category APIs and browser navigation | Full filter combinations, large pagination, empty results and API failures |
| Cart/checkout/payment | Local cart tests; static payload/schema audit; checkout confirmation now loads owned backend order/payment data | Staging order creation, server-side price/stock validation, QR/UTR submission, rejection/retry, duplicate-submit protection, verified confirmation |
| Orders/history/tracking/profile | Read-only authenticated screens and helper tests | Reader ownership isolation, older-page pagination, courier status consistency, profile/address writes in staging |
| Author registration/approval | Author-role session/context and access rules | Reader-to-author application, rejection/reapply/approval and invitation email in staging |
| Author dashboard/books/analytics | Real account totals, assigned books, date ranges and mobile navigation | Different approval/account states and larger paginated catalogs |
| Manuscripts | Read-only submission form/navigation and status normalization | Staging upload, draft creation, submit/revise/reject/approve/publish, duplicate submission prevention |
| Royalties/settlements/bank details | Real read-only history, statements, settlement lists; account values remain masked | Server accrual math, snapshots, refund adjustments, settlement locking/idempotency, bank/UPI writes and role isolation in staging |
| Admin dashboard/users/authors/books/categories | Source/contract audit, signed-out redirects, author-denied authorization probes | Read/write workflows with admin account in staging |
| Admin manuscripts/orders/payments/shipments | Source/contract audit only | Review transitions, payment verification, courier actions, status consistency, notifications and ownership enforcement in staging |
| Admin royalties/settlements/CMS | Source/contract audit only | All writes, audit trails, concurrent edits, publication, payout invariants and rollback in staging |

Required backend contracts and payload expressions for every statically detected call are included in the inventory. Undocumented aliases are not automatically considered missing or working. Backend source is required to verify request validation, authorization/IDOR, upload MIME/content limits, CORS, authentication rate limiting, webhook signatures, payment amounts/idempotency, settlement atomicity, encryption at rest, notification delivery, and financial audit trails.

## Quality and release gates

The original baseline was 601 lint warnings. Typed error handling, shared domain models, state hydration/media/carousel subscriptions, fake author/date removal and other fixes are underway. Record the final lint count; remaining warnings must not be hidden or called resolved.

Required final checks: unit tests, lint, TypeScript, production build, complete real-backend browser suite, authenticated/unauthenticated authorization probes, mobile/tablet/desktop checks, keyboard/accessibility, offline handling, and credential scans. Transactional staging tests remain a separate release gate until an environment and authorized accounts/actions are provided. Do not deploy or declare production readiness while these gates remain unverified.
