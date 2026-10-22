# Backend alignment report

**For:** the backend developer
**Frontend state:** done for every item below. Each screen already calls the routes and sends or reads the fields described here, and falls back safely while the backend part is missing. Ship the backend side and it works; no further frontend change is needed unless noted.

Base path is `/api`. "Admin" means admin auth, and "Author" means an entitled author.

## Priority summary

| # | Item | Backend work | Frontend status |
| --- | --- | --- | --- |
| 1 | Manual royalty statements | **New routes** | ✅ Ready: admin page and author tab call the routes; they show a notice until the routes exist |
| 2 | Royalty = MRP − charges | Schema + calculation | ✅ Ready: sends and prefills the three charges; shows `royaltyPerCopy` when returned |
| 3 | Site Content contract and seeding | Store, validate, seed | ✅ Ready: every page reads `GET /content`; seed file is `api-audit/site-content-seed.json` |
| 4 | Tracking correction after dispatch | Rule change | ✅ Ready: allows edits until delivery; labels `TRACKING_UPDATED` events |
| 5 | Packages as the single source | Schema | ✅ Ready: admin form sends the new fields; Publish page switches to them automatically |
| 6 | Admin-created author accounts | Invite flow | ✅ Ready for invites: sends no password first. Author profiles without a login need a joint design |
| 7 | Public site stats | Small route | ✅ Ready: calls `/stats/public`, falls back to list totals |
| 8 | Document live routes | Docs only | Nothing needed |

---

## 1. Manual royalty statements (new; information only)

The admin enters, per author, a table: **Book name | Royalty per book (100%) | Total books sold | Total royalty**, with totals. The author sees the same table under Royalties → Publisher Statements.

**These statements are information only.** They must not change any royalty balance, settlement or payout.

### Model `ManualRoyaltyStatement`

```
_id, author (User ObjectId, role author), createdBy (admin User ObjectId),
periodStart?: Date, periodEnd?: Date, note?: string,
items: [{ book?: Book ObjectId, bookTitle: string, royaltyPerBook: number, unitsSold: int, totalRoyalty: number }],
totalUnits: int, totalRoyalty: number, currency: "INR",
status: "RECORDED" | "VOID", voidReason?: string, voidedAt?: Date, voidedBy?: ObjectId,
createdAt, updatedAt
```

> **Frontend:** done. Admin → Manual Royalties (`app/admin/royalties/page.tsx`), author Royalties → Publisher Statements, and the calls in `lib/manual-royalties.ts`. A 404 shows "backend does not support manual royalties yet".

### Routes

| Method | Path | Auth | Body / query | Response |
| --- | --- | --- | --- | --- |
| POST | `/admin/manual-royalties` | Admin | `{ authorId, periodStart?, periodEnd?, note?, items: [{ bookId?, bookTitle, royaltyPerBook, unitsSold }] }` | 201 with the statement |
| GET | `/admin/manual-royalties` | Admin | `authorId?, page, limit, from?, to?` | `{ data: [statement], pagination }`, newest first, `author` populated as `{ _id, name, email }` |
| GET | `/admin/manual-royalties/{id}` | Admin | | statement |
| POST | `/admin/manual-royalties/{id}/void` | Admin | `{ reason }` | statement with `status: "VOID"` |
| GET | `/authors/me/manual-royalties` | Author | `page, limit` | the caller's own `RECORDED` statements |

### Validation

- `authorId` must be an existing user with role `author`.
- `items` needs 1 to 100 entries. Each needs a non-empty `bookTitle`, `royaltyPerBook > 0` and `unitsSold` as an integer ≥ 1.
- If `bookId` is sent, the book must exist **and belong to `authorId`**. Store the book's current title as `bookTitle`.
- **The server computes** each item's `totalRoyalty`, plus `totalUnits` and `totalRoyalty`. Ignore any totals the client sends.
- `periodStart ≤ periodEnd` when both are present.
- Write an audit log entry for create and void.
- Do **not** feed these into accrued, eligible, pending or paid totals, or into `/admin/royalty-settlements` preview or create.

---

## 2. Royalty = MRP − printing cost − platform charges − delivery charges

> **Frontend:** done. The book forms send `printingCost`, `platformCharges` and `deliveryCharges` and prefill them from `GET /admin/books/{id}`. Author pages show `royaltyPerCopy` when the API returns it (`lib/royalty.ts`).

**Today:** `lineRoyalty = salePrice × royaltyPercentage / 100`.
**Required:** royalty per copy is a rupee amount.

### Book schema (admin-only fields, hidden from public responses like `royaltyPercentage`)

| Field | Type | Validation |
| --- | --- | --- |
| `printingCost` | number | min 0, default 0 |
| `platformCharges` | number | min 0, default 0 |
| `deliveryCharges` | number | min 0, default 0 |

- Accept them on `POST /admin/books` and `PUT /admin/books/{id}`. The forms already send them.
- Return them on `GET /admin/books/{id}`. The edit form prefills from them.

### Calculation at purchase

```
royaltyPerCopy = max(0, mrp − printingCost − platformCharges − deliveryCharges)
lineRoyalty    = royaltyPerCopy × quantity
```

- Snapshot `royaltyPerCopySnapshot` and the three charges on each order line, so editing a book never changes past sales.
- If a book has none of the charges set (older books), keep the percentage logic.
- Add `royaltyPerCopy` to the per-book and per-line data in `/authors/me/royalties`, `/authors/me/books/performance` and `/admin/authors/{id}/dashboard`. The frontend no longer shows percentages.
- **Interim behaviour:** the admin form also sends `royaltyPercentage = (mrp − charges) / mrp × 100`, so today's percentage maths gives the right amount at MRP. Once you calculate from the charges, ignore `royaltyPercentage` for books that have charges. No frontend change is needed.
- **Business decision needed:** for a sale at `discountPrice`, should the charges come off the discounted price or off the MRP?

---

## 3. Site Content: formal contract, seeding and cleanup

> **Frontend:** done. Every public page reads its copy from `GET /content`. Admin → Site Content saves it with `PUT /admin/content`, and the new **Page Sections** tab edits the long-form lists. The seed document is **`api-audit/site-content-seed.json`** (48 keys); regenerate it with `node tools/export-site-content-seed.mjs`.

### Fields

The frontend sends **every** field below on each save (a full object, not a partial update). Store each one as given.

| Group | Keys | Type |
| --- | --- | --- |
| Announcement | `announcementActive`, `announcementText` | boolean, string |
| Home | `homeTitle`, `homeSubtitle`, `homeHeroCtaText`, `homeFeaturedTitle`, `homeBestsellerTitle`, `homeCtaHeading`, `homeCtaSubtitle`, `homeCtaButtonText` | string |
| Contact and company | `contactPhone`, `contactEmail`, `contactSupportEmail`, `contactAddressLine1`, `contactAddressLine2`, `contactAddress` (joined), `contactHours`, `careersEmail` | string |
| Social | `socialFacebook`, `socialTwitter`, `socialInstagram`, `socialLinkedin` | URL string |
| Publish | `publishTitle`, `publishSubtitle`, `royaltySummary`, `authorGuidelinesText` | string |
| About | `aboutTitle`, `aboutSubtitle`, `aboutMission`, `aboutVision` | string |
| JSON lists | `packagesJson`, `faqsJson` | JSON string |
| Page sections (new) | `homeWhyChooseJson`, `aboutValuesJson`, `aboutTeamJson`, `publishServicesJson`, `publishStepsJson`, `guidelinesSectionsJson`, `guidelinesStepsJson`, `royaltyScheduleJson`, `royaltyExamplesJson`, `royaltyFaqsJson`, `returnsStepsJson`, `returnsEligibleJson`, `returnsNotEligibleJson`, `returnsFaqsJson`, `privacySectionsJson`, `termsSectionsJson`, `careersBenefitsJson` | JSON string (a list) |
| Admin | `adminProfileImage` | URL string |

The exact JSON shape for each page-section key is in `PAGE_SECTION_FIELDS` in `lib/page-content.ts`.

### Required

1. **Persist all keys above** on `PUT /admin/content` and return them on `GET /content`. **Live check (2026-10-19):** `GET /content` returns only the ContentUpdateRequest fields plus `authorGuidelinesText`, `royaltySummary`, `about*`, `contact*` and `faqsJson`. Every other key above (announcement, socials, support/careers email, home section headings, all page sections) is dropped on save. **Interim frontend workaround:** those keys are also sent inside `siteSettings.siteContent` (documented as `additionalProperties: true`), mirrored into `socialLinks`, `announcements` and `siteSettings.supportEmail`, and read back from there. After each save the admin editor re-reads `GET /content` and names any field that still did not persist. Please confirm `siteSettings` is stored as a free-form object (Mixed), or add the flat keys to the model.
2. **Validate** that every `*Json` key is valid JSON and a list (400 with the key name otherwise). Cap each value at about 100 KB.
3. **Seed** the content document from `api-audit/site-content-seed.json`, so the site does not depend on built-in frontend defaults.
4. **Clean legacy values:** older saves stored outdated defaults: `royaltySummary` "Earn up to 70% royalties…", a 3-item `faqsJson` saying "50% to 70% royalties", and `aboutSubtitle` "…since 2020". Replace them with the seed. The frontend currently ignores those exact strings.
5. **Pick one shape.** `GET /content` returns both the flat keys and grouped objects (`hero{}`, `about{}`, `contact{}`, `faq[]`, `socialLinks{}`). The frontend prefers the flat keys. Either drop the grouped objects or keep them in sync with the flat keys on save.
6. **Privacy:** `adminProfileImage` is admin-only. Exclude it from the public `GET /content` response, or move it to the admin's user profile.
7. Send `Cache-Control: no-cache` (or a short max-age with ETag) on `GET /content`, so admin edits show immediately.

---

## 4. Tracking ID corrections after dispatch

> **Frontend:** done. Admin Orders and Shipments allow editing tracking until delivery (`lib/shipment-actions.ts`), and the order timeline labels `TRACKING_UPDATED` events. If admin orders include `shipment`, the frontend uses it as is.

Admins must be able to fix a wrong AWB after a shipment is `PICKED_UP`, `IN_TRANSIT` or `OUT_FOR_DELIVERY`.

- Allow `POST /admin/shipments/{id}/assign-courier` in those statuses. It should update `courier.trackingNumber`, `courier.trackingUrl` and `courier.serviceName` **without changing the shipment status**, and append a `TRACKING_UPDATED` tracking event.
- Keep rejecting it for `DELIVERED`, `COMPLETED`, `CANCELLED` and `RETURNED`.
- Return the updated shipment including `status`.
- **Interim behaviour:** if the status is reset to `COURIER_ASSIGNED`, the frontend replays update-status calls to restore it. Confirm which behaviour you implement.
- `GET /admin/orders` does not include shipment or tracking data, so the frontend also calls `GET /admin/shipments?limit=100` and merges the two. Please include `shipment: { _id, status, courier }` on each admin order, or support `GET /admin/shipments?order=<id1>,<id2>`.

---

## 5. Publishing packages: one source of truth

Today the package card copy (tagline, features, highlighted badge) is edited as `packagesJson` in Site Content. Each card is matched to a `/publish-packages` record by `_id`, then by name, to get the `packageId` sent on manuscript submission. Matching by price was removed: the stored "Professional ₹4999" card matched the unrelated "Demo Starter Publishing" (₹4999) record. Live `/publish-packages` currently holds only the two demo packages, so no Publish page card links to a real package until an admin creates them in Admin → Publishing Packages.

**Required:**
- Add `tagline: string`, `highlighted: boolean`, `badge?: string` and `sortOrder: number` to `PublishPackage`. Accept them on `POST`/`PATCH /admin/publish-packages` and return them on `GET /publish-packages`.
- **Frontend:** done. Admin → Publishing Packages already sends `tagline`, `highlighted`, `badge` and `sortOrder`. As soon as `GET /publish-packages` returns any of these fields, the Publish page shows packages only from it, sorted by `sortOrder`, and stops using `packagesJson`. After that, admins should re-save each package to fill in its card copy.

---

## 6. Admin-created author accounts

When an admin adds a new author from the book form, the frontend creates the account with `POST /admin/users` and a random throwaway password. The author then has to use Forgot Password. For external authors without an email, it creates a placeholder login `author.<name>.<n>@harglim.internal`.

**Required:**
- Allow `POST /admin/users` with `role: "author"` and **no password**. Send the author an invite or set-password email, the same way the forgot-password flow does.
  - **Frontend:** done (`lib/admin-authors.ts`). It sends no password first. If the response is a 400 mentioning "password", it retries once with a secure throwaway password. Keep that 400 message containing the word "password" until invites ship.
- Add an author profile that needs no login account (for example `AuthorProfile { name, bio, photo, user? }`). External or pen-name authors can then be linked to books without fake emails. Books would reference the profile, and payouts still go to `user` when one is set.
  - **Frontend:** not started. This changes how books reference authors across the catalog, author pages and royalties, so agree the API shape with the frontend first.

---

## 7. Public site stats

The home and About pages show the number of books and authors by reading `pagination.total` from `GET /books?limit=1` and `GET /authors?limit=1`.

**Required:** `GET /stats/public` returning `{ booksCount, authorsCount }` (optionally wrapped in `data`), counting published books and active authors only.

**Frontend:** done (`lib/public-stats.ts`). It calls this route first and falls back to the list totals while it is missing.

---

## 8. Live routes missing from the handover

The frontend uses these, and they respond on the live server (401 without auth), but they are not in `HM_BACKEND_COMPLETE_HANDOVER`:

| Route | Used by |
| --- | --- |
| `GET`/`POST /admin/publish-packages`, `PATCH`/`DELETE /admin/publish-packages/{id}`, `GET /publish-packages` | Admin → Publishing Packages, Publish page |
| `GET /authors/me/payment-details`, `PUT /authors/{id}/payment-details` | Author → Settings (payout details) |
| `GET`/`PUT /users/me/addresses` | Checkout saved address |

Please add their request and response schemas to the handover.

---

## 9. Launch blockers found on the live API (2026-10-19)

- **Privacy:** public `GET /books` and `GET /books/{slug}` return `royaltyPercentage` (each author's private deal) and `reservedStock`. Remove them from public responses; keep them on `/admin/books` and the author's own endpoints.
- **`GET /authors/{id}` with a malformed id returns 500** ("Cast to ObjectId failed"). Return 404. The frontend now 404s non-ObjectId author URLs itself.
- **`GET /books/{id}` with a Mongo `_id` returns 404**; only the slug works. Either accept both, or confirm every book has a slug (the frontend links by slug).
- **Missing routes** (404 on the live server): `GET /stats/public` (§7) and `/authors/me/manual-royalties` (§1).

---

## Open business decisions (not backend work, but needed for content)

- **Discount sales:** should the charges come off the discounted price or off the MRP? (affects item 2)
- **Founding year:** the site said 2025 in one place and 2020 in another, so the year was removed. Add it back through Site Content once confirmed.
- **Careers benefits:** the old list (health cover, remote-first and so on) looked made up, so it now starts empty and the section is hidden. Fill it in under Site Content → Page Sections if real.
- **Returns policy** (30-day window, prepaid return label, 5–7 day refunds), **Privacy Policy** and **Terms** are carried over unchanged from the old pages. They should be reviewed by the business or legal before relying on them.
