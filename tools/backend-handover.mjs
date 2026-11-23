import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const report = JSON.parse(fs.readFileSync('api-audit/frontend-api-report.json', 'utf8'));
const revision = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const issued = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long', timeZone: 'Asia/Kolkata' }).format(new Date());
const out = 'api-audit/backend-developer-handover';
const blocks = [];
const add = (kind, value) => blocks.push({ kind, value });
const heading = (value) => add('heading', value);
const paragraph = (value) => add('paragraph', value);
const code = (value) => add('code', typeof value === 'string' ? value : JSON.stringify(value, null, 2));
const table = (headers, rows) => add('table', { headers, rows });
const list = (items) => add('list', items);
const strings = (names) => Object.fromEntries(names.map((name) => [name, { type: 'string' }]));

add('title', 'Harglim Publishers\nBackend connectivity handover');
paragraph(`Prepared ${issued} (Asia/Kolkata). Frontend revision: ${revision}. Evidence snapshot: ${report.generatedAt}. This document uses the existing source and audit evidence; it does not claim a fresh backend implementation audit or repeat the earlier live tests.`);
paragraph('Purpose: tell the backend developer what must be implemented, confirmed, documented or tested to complete frontend connectivity. Preserve the existing application, UI, category IDs/names and real business data. No application behavior is changed by this document.');
table(['Environment', 'Address / ownership'], [
  ['Public frontend', 'https://harglimpublishers.com — Next.js / React, hosted on Netlify'],
  ['Backend API base', report.backendBaseURL + ' — deployed Express/MongoDB backend, according to the supplied handover'],
  ['Path convention', 'Routes below such as /books are relative to the backend /api base. Original OpenAPI paths may already contain /api: do not prepend it twice.'],
  ['Frontend-only route', 'POST /api/content/revalidate belongs to the Next.js website, not the Express backend.'],
]);
paragraph('Evidence labels: OBSERVED = earlier real HTTP/browser evidence; CONTRACT GAP = frontend usage not matched in the supplied OpenAPI; UNVERIFIED = protected or transactional behavior not tested; PROPOSED = an acceptance contract to agree, not an existing deployed API. An empty response does not prove the item schema or a successful write.');

heading('1. Priority work queue');
table(['ID / priority', 'Backend action', 'Completion evidence'], [
  ['B01 / P0', 'Confirm/persist all 17 CMS section fields and public readback; populate approved missing content.', 'Admin PUT survives fresh admin/public GET and appears on the website, including explicit clears.'],
  ['B02 / P0', 'Apply catalog search, filters and sorting before pagination; document accepted query names.', 'Combined filters return correct global totals and ordering across multiple pages.'],
  ['B03 / P0', 'Supply backend source, staging URL and dedicated reader/author/admin accounts.', 'Read/write workflow tests run on disposable staging data; no production business mutations.'],
  ['B04 / P0', 'Verify server authorization, ownership, financial calculations, stock and idempotency.', 'Unauthorized/cross-user actions denied; duplicate requests do not duplicate charges, stock or royalties.'],
  ['B05 / P1', 'Reconcile every unmatched frontend API call in section 7 and publish corrected OpenAPI.', 'For each row: existing route + actual DTO, compatibility alias, coordinated frontend change, or confirmed missing implementation.'],
  ['B06 / P1', 'Define profile/avatar clearing and author profile/payout persistence.', 'Fresh server reads match changes; no raw bank account number returned.'],
  ['B07 / P1', 'Document real review GET, item shape, pagination and moderation.', 'Approved review visibility, totals and ownership verified on staging.'],
  ['B08 / P1', 'Enforce atomic category association constraints and stable references.', 'Deletion races rejected; inactive references preserved; valid zero sort order saved.'],
  ['B09 / P1', 'Verify contact delivery, invitation/reset delivery, saved addresses and tracking.', 'Durable acceptance and readback/provider status; no false success after lost data.'],
  ['B10 / P2', 'Coordinate secure-cookie sessions, rate limits, image delivery and concurrency hardening.', 'Documented rollout, browser compatibility, CSRF/CORS behavior, load evidence and rollback.'],
]);
paragraph('P0/P1 are proposed integration priorities, not evidence of a newly discovered production outage. Several actions are verification or documentation work rather than new endpoints.');

heading('2. What already connects, and what is not certified');
table(['Area', 'Observed connectivity / present frontend behavior', 'Backend verification still required'], [
  ['Public data', 'Real reads for content, books, authors, categories, packages, public statistics and spotlights were verified.', 'Full response contracts, query behavior, completeness and publish/unpublish transitions.'],
  ['Author session', 'Real password login, backend context/capabilities, dashboard reads and logout across tabs passed.', 'Registration, account approval, invitation/reset email delivery, Google sign-in and role changes.'],
  ['Author data', 'Dashboard/books/analytics/performance/royalties/settlements/manual statements/payment-detail reads were verified.', 'Manuscript writes, profile/bank edits, financial ledger generation and settlements.'],
  ['CMS', 'Public content loads; frontend checks save readback and avoids invented page copy.', 'Admin CRUD/publish was not tested; 17 section values absent in the observed public document.'],
  ['Reader commerce', 'Navigation, empty cart, protected orders route and error states have browser coverage.', 'Registration, saved-address persistence, checkout, payment, confirmation, history, shipment and refunds.'],
  ['Admin', 'Anonymous/author access rejection was checked; admin pages and source calls exist.', 'No administrator credentials were supplied; successful admin reads and writes are not certified.'],
]);
paragraph('Recorded validation: 150 unit tests passed; 59 browser/API tests passed with two admin skips; three final public live checks passed; production build/TypeScript passed. Lint: zero errors, 259 warnings. Both recorded dependency vulnerability audits returned zero. These results do not certify transactional backend workflows.');

heading('3. B01 — CMS storage, publishing and the 17 missing sections');
paragraph('Existing linkage: GET /admin/content → admin editor → PUT /admin/content → fresh GET /admin/content and GET /content → frontend cache revalidation → public pages. GET /admin/content also needs its contract reconciled in section 7. Backend storage support cannot be judged from an absent public field alone: it may be unpublished data, a serializer omission or a storage/schema problem.');
list([
  'Persist siteSettings.siteContent and return it on both admin and public reads. Values are JSON strings containing arrays, not array objects. Existing unrelated settings must survive a partial edit.',
  'Canonical seo, faq and announcements take precedence over stale legacy mirrors. Explicit empty strings/arrays must remain cleared; do not restore default marketing or policy text.',
  'Preserve announcement IDs, inactive items and unrelated metadata when changing one banner. Preserve real FAQ ordering and identifiers.',
  'Validate JSON array shape and the frontend limit of 100 KiB per section. Supply approved real policy/business copy; the backend must not invent it.',
  'Separate private profile photos/bank details from public CMS content. Packages and spotlights have their own APIs; verify those publication paths too.',
  'Define revision/ETag or equivalent conditional writes to prevent simultaneous editors from overwriting each other. Coordinate any API changes with the frontend.',
]);
paragraph('Expected section locations and element fields (field-name notation, not populated example content):');
table(['Key', 'Public page', 'Array element fields'], report.cmsPageSections.map((section) => [section.key, section.page, section.shape]));
paragraph('Storage JSON schema, abbreviated to one field; every key in the table uses the same string encoding:');
code({ type: 'object', properties: { siteSettings: { type: 'object', properties: { siteContent: { type: 'object', properties: { homeWhyChooseJson: { type: 'string', description: 'A JSON-encoded array with the element fields listed above; the encoded empty array is the string []' } }, additionalProperties: true } }, additionalProperties: true } } });
paragraph('Acceptance: on staging publish approved content, edit it, reload the editor, read the public API, and verify the correct public screen. Test explicit clear/unpublish, invalid JSON, oversized input, concurrent editors and a save rejected by the server. A successful PUT status alone is insufficient.');
paragraph('Frontend-only revalidation: POST https://harglimpublishers.com/api/content/revalidate accepts Bearer authentication and no request body. It validates backend /users/me/context for an active administrator with canAdminister. Expected success is {"revalidated":true}; negative cases include 401/403 and verification-unavailable 503. Keep this route in Next.js; supply a reliable backend context response. Successful admin revalidation remains unverified.');

heading('4. B02/B08 — Catalog, categories and stable book linkage');
paragraph('Observed limitation: GET /books does not apply the frontend text-search query in the observed deployment, so the frontend uses GET /search?q=. Some format/rating/sort and combined search filters are applied locally to returned pages. This can produce incomplete results and inaccurate global pagination. Search+category currently gathers actual search pages as a workaround; it should not become the permanent filtering architecture.');
table(['Frontend sends / uses', 'Backend contract to confirm or implement'], [
  ['GET /search: q, page, limit', 'Document whether category, price, format, minimum rating and sort are supported; apply supported filters to the complete matching set.'],
  ['GET /books: page, limit, category, minPrice, maxPrice, featured, bestseller, newRelease, sort', 'Confirm actual parameter names and boolean parsing; filters/sort must precede pagination.'],
  ['Sort values: price_asc, price_desc, rating, newest, featured', 'Confirm supported values and deterministic tie-breaking; return global order rather than sorting one page.'],
  ['Proposed additions: format, minimum rating', 'Names are to be agreed; do not assume an unimplemented query parameter already works. Update frontend and OpenAPI together.'],
  ['List response', 'Return real Book records and consistent filtered total/page metadata. Preserve the current compatible envelope or coordinate a versioned change.'],
]);
paragraph('Proposed list response schema fragment for agreement (not an observed universal envelope):');
code({ type: 'object', required: ['data', 'pagination'], properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Book' } }, pagination: { type: 'object', required: ['page', 'limit', 'total', 'pages'], properties: { page: { type: 'integer', minimum: 1 }, limit: { type: 'integer', minimum: 1 }, total: { type: 'integer', minimum: 0 }, pages: { type: 'integer', minimum: 0 } } } } });
list([
  'Category ID is the stable relationship written by book/manuscript forms. Category slug identifies the public browse filter/URL. Populated Book.category must include stable identity; document whether reads return an ID or populated object.',
  'Public category lists contain active records; admin inventory must expose active and inactive records with accurate pagination and book association counts. Preserve existing inactive references when editing books.',
  'Enforce duplicate-name policy, slug uniqueness and referential integrity on the server. Frontend checks are not a uniqueness constraint.',
  'DELETE /admin/categories/{id} must atomically reject associated-book deletion, including a concurrent book assignment, with a documented conflict response. The UI already blocks deletion on nonzero/unknown counts; server source is needed to verify its own invariant.',
  'Preserve existing names and IDs. Existing Self Help is the approved alias for requested Self-Help; do not rename or replace it. sortOrder=0 is valid.',
  'The 63-name category seed is a dry-run/missing-only tool, not runtime content. Earlier public preview could not inspect inactive records. Inventory active+inactive categories before any authorized seed; do not assume all requested names are absent. No production seed was applied.',
]);
paragraph('Acceptance: create disposable staging categories/books, exercise active/inactive references, zero sort order, duplicates, empty category, nonexistent slug, edits reflected on public pages, all category pages, combined filters, and concurrent deletion/assignment.');

heading('5. B06/B07/B09 — Profile, reviews, contact and address contracts');
paragraph('Profile: GET /users/me is a confirmed real read. The supplied update contract is PUT /users/{id}; the frontend own-profile helper sends name/profilePicture and performs fresh readback. Do not invent PATCH /users/me. Enforce ownership and return canonical persisted values. The supplied User update accepts bio, but the handover indicates User storage may not persist it; confirm authoritative author-bio storage.');
paragraph('Photo clearing is unspecified by the current string/URI contract. Proposed field schema below requires a coordinated backend/frontend agreement; it is not currently implemented or live-tested:');
code({ profilePicture: { oneOf: [{ type: 'string', format: 'uri' }, { type: 'null' }] } });
paragraph('Author settings separately call PUT /authors/{authorId} with name, bio and optional profilePicture; PUT /authors/{authorId}/payment-details with a paymentDetails object; and GET /authors/me/payment-details for masked readback. Reconcile these actual source paths with server routes and identity rules. The author profile UI still needs canonical response/readback verification before its optimistic local update can certify persistence. That is coordinated frontend/backend work.');
paragraph('Frontend payout write shape, inferred from the actual caller; server DTO/validation still needs confirmation. No bank values are included here:');
code({ type: 'object', required: ['paymentDetails'], properties: { paymentDetails: { type: 'object', properties: strings(['accountHolderName', 'bankName', 'accountNumber', 'ifscCode', 'upiId']), description: 'Frontend sends filled fields only; requires a UPI ID or a complete bank set. Server must validate ownership/format and define preserve/clear semantics.' } } });
paragraph('Payout acceptance: persist a staging change, fresh GET returns only masked data, omitted accountNumber preserves the existing value where agreed, typed account number is discarded by the client after readback, and no account number enters logs/public CMS/browser persistence. Storage encryption, access logging and ledger security need backend source verification.');
paragraph('Reviews: GET /books/{slug}/reviews?page=1&limit=20 returned HTTP 200 with an empty data array but has no GET operation in the supplied OpenAPI. Add the real item/pagination/moderation contract. Do not infer populated review fields from an empty list. Define ownership IDs, rating, comment, timestamps and the exact meaning of verifiedPurchase. Return authoritative Book.ratings/reviewCount; a first page of reviews cannot define the aggregate.');
paragraph('The existing documented create request requires book, rating and comment; the frontend now includes the actual book ID. Supplied request schema:');
code(report.schemas.ReviewCreateRequest);
paragraph('Existing write paths: POST /books/{slug}/reviews; PUT/DELETE /books/{slug}/reviews/{reviewId}; admin review moderation routes in the endpoint appendix. Verify moderation visibility and review ownership on staging. Helpful-vote persistence has no documented endpoint: the local-only vote counter was removed. If reinstated, agree an authenticated/idempotent route and real helpfulCount/current-user vote state. This optional feature is not a confirmed missing deployed route.');
paragraph('Contact: frontend POST /contact sends the shape below. Confirm route, persistence/delivery queue, spam/rate controls and operational failure handling. A successful acceptance must mean durable receipt; an actual email-delivery failure must not be reported as delivered. Frontend fields, not a verified server schema:');
code({ type: 'object', required: ['name', 'email', 'message'], properties: { ...strings(['name', 'phone', 'subject', 'message', 'page']), email: { type: 'string', format: 'email' } } });
paragraph('Saved addresses: frontend GET/PUT /users/me/addresses expects data or addresses to be an array. PUT sends {addresses:[...]}, with a maximum of 10 entries, stable existing _id values and exactly one default. Confirm full-list replacement semantics and ownership. Address changes must not rewrite historical order shipping snapshots. Frontend address fields:');
code({ type: 'object', required: ['addresses'], properties: { addresses: { type: 'array', maxItems: 10, items: { type: 'object', required: ['fullName', 'addressLine1', 'city', 'postalCode', 'country'], properties: { ...strings(['_id', 'label', 'fullName', 'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country', 'phone', 'email']), isDefault: { type: 'boolean' } } } } } });

heading('6. B03/B04/B10 — Roles, finances and complete workflow acceptance');
paragraph('Session context linkage: real login token → GET /users/me/context → user ID/active state/role and canPublish, canAccessAuthorDashboard, canAdminister capabilities → frontend guards. Persisted browser role/capability flags must never authorize server actions. Test stale role changes, inactive accounts, cross-user IDs, expired sessions and logout/refresh revocation.');
list([
  'Reader: staging registration/login; book browsing/search/filtering; saved cart/address; backend-priced order; payment submission and verification; owned confirmation/history/tracking; profile/library/wishlist. Confirm every button produces the intended durable server transition.',
  'Author: staging application submission, admin approval and context refresh; manuscript upload/review/tracking; book management; actual sales analytics; royalty statement generation, settlement history and bank/payout edits. Author dashboards must not turn failed financial reads into zero earnings.',
  'Admin: dashboards, user/author management, books/categories/inventory, manuscripts, orders/payments/invoices, courier/shipment, review moderation, royalties/settlements, CMS/packages/spotlights. Verify success paths and unauthorized/cross-user failures.',
  'Order/finance source of truth is the backend. Calculate totals from authoritative prices and policies, validate item IDs/quantities, store order-item/shipping snapshots, and enforce stock reservation/release atomically.',
  'Make order creation, payment actions, callbacks and settlements replay-safe. Define idempotency/reconciliation so duplicate requests cannot duplicate orders, deductions, commissions, stock movements or payouts. Match actual payment references; never fabricate a UTR or verification result.',
  'Royalty/manual statement operations must enforce author/book relationships, effective terms, precise monetary arithmetic, periods and immutable audit history. Define correction/void semantics and preserve payout history. Do not trust client-calculated totals as a financial ledger.',
  'Shipment/courier assignment and tracking must use real provider/manual data and valid state transitions. Do not infer delivery from a cosmetic progress bar or send private tracking values to an unrelated search service.',
  'Bank/financial/private responses require authorization and no-store behavior. Mask sensitive read fields; avoid secrets/private payloads in errors, logs, client storage and public CMS.',
]);
paragraph('Current session limitation: access/refresh tokens follow the existing browser localStorage contract; the frontend CSP permits inline scripts for compatibility. A Secure/HttpOnly/SameSite cookie migration, refresh rotation/revocation, CSRF design and CORS policy need coordinated backend/frontend work and staging coverage. Do not switch authentication transport unilaterally or assume client-side role guards are sufficient.');
paragraph('Operational contracts: document timeout/retry behavior; 429 Retry-After/rate-limit policy; deterministic pagination; canonical date/currency/status types; request identifiers; sanitized errors; allowed upload MIME/size/URLs; and cache rules. Several local Next image-optimizer fetches timed out, while direct checks of two Cloudinary PNG URLs subsequently returned 200. Investigate image size/delivery/cache/load behavior; those results do not prove broken assets or sustained production performance.');
paragraph('Supplied error schema (existing documentation, not a claim that every deployed route conforms):');
code(report.schemas.ApiError);
paragraph('Acceptance status targets: validation 400/422, unauthenticated 401, forbidden 403, missing resource 404, conflict 409, rate limit 429, unavailable dependency/server 5xx. Preserve entered form data on failure. Document each operation’s actual status/body and avoid returning production stack traces.');

heading('7. B05 — Frontend calls absent from the supplied OpenAPI match');
paragraph('These are contract-review rows, not a list of proven missing implementations. Backend developer: mark each row PRESENT + DTO, IMPLEMENT, ALIAS/COORDINATED FRONTEND CHANGE, or NOT A BACKEND ROUTE. No business write was executed to test these paths. Template variables below are actual source expressions; replace them with verified IDs/slugs at runtime.');
paragraph('Expanded frontend request fields for variable-built bodies below. These describe existing callers, not newly verified server schemas:');
table(['Path / body encoding', 'Fields and frontend expectations'], [
  ['POST /author-applications — JSON', 'penName, fullName, email, phone; optional bio, experience, portfolioUrl. Confirm required fields/lengths/status response. Admin approval uses PUT /admin/author-applications/{id}/status with {"status":"approved"}; confirm other state/reason rules.'],
  ['POST /admin/users — JSON (author invitation helper)', 'name, email, role="author", isActive=true; this helper does not supply a password. Return real user identity and actual invited/emailSent outcomes. Confirm link expiry and mail failure/resend behavior; do not assume frontend expiry text proves the server policy.'],
  ['POST /admin/users/{id}/resend-invite', 'No body in the helper. Return real invitation/mail outcome. Source helper expects a conflict once a password has already been set; confirm the deployed status/contract.'],
  ['POST/PATCH /admin/publish-packages[/id] — JSON', 'name, description, price:number >=0, features:string[], isActive:boolean, tagline:string, highlighted:boolean, badge:string, sortOrder:integer >=0. Empty badge/tagline clears must persist; public GET /publish-packages must reflect active canonical records.'],
  ['POST/PATCH /admin/spotlights[/id] — multipart/form-data', 'image:file when selected (required on create), author_name:string, caption:string, sortOrder:text when set, isActive:"true" or "false". Frontend accepts JPEG/PNG/WebP <=10 MiB, author name <=120 chars, caption <=500 chars. Confirm server validation/storage and original-image preservation on edit without a new file. This is multipart, not JSON.'],
  ['POST /admin/manual-royalties — JSON', 'authorId; optional periodStart/periodEnd ISO timestamps and note; items:[{bookId?:string, bookTitle:string, royaltyPerBook:number>0, unitsSold:integer>=1}]. Enforce author/book ownership and server monetary arithmetic.'],
  ['GET manual-royalty statements', 'Frontend parser accepts data.statements, data.items, a data array, a top-level statements array, or a direct array. Canonical items need identity, author linkage, period, status, book linkage/title, royaltyPerBook, unitsSold, totalRoyalty; statement totals totalUnits/totalRoyalty and createdAt. Publish one precise actual envelope; server totals must be authoritative.'],
  ['POST /admin/manual-royalties/{id}/void — JSON', '{reason:string}; define permissions, valid state, required reason and immutable audit/ledger correction semantics. Do not erase the financial history.'],
  ['PUT /authors/{authorId} — JSON', 'name, bio, optional HTTP(S) profilePicture. Define user ID versus author-profile ID, ownership and canonical returned values. Fresh readback is still needed for full UI persistence verification.'],
  ['PUT /authors/{authorId}/payment-details — JSON', '{paymentDetails:{accountHolderName?,bankName?,accountNumber?,ifscCode?,upiId?}}; only filled values sent. Define omitted-versus-cleared semantics and masked GET readback; never expose actual bank values in this handover.'],
]);
const reviewEntries = report.endpoints.filter((endpoint) => !Object.hasOwn(endpoint, 'parameters'));
for (const endpoint of reviewEntries) {
  const usage = endpoint.usage?.[0];
  let state = 'CONTRACT GAP / runtime behavior needs confirmation';
  if (endpoint.path === '/api/content/revalidate') state = 'FRONTEND-ONLY Next.js route; do not add a duplicate backend route';
  else if (endpoint.path === '${API_URL}${path}') state = 'DYNAMIC HELPER; resolve each caller, not a literal route';
  else if (['/stats/public', '/spotlights', '/authors/me/payment-details', '/authors/me/manual-royalties'].includes(endpoint.path) || endpoint.path.includes('/reviews?')) state = 'OBSERVED READ WORKING; missing/incomplete supplied OpenAPI match';
  add('subheading', `${endpoint.method} ${endpoint.path}`);
  paragraph(`${state}. Caller: ${usage?.file ?? 'see inventory'}:${usage?.line ?? ''}; function: ${usage?.owner ?? 'see source'}.`);
  if (usage?.requestExpression) {
    paragraph('Actual frontend second argument (request body for mutations, request configuration for GET; variable names require resolving the caller):');
    code(usage.requestExpression);
  } else paragraph('No request body is supplied at this call site. Confirm supported parameters and the real response envelope.');
}

heading('8. Contract documentation repairs and deliverables');
list([
  `The supplied OpenAPI contains ${report.contractAnomalies.length} invalid operation response keys: settlement request-schema names were repeated inside responses. Keep only status/default response keys there; retain request schemas under components/schemas and reference them correctly.`,
  'ApiSuccess.data is documented generically as an object, while actual list reads use arrays. Supply concrete per-operation response schemas, including pagination, nullable fields, populated IDs, status enums and timestamps. Do not force every endpoint into a new wrapper without coordinated frontend changes.',
  'Add/reconcile every section-7 route and document user-versus-author identity, required roles, response envelopes, request validation and errors. Publish a versioned OpenAPI and a runnable staging collection.',
  'Backend handback: repository/branch + migration instructions; staging base URL; secure configuration instructions for reader/author/admin credentials; contract changelog; seeded disposable relational records; request/response schemas; and automated test results.',
  'Provide fixtures with at least two pages of books, a populated and empty category, an inactive referenced category, pending/approved/rejected manuscripts, payment/order/shipment states, approved/pending reviews, author ledger/settlement history and explicit empty CMS fields. These are authorized staging fixtures, never fabricated production data.',
  'Define cleanup/reset and rollback procedures. Supply mail/payment/courier test integrations appropriate to staging; never mark a live payment verified or send production invitations merely to pass a frontend test.',
]);
table(['Work item', 'Backend owner to return', 'Acceptance evidence'], [
  ['B01–B10', 'Status: implemented / present-confirmed / deferred; commit; route; request/response schema; migration/configuration; frontend coordination needed.', 'Staging test identifier, sanitized request/response shape, fresh readback and relevant role/ownership/error cases.'],
  ['Release gate', 'Backend + frontend joint sign-off after all required workflows pass.', 'No unresolved P0 connectivity/storage/authorization/financial defects. Remaining limitations explicitly accepted.'],
]);
paragraph('Frontend work remains too: 259 lint warnings, global-filter client workaround removal once server support lands, verified author-profile readback, any agreed avatar clearing/helpful-vote UX, and coordinated cookie/CSP changes. Do not assign frontend-only defects to the backend or certify them from a successful API status alone.');

heading('Appendix A. Existing endpoint inventory for connectivity reconciliation');
paragraph('The catalog below covers supplied documented operations. A matching source call is static evidence only; a zero count is not proof of an unused/missing endpoint because generic helpers may resolve it dynamically. Full schemas, call expressions and screen/form/button linkage are in the companion frontend-api-report.html and frontend-api-report.json. Keep those files with this handover when sharing the complete contract catalog.');
const documented = report.endpoints.filter((endpoint) => Object.hasOwn(endpoint, 'parameters'));
table(['Method / original contract path', 'Request schema / MIME', 'Response status keys', 'Direct call sites'], documented.map((endpoint) => {
  const content = endpoint.request?.content ?? {};
  const request = Object.entries(content).map(([mime, body]) => `${mime}: ${body.schema?.$ref?.split('/').at(-1) ?? body.schema?.type ?? 'inline schema'}`).join('; ') || 'No body declared';
  return [`${endpoint.method} ${endpoint.path}`, request, Object.keys(endpoint.responses).join(', '), String(endpoint.usage?.length ?? 0)];
}));
heading('Appendix B. Source references and evidence boundaries');
list([
  'api-audit/frontend-api-report.html — searchable frontend/API report with required schemas, role linkages, code call sites and verification results.',
  'api-audit/frontend-api-report.json — portable machine-readable endpoint/schema inventory; request JSON schemas and response-component definitions included.',
  'fulldetailedapi.md — supplied OpenAPI JSON despite its .md filename; documented contract is not proof of deployment.',
  'HM_BACKEND_COMPLETE_HANDOVER (1).md — supplied backend handover; backend source itself was not available for this audit.',
  'BACKEND_INTEGRATION_STATUS.md, PRODUCTION_RELEASE_AUDIT.md and TESTING.md — dated findings, frontend fixes, test procedure and outstanding gates.',
  'lib/page-content.ts — 17 CMS fields and array shapes; context/site-content-context.tsx — save/readback and canonical mapping.',
  'app/books/page.tsx, lib/categories.ts, lib/category-data.ts — current catalog/category behavior; tools/seed-categories.mjs — dry-run/missing-only seed tool.',
  'app/author/settings/page.tsx, lib/user-profile.ts, lib/manual-royalties.ts, lib/saved-address.ts — author/profile/payout/statement/address source contracts.',
]);
paragraph('This handover contains no account passwords, access/refresh tokens, bank values, customer records or invented business content. All workflow mutations remain restricted to an explicitly authorized staging/test environment.');

const escape = (text) => String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = blocks.map(({ kind, value }) => {
  if (kind === 'table') return [value.headers.join(' | '), ...value.rows.map((row) => row.join(' | '))].join('\n');
  if (kind === 'list') return value.map((item) => '- ' + item).join('\n');
  return value;
}).join('\n\n') + '\n';
const body = blocks.map(({ kind, value }) => {
  if (kind === 'title') return '<h1>' + escape(value).replaceAll('\n', '<br>') + '</h1>';
  if (kind === 'heading') return '<h2>' + escape(value) + '</h2>';
  if (kind === 'subheading') return '<h3>' + escape(value) + '</h3>';
  if (kind === 'code') return '<pre>' + escape(value) + '</pre>';
  if (kind === 'list') return '<ul>' + value.map((item) => '<li>' + escape(item) + '</li>').join('') + '</ul>';
  if (kind === 'table') return '<table><thead><tr>' + value.headers.map((item) => '<th>' + escape(item) + '</th>').join('') + '</tr></thead><tbody>' + value.rows.map((row) => '<tr>' + row.map((item) => '<td>' + escape(item) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  return '<p>' + escape(value) + '</p>';
}).join('\n');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Harglim Publishers — Backend connectivity handover</title><style>
*{box-sizing:border-box}body{font:10pt/1.45 Arial,sans-serif;color:#203b3b;margin:0;overflow-wrap:anywhere}h1{font-size:27pt;line-height:1.14;color:#0f3d3e;margin:0 0 18pt}h2{font-size:18pt;color:#0f3d3e;border-top:3px solid #b29233;padding-top:12pt;margin:26pt 0 12pt;break-before:page;break-after:avoid}h3{font-size:11pt;margin:14pt 0 5pt;break-after:avoid}p{margin:8pt 0}li{margin:5pt 0}table{border-collapse:collapse;width:100%;table-layout:fixed;margin:12pt 0;font-size:8.5pt}th,td{border:1px solid #c6d2cd;text-align:left;vertical-align:top;padding:6pt;overflow-wrap:anywhere}th{background:#eaf0ed;color:#0f3d3e}thead{display:table-header-group}tr{break-inside:avoid}pre{font:8.3pt/1.38 Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;background:#f2f5f3;border-left:3px solid #b29233;padding:9pt;margin:10pt 0;break-inside:auto}ul{padding-left:17pt}@media screen{body{max-width:820px;margin:30px auto;padding:24px}h2{margin-top:40px}}
</style></head><body>${body}</body></html>`;
fs.mkdirSync('api-audit', { recursive: true });
fs.writeFileSync(out + '.txt', text);
fs.writeFileSync(out + '.html', html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto(pathToFileURL(resolve(out + '.html')).href, { waitUntil: 'load' });
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out + '.pdf', format: 'A4', printBackground: true, tagged: true, outline: true, displayHeaderFooter: true, margin: { top: '17mm', bottom: '18mm', left: '14mm', right: '14mm' }, headerTemplate: '<div style="font:8px Arial;color:#61716c;margin-left:14mm">HARGLIM PUBLISHERS · BACKEND CONNECTIVITY HANDOVER</div>', footerTemplate: '<div style="font:8px Arial;color:#61716c;width:100%;text-align:right;margin-right:14mm">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error('Printable document overflows horizontally');
  const pdf = fs.readFileSync(out + '.pdf');
  const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) ?? []).length;
  if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-')) || !pages) throw new Error('Invalid PDF output');
  fs.mkdirSync('test-suite-results', { recursive: true });
  await page.screenshot({ path: 'test-suite-results/backend-handover-preview.png' });
  const result = { pdf: out + '.pdf', text: out + '.txt', pages, bytes: pdf.length, cmsFields: report.cmsPageSections.length, contractReviewEntries: reviewEntries.length, documentedOperations: documented.length, overflow: false };
  fs.writeFileSync('test-suite-results/backend-handover-verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
