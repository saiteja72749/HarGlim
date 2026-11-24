# Phase 2 Author Studio and catalog

23 November 2026, Asia/Kolkata

## Initial audit

The Next.js 16.4.6 App Router worktree already contained Phase 1 and other uncommitted work. The workspace contains the frontend, the supplied handover, and an OpenAPI snapshot. Backend source, infrastructure configuration, backend test artifacts and transactional staging were unavailable. The 44-suite and 339-test statement is a handover claim.

| Deployed API | Read evidence and source findings |
| --- | --- |
| `GET /api/docs.json` | HTTP 200, 173 documented paths. The live spec documents all 13 requested catalog query parameters. |
| `GET /api/books`, `/search`, `/categories`, `/content` | HTTP 200. Impossible text and price filters produced zero total matches, and ascending price returned low-priced results. The local catalog still assembled all query pages and filtered them in the browser. |
| `GET /api/authors/me/dashboard` | HTTP 200, grouped lifetime book, sales and royalty metrics, top books and recent sales. The existing overview duplicated metrics and silently used zero for missing values. |
| `GET /api/authors/me/books` | HTTP 200, author-owned list with category, status, MRP, and pagination. The existing My Books view fetched an additional dashboard for overlapping statistics. |
| `GET /api/authors/me/analytics?range=30d`, `range=7d` | HTTP 200, period, start and end dates and empty series for the test author in both windows. |
| `GET /api/authors/me/books/performance` | HTTP 200, a separate lifetime per-book list. The spec declares no period parameter. A 7-day query returned the same response shape. |
| `GET /api/authors/me/royalties`, `/royalty-settlements`, `/manual-royalties` | HTTP 200. Royalty history contains canonical financial values and pagination. The author had an empty settlement list and populated publisher statements. |
| `GET /api/users/me`, `/users/me/context`, `/authors/me/payment-details` | HTTP 200 with the configured author session. Payout response exposed an account mask field. Private values were excluded from the audit output. |
| `POST /api/authors/me/uploads/document`, `/authors/me/books`, `/authors/me/books/{bookId}/submit` | Deployed specification confirms document multipart upload, author-owned draft, and submission with required file URL and active package ID. Production writes were outside audit scope. The manuscript screen displayed invented progress percentages. |
| `PUT /api/authors/{id}`, `/authors/{id}/payment-details` | Deployed specification confirms locked email, public profile updates, partial payout updates, and a masked response. Staging write and public synchronization verification remain required. |

The original Author Studio sidebar included duplicate section links, a separate Add Book link, and a fixed mobile overlay. Existing deep links use canonical routes and section fragments. The account menu offered an extra manuscript shortcut. No versioned terms or consent route appears in the deployed specification. A complete consent workflow requires an authenticated current-version and acceptance read plus a server-side acceptance write with author identity, version, timestamp and consent type, enforced at submission.

The combined category, format and minimum-price probe returned the expected total and disjoint results on the first two pages. Author-owned book search returned no records for an impossible query and the documented published-status filter returned a published title.

The sales discrepancy reproduced in the authorized sample. The dashboard reported seven lifetime copies and per-book performance accounted for four. Three recent sales lines lacked both a usable book ID and a recoverable title, aligning with the difference. The breakdown stayed identical with a 7-day parameter. The underlying cause of those missing references, including deletion or an incomplete historical snapshot, requires backend records. The dashboard and royalty ledger returned the same known amount with a fractional rupee value. The read evidence supports consistent decimal display and does not establish a backend rounding defect.

## Implementation and affected files

| Area | Result | Files |
| --- | --- | --- |
| Author navigation | Six destinations, keyboard-accessible mobile drawer, four account actions, and legacy redirects. Add Book now points to the manuscript form. Per-book performance and payouts are sections within their canonical screens. | `app/author/layout.tsx`, `components/layout/navbar.tsx`, `next.config.mjs` |
| Overview and My Books | Compact lifetime overview and period trend, pending manuscript status and quick actions. My Books uses server-side search, status and paging and joins lifetime sales only by the owned book ID. Mobile cards and desktop rows keep published listing actions distinct from editorial actions. | `app/author/page.tsx`, `app/author/books/page.tsx`, `types/author-api.ts` |
| Public catalog | Two-line card titles with a full accessible title, a manually scrolled homepage Books shelf, and a single backend page per catalog filter/search/sort request. The dedicated search page continues to use its deployed search API. | `components/books/book-card.tsx`, `components/books/home-book-shelf.tsx`, `app/page.tsx`, `app/books/page.tsx`, `app/search/page.tsx`, `lib/catalog.ts`, `lib/catalog-data.ts` |
| Manuscripts | Owned records retain editorial statuses and real submission/update dates. The new and revision flows share the documented file validation, uploader and submit operation. In-flight submits are guarded and ambiguous new-draft results direct the author to reconcile through Manuscripts. | `app/author/manuscripts/page.tsx`, `app/author/manuscripts/new/page.tsx`, `lib/author-manuscript.ts` |
| Analytics and royalties | Period analytics and lifetime per-book breakdown load independently. Royalties includes Sales & Earnings, Payout History and Publisher Statements, server totals and complete-history CSV checks. Missing reported charges and untitled historical sales remain visible as unavailable. | `app/author/analytics/page.tsx`, `app/author/royalties/page.tsx`, `lib/author-royalties.ts`, `lib/manual-royalties.ts`, `types/royalty-api.ts` |
| Author profile and authentication | Preview link uses the independently verified public identity. Payout edits send changed fields and have a dedicated account replacement action. Queued unauthorized requests share the refresh and each receives one retry. | `app/author/settings/page.tsx`, `lib/author-settings-data.ts`, `lib/api.ts` |

## Verification

- The Phase 1 baseline on the previous build finished with 58 passes and two admin skips. One catalog-to-book navigation test failed when both the live books and categories requests returned HTTP 429.
- Vitest passed 171 tests across 30 files. Repository-wide ESLint reported zero errors and 249 warnings.
- The Next.js production build passed, including TypeScript and generation of 70 static pages. The standalone TypeScript check also passed.
- The Chromium run against the production build passed 36 tests, with one admin-only skip. It covered live sign-in, owned book and manuscript reads, analytics date selection, royalty history and CSV export, catalog filters and pagination, the homepage shelf, keyboard navigation, reduced motion and error recovery. The catalog-to-book case passed on this run.
- Seven Author Studio screens and a live book detail page fit 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 pixels without page overflow. The separately run legacy URL test confirmed all three HTTP 308 redirects, including preservation of query parameters and destination fragments.
- The first supplemental attempt encountered HTTP 429 on author login and catalog reads. After the provider's retry window, both supplemental tests passed. The owned-book detail endpoint accepted an owned record and rejected a book belonging to a different author. The live catalog fit all nine widths, and the 390-pixel card kept its cover compact and its cart action usable without hover. Across the main run, the legacy redirect check, and the successful retry, Chromium recorded 39 passes and one admin-only skip.
- The deployed reads used the real public API and the configured author test session. Production content, manuscript, profile, payout, and financial records were not mutated.

## Release dependencies

- **Terms acceptance.** Implement the persisted, versioned consent contract above. The existing manuscript declaration remains in place. First-time, repeat and changed-version acceptance need persistence tests in staging.
- **Analytics.** The period endpoint currently returns date bounds and the sales series. Aggregate revenue and royalty cards need canonical period totals. A period-aware per-book endpoint or documented period support is required to align per-book results with the selector.
- **Historical sales and reports.** Investigate the missing book references and recover titles from original order snapshots where available. Confirm line charge fields, settlement details and any official publisher statement download contract.
- **Live writes.** Use authorized staging for manuscript uploads and submission, rejection of unauthorized changes, profile synchronization, masked payout write/readback, and idempotency. Verify the configured upload maximum against the documented 25 MB default.
- **Deployment.** Check the configured Express base URL, protected authorization, public catalog counts, and legacy redirects in staging. Compare the staging artifact with the verified frontend build. Preserve the prior frontend release for rollback. This change introduces no database migration or seed operation and has not been deployed.
