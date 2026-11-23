# Harglim Publishers Phase 1 implementation

22–23 November 2026, Asia/Kolkata

The implementation builds on the existing Next.js App Router storefront and its deployed Express/MongoDB API. It preserves the uncommitted work already in the workspace. The official logo, catalog and category IDs, publishing package IDs, existing endpoint paths, and manual payment verification remain the source of truth. See the [initial source audit](phase-1-initial-audit.md) for defects, risk, and baseline coverage.

## Implementation

| Module | Changes | Files |
| --- | --- | --- |
| Shared site shell | Sticky header in document flow, six primary links, Radix account and mobile menus, visible account role and role-appropriate actions, corrected footer links and reduced scroll effects. | `app/layout.tsx`, `app/globals.css`, `components/layout/navbar.tsx`, `components/layout/main-container.tsx`, `components/layout/footer.tsx`, `components/ui/sheet.tsx` |
| Home, Books and legacy Categories | Compact hero and manually selected featured covers, optional CMS FAQs, direct category links and catalog chips, query-aware filters and sort, and 308 redirects preserving the category slug. | `app/page.tsx`, `app/books/page.tsx`, `next.config.mjs` |
| Authors, publishing, About and Contact | Full author names and published biographies, package identifiers carried into the application/submission path, conditional CMS sections, a smaller editorial About layout, and validated contact form with a map driven by the published office address. | `app/authors/page.tsx`, `app/publish/page.tsx`, `app/about/page.tsx`, `app/contact/page.tsx` |
| Public SEO | Official monogram favicon with 16, 32, 48, and 96px frames. Sitemap points to the canonical catalog and public detail pages. Canonical fallback uses the live domain. | `app/favicon.ico`, `app/sitemap.ts`, `config/site.ts` |
| Book details and cart | Consistent real rating labels and counts, a four-line mobile title preview with the full title accessible, matching card and loading cover sizes, plain React rendering of supported synopsis markup, labeled quantity controls, line subtotals, and consistently estimated cart pricing. | `components/books/book-card.tsx`, `components/books/book-card-skeleton.tsx`, `components/books/book-detail-view.tsx`, `components/books/book-description.tsx`, `app/checkout/cart/page.tsx`, `store/cart-store.ts`, `lib/book-presentation.ts` |
| Checkout and manual UPI | Responsive shipping form, explicit address-save opt-in, one in-flight order and one in-flight UTR submission, backend payable amount, server-provided UPI destination, order resume link, and an awaiting-verification state. Ambiguous order responses direct the reader to reconcile in My Orders. | `app/checkout/checkout/page.tsx`, `lib/checkout-payment.ts`, `lib/saved-address.ts`, `components/auth/auth-guard.tsx` |
| Reader dashboard | Accessible navigation drawer and desktop sidebar, pending payment shortcut, focused order links, consistent verification labels, wishlist removal handling, digital-edition library filtering, mobile transaction cards, profile edit/cancel and readback, and an application status retry. | `app/dashboard/layout.tsx`, `app/dashboard/page.tsx`, `app/dashboard/orders/page.tsx`, `app/dashboard/wishlist/page.tsx`, `app/dashboard/library/page.tsx`, `app/dashboard/payments/page.tsx`, `app/dashboard/profile/page.tsx`, `app/dashboard/become-author/page.tsx`, `lib/order-status.ts` |

## API behavior

- Public pages use the existing content, catalog, search, categories, authors, packages, and statistics endpoints. The read-only author probe returned 19 records with 19 distinct IDs, including one repeated-name group. The directory keeps different IDs as separate authors.
- Checkout uses `POST /orders`, `PUT /orders/{id}/verify-payment`, and `GET/PUT /users/me/addresses`. My Orders uses owner-scoped order and payment reads to resume. A UTR submission remains pending until the backend confirms verification.
- Profile and application flows use `GET /users/me`, `PUT /users/{id}`, `GET /users/me/author-application`, and `POST /author-applications`. The profile keeps email read-only and verifies saved values by reading them back.
- Contact keeps the existing `POST /contact` payload. The supplied OpenAPI leaves durable submission and delivery unverified. The public CMS returned an office address and FAQ entries.

## Verification

| Check | Result |
| --- | --- |
| Vitest with `--pool=threads` | 169 tests passed across 29 files, including the UPI destination, payable amount, and reference validation tests. The default fork pool hit a Windows process startup restriction. |
| Repository ESLint | Completed with zero errors and 253 warnings. |
| `npm run build` | Passed on Next.js 16.4.6. TypeScript passed and Next.js generated 70 static pages. |
| Phase 1 Chromium regression suite | 59 passed, zero failed, and two admin-only read tests skipped because admin credentials were unavailable. |
| Responsive browser checks | 15 storefront and reader routes with isolated API fixtures, plus one real book detail route, fit at 320, 375, 390, 430, 768, 1024, 1280, 1440, and 1920px. A separate 320px check covered 18 public pages, their canonicals, and their main landmarks. |
| `git diff --check` | Passed. |

The browser fixtures intercept API requests before setting up the test reader session. The live regression suites exercise deployed read APIs and the configured author test session. At 390px, the long-title catalog card measured 374.3px tall, including a 136.8px cover area. The cart controls remained visible and usable without hover. A live book detail page fit all nine viewport widths and its server-rendered JSON-LD matched the real book title. A formal WCAG 2.2 AA audit and live transactional account changes require separate validation.

The Chromium run covered `backend-integration`, `categories-integration`, `mobile-design`, `navigation`, `phase-one`, and `reliability`. Keyboard focus returned after the menus closed. The checkout fixtures verified duplicate submission handling, refresh recovery, and UTR status progression. The reliability suite exercised debouncing, slower responses, offline errors, and recovery. The dedicated author and admin dashboard suites and live write workflows were outside this run.

## Deployment readiness

The deployed website returned HTTP 404 for the old favicon URL and 200 for both robots and sitemap. The public API preflight from the production website origin returned 204 and allowed the authorization header. The preflight covers that public route and origin only. Build and staging should use the intended `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, and Google client configuration. Google controls favicon recrawl timing.

## Remaining release gates

- Transactional staging is required to validate order and inventory consistency, quoted shipping, UPI QR encoding against the actual merchant account, UTR approval/rejection, saved addresses, reader permissions, profile changes, contact delivery, and author application approval. The workspace contains frontend source only.
- The backend contract supplies authoritative shipping and payable totals after order creation. A pre-order quote and persistent idempotency support require a backend contract. Catalog filtering currently falls back to real paginated API data and local filtering for query combinations the backend does not document reliably.
- Digital download/read controls require an owner-authorized content endpoint. Manuscript package preselection for an approved user depends on the retained selection URL and the existing manuscript form.
- Reader histories and saved lists still use the existing request limit of 100 records. Verify paging with a larger staging dataset before using the history totals for a complete account reconciliation.
- Author dashboard and Admin dashboard redesign belong to Phase 2.
