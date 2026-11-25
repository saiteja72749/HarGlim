# Running the test suite

The current [frontend/API report](api-audit/frontend-api-report.html) pairs the contract inventory with validation results. Regenerate with `node tools/release-inventory.mjs` and `node tools/frontend-report.mjs` after checks finish. Contract examples are omitted from that report: JSON schemas describe types and required fields without fabricated business values.

The generators use the checked-in contract by default. For an audit of the deployed contract, download [Swagger JSON](https://harglimpublish-backend.onrender.com/api/docs.json) into `test-suite-results/openapi-live.json` and set `HARGLIM_OPENAPI_PATH` to that file before running both generators.

Unit tests run in isolated Node workers. Authentication/cart persistence use Node's native Web Storage API with the test-only flags configured in `vitest.config.mts`; the backing file stays under ignored `test-suite-results/`. One worker and sequential files prevent storage interference. No DOM emulator or mocked storage/network service is used. Node 22.13 supports these flags ([official CLI reference](https://nodejs.org/download/release/v22.13.0/docs/api/cli.html#--experimental-webstorage)). Real Chromium integration tests cover browser authentication, cross-tab logout, cart interactions, debouncing and offline/reconnect recovery.

Use Node.js 22.13 or newer (the production build uses Node 22). Install dependencies with `npm ci`, then install the browser once with `npx playwright install chromium`. Reinstall Chromium after a Playwright upgrade. Vitest uses the ESM `vitest.config.mts` configuration.

Create the Git-ignored `.env.test.local` with `E2E_AUTHOR_EMAIL` and `E2E_AUTHOR_PASSWORD` for a real author test account. Set `E2E_READER_EMAIL` and `E2E_READER_PASSWORD` for the reader account sweep, and `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` for authenticated admin coverage. Use a reader who has neither author nor admin access. Never commit this file or put credentials in `NEXT_PUBLIC_*` variables.

Run every check with:

```sh
npm run test:all
```

The runner executes all Vitest unit tests, repository lint, a production build (including TypeScript validation), and all Chromium Playwright tests against that build. Checks run sequentially to reduce resource contention on Windows. Unit tests use one thread to avoid child-process worker startup timeouts. Browser tests are skipped when the production build fails; the overall command exits unsuccessfully if any check fails or is skipped.

Results and individual logs are written to `test-suite-results/summary.json` and `test-suite-results/*.log`. Playwright saves its HTML report in `playwright-report/`; open it with `npx playwright show-report`. Failed public browser tests retain screenshots and traces in `test-results/`. Traces are disabled for authenticated tests to keep real session tokens out of artifacts. Every browser test also checks for uncaught JavaScript errors. These generated files are ignored by Git.

The default full run requires port 3000 to be free. It starts and stops its own production server. `NEXT_PUBLIC_API_URL` is read from the existing Next.js environment files during the build.

If an environment problem interrupts the run, fix it and use `npm run test:all -- --retry-failed` to rerun unsuccessful stages while preserving the previous successful results and logs. Use this option only when application source and dependencies have not changed since those successful checks; otherwise run the full command again.

Framework security notices remain visible in the build log and count as build failures when Next.js exits unsuccessfully. Review the upgrade recommendation; the runner does not suppress these notices or change dependencies. If Next.js explicitly permits a normal retry, `--retry-failed` can repeat the build stage.

## Individual checks

To discover the entire browser suite without starting the site, calling the backend, or executing tests:

```sh
npm run test:e2e -- --list --reporter=list
```

```sh
npm test -- --pool=threads --maxWorkers=1
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

`npm run test:e2e` normally starts a development server. The full suite selects production mode with `PLAYWRIGHT_SERVER_MODE=production` after building, avoiding compilation delays during individual browser tests.

## Website acceptance suite

| Area | Automated entry point | What to verify |
| --- | --- | --- |
| Public pages and storefront | `navigation.spec.ts`, `mobile-design.spec.ts`, `categories-integration.spec.ts`, `backend-integration.spec.ts` | Homepage and publishing call to action, catalog search and pagination, category relationships, book details without public rating or review widgets, authors, packages, Spotlight, CMS copy, login/register, and redirects. |
| Card movement and transitions | `mobile-design.spec.ts`, `phase-one.spec.ts`, `author-dashboard.spec.ts` | Three full book cards at desktop width, manual arrows with defined endpoints, keyboard navigation, mobile swipe, reduced motion, drawer dismissal, focus restoration, and route transitions. |
| Request budget | `request-budget.spec.ts` | Single-browser counts, repeat requests, CORS preflights, response status, and latency to response headers for public navigation and multiple tabs. Browser measurements exclude Next.js server-to-backend requests and are not a capacity test. |
| Reader account | `private-mobile-design.spec.ts`, `phase-one.spec.ts` | Dashboard, personal orders, payments and shipments, wishlist, library, profile, and author application status. Local checkout fixtures cover server totals, address validation, duplicate-click protection, UTR pending and verified states, and order recovery. |
| Author Studio | `author-dashboard.spec.ts`, `private-mobile-design.spec.ts`, `auth-integration.spec.ts` | Assigned titles, dashboard totals, manuscript screens, analytics range, settings, royalty history, CSV, manual statements, settlements, session refresh and logout. |
| Admin | `admin-workspace.spec.ts`, `private-mobile-design.spec.ts`, `backend-integration.spec.ts` | Dashboard, Orders, Payments, Shipments, Inventory, Books, Categories, Packages, Spotlight, Publish Requests, Reviews, CMS, Users, Authors, Applications, Author Access, Manual Royalties, Settlements, and Invoices. Local layout checks cover order scrolling and removed routes. Live browser checks assert the GET request and response for each mapped screen. |
| Failures and accessibility | `reliability.spec.ts`, `security-integration.spec.ts`, `mobile-design.spec.ts`, `private-mobile-design.spec.ts` | Loading, missing records, offline and retry, focus and landmarks, narrow screens, protected routes, session permissions, and private financial response caching. |

Run one group by filename or one role by test title when a full run is unnecessary:

```sh
npm run test:e2e -- tests-e2e/mobile-design.spec.ts --grep "manual homepage shelf|reduced motion"
npm run test:e2e -- tests-e2e/private-mobile-design.spec.ts --grep "reader mobile"
npm run test:e2e -- tests-e2e/private-mobile-design.spec.ts --grep "author mobile"
npm run test:e2e -- tests-e2e/admin-workspace.spec.ts
npm run test:e2e -- tests-e2e/private-mobile-design.spec.ts --grep "admin mobile"
```

### Staging transactions and cross-role verification

Use an isolated staging backend, disposable reader and author accounts, an authorized admin account, test books, and a sandbox or simulated payment record. Point `NEXT_PUBLIC_API_URL` at staging before building the frontend and use separate browser sessions for each role. For each row, record the test record ID, observed HTTP status, persisted values after a fresh GET, and user-visible state after reload. Redact personal data, credentials, payment references, and financial details from evidence.

| Journey | Actions and expected result |
| --- | --- |
| Checkout and payment | Change quantity and address, confirm checkout twice quickly, and submit an invalid then valid UTR. Verify one order with the backend amount and a pending payment. Approve from Admin and check the same order and payment in Reader. On a separate order, reject with a reason and verify the reader sees the correct status and retry action. |
| Shipment and inventory | For the test physical order, check reservations and stock through payment approval, then mark printed, assign a courier and tracking number, and advance shipment status. Verify Reader tracking matches the backend and the ledger records the expected stock movement once. Exercise cancellation using a separate eligible test order. |
| Invoices | Open and download a test invoice in Admin and Reader. Compare the saved invoice number, order reference and total, confirm the PDF opens, and confirm a different account cannot see the test invoice in its own invoice list. |
| Books and categories | Create a test category, assign it to a test book, edit the book and category, change category visibility, and confirm the catalog filter and book detail reflect each saved change. Check category removal is blocked while a book still references it. |
| Packages and publishing | Add, reorder, edit, and archive a staging publishing package. Confirm the Publish page and manuscript form agree. Submit a test manuscript, request changes, resubmit, and approve. Verify the author sees each backend state and the result creates one catalog listing when published. |
| Spotlight and CMS | Upload a supported image, confirm the saved image and thumbnail load, edit the caption and order, then archive it and verify its public visibility. Save a CMS draft value on staging and check Admin readback and the corresponding public page after reload. Simulate an upload or save failure and verify the UI offers recovery. |
| Review moderation | If staging has an existing test review, approve and reject it in Admin and verify persistence through fresh reads. Confirm the public storefront omits ratings, review counts, and submission controls in all states. |
| Users and author access | Submit an application as a reader, review it in Admin, and check the account context, author directory and available dashboard controls after approval. Run a separate rejection case. Exercise grant, revoke and restore using the test account and recheck access after reload. |
| Manual royalties | Enter a dated statement for the test author and compare the saved ID, amount, and line items with Author Studio. Confirm another author cannot see it in their own statements. Void the staging statement and verify the author view updates without creating a settlement. |

Record each case as **Passed**, **Failed**, or **Blocked**. Mark a case blocked when the required staging account, record, or service is missing. Run these staging journeys separately from the read-only browser suite.

## Coverage and external dependencies

Unit tests cover pure author access and publishing rules, dashboard normalization, royalties, cart state, tracking, content parsing, and other shared helpers. They do not replace HTTP responses. Pure helper tests explicitly use the Node environment; browser-state tests retain jsdom. Test files remain isolated.

Author browser tests sign in to the real backend and use its genuine author session. Dashboard totals, catalog records, analytics, royalties, CSV export, statements, settings, and mobile navigation are verified against actual API responses. No request interception, synthetic sessions, invented books, or forced server errors are used. Missing author credentials fail the integration run rather than silently substituting fixtures. The admin check is explicitly skipped when no real admin account is configured.

Live-response assertions allow 15 seconds; author sign-in allows 45 seconds to match the API timeout. The full runner redacts configured test passwords and JWTs from logs and text report artifacts, including Playwright failure snapshots. Keep all generated reports private even with this redaction because they may contain real account and business data.

Browser tests pause five seconds before each case to respect the shared backend's request limit. A page issues several real requests, so this pacing prevents a fast local browser from flooding the live service. HTTP 429 responses still fail the suite; no rate limits or responses are bypassed.

Public backend tests verify actual collection contracts and confirm that home copy and FAQs match `GET /content`. Unpublished CMS sections remain empty; the frontend does not replace missing backend copy with seeded marketing, policy, or publishing data.

Public browser smoke tests exercise the configured backend through read-only navigation: home, catalog, book details, authentication forms, static content, search, cart, and 404 handling. They also verify that protected author, reader, and admin routes redirect signed-out users to login. Book-detail navigation can be skipped when the backend returns no books. Checkout submission, real payments, manuscript uploads, and live admin mutations are not covered by these smoke tests.

Release checks also exercise cross-tab logout, backend rejection of unauthenticated financial reads, author denial at admin endpoints, CMS cache-refresh authorization, bank-account masking, and `Cache-Control: no-store` on financial responses. Public reliability checks cover catalog controls at mobile/tablet/desktop sizes, duplicate control IDs, nested navigation controls, empty search results, slow loading, and offline recovery. Slow/offline checks use Chromium network controls; API responses are never intercepted or invented.

See [PRODUCTION_RELEASE_AUDIT.md](PRODUCTION_RELEASE_AUDIT.md) for dependency findings, the CMS schema/readback contract, the workflow matrix, and outstanding release gates. A passing read-only suite does not certify transactional workflows. Supply a separate staging URL, authorized reader/admin test accounts and explicit permitted mutations before testing payments, orders, manuscripts, payouts, or CMS writes.

Category integration checks additionally compare directory names, catalog slug filters, empty-category pages, missing-category behavior, and admin read permissions against real backend responses. Category identity, parsing, duplicate normalization, and 63-name seed planning have pure unit coverage. Admin mutation scenarios remain pending a test environment; read-only results must not be reported as successful CRUD verification.

Run `node tools/seed-categories.mjs` for a seed preview. Without admin credentials this is explicitly a public-only inventory and cannot detect inactive categories. With locally configured `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`, the tool verifies admin context and inventories active and inactive records. `--apply` is an explicit write action: it creates missing requested names only, preserves existing IDs, stops before writing on known slug conflicts, and verifies the final list. The user-approved existing `Self Help` record covers the requested `Self-Help` entry while retaining its current name and ID. Other slug conflicts require administrator review. This tool never renames, updates, deletes, or supplies runtime fallback categories.
# Rechecking changed code

`node tools/run-test-suite.mjs --retry-failed --rerun=lint,build` retains the completed unit result while rerunning lint and the production build before failed browser verification. Use this only when previously tested unit modules are unchanged; otherwise rerun the unit step as well. No previous browser failure is treated as a pass.
