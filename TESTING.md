# Running the test suite

The current [frontend/API report](api-audit/frontend-api-report.html) pairs the contract inventory with validation results. Regenerate with `node tools/release-inventory.mjs` and `node tools/frontend-report.mjs` after checks finish. Contract examples are omitted from that report: JSON schemas describe types and required fields without fabricated business values.

Unit tests default to Node; authentication/cart persistence suites explicitly use jsdom. Isolation remains enabled and the full runner uses one worker. Catalog browser tests verify debouncing against actual API requests and offline/reconnect recovery without intercepted responses.

Use Node.js 22.13 or newer (the production build uses Node 22). Install dependencies with `npm ci`, then install the browser once with `npx playwright install chromium`. Reinstall Chromium after a Playwright upgrade. Vitest uses the ESM `vitest.config.mts` configuration.

Create the Git-ignored `.env.test.local` with `E2E_AUTHOR_EMAIL` and `E2E_AUTHOR_PASSWORD` for a real author account. Optional `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` enable the admin integration checks. Never commit this file or put credentials in `NEXT_PUBLIC_*` variables.

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

```sh
npm test -- --pool=threads --maxWorkers=1
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e
```

`npm run test:e2e` normally starts a development server. The full suite selects production mode with `PLAYWRIGHT_SERVER_MODE=production` after building, avoiding compilation delays during individual browser tests.

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
