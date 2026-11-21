# Production release audit

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
