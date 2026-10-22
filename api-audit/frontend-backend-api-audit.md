# Frontend API Connectivity Audit

Backend base: `https://harglimpublish-backend.onrender.com/api`

## Summary

- Frontend call sites: 203
- Unique normalized frontend endpoints: 139
- Connected call sites: 190
- Not connected call sites: 0
- Review-needed call sites: 13
- Connected unique endpoints: 127
- Not connected unique endpoints: 0
- Review-needed unique endpoints: 12

## Status Meaning

- `CONNECTED`: exact normalized method/path found in `fulldetailedapi.md` or backend handover docs.
- `NOT_CONNECTED`: known unsupported frontend call from backend report.
- `REVIEW_NEEDED`: no exact docs match found by parser; this may be a legacy fallback, undocumented deployed route, or parser miss.

## Full Call-Site List

| # | Status | Method | Frontend Route | Normalized Route | Client | Source | Backend Doc Source | Note |
|---:|---|---|---|---|---|---|---|---|
| 1 | CONNECTED | POST | `/auth/forgot-password` | `/auth/forgot-password` | api | `app/(auth)/forgot-password/page.tsx:32` | fulldetailedapi.md:1337 |  |
| 2 | CONNECTED | POST | `/auth/login` | `/auth/login` | api | `app/(auth)/login/page.tsx:70` | fulldetailedapi.md:587 |  |
| 3 | CONNECTED | POST | `/auth/login` | `/auth/login` | api | `app/(auth)/register/page.tsx:102` | fulldetailedapi.md:587 |  |
| 4 | CONNECTED | POST | `/auth/register` | `/auth/register` | api | `app/(auth)/register/page.tsx:90` | fulldetailedapi.md:404 |  |
| 5 | CONNECTED | GET | `/books?limit=1` | `/books` | api | `app/about/page.tsx:32` | fulldetailedapi.md:2486 |  |
| 6 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/about/page.tsx:33` | fulldetailedapi.md:9845 |  |
| 7 | CONNECTED | GET | `/admin/analytics/dashboard` | `/admin/analytics/dashboard` | api | `app/admin/analytics/page.tsx:47` | fulldetailedapi.md:28085 |  |
| 8 | CONNECTED | POST | `/admin/author-access/entitlements/grant` | `/admin/author-access/entitlements/grant` | api | `app/admin/author-access/page.tsx:124` | fulldetailedapi.md:20869 |  |
| 9 | CONNECTED | POST | `/admin/author-access/entitlements/${userId}/revoke` | `/admin/author-access/entitlements/{param}/revoke` | api | `app/admin/author-access/page.tsx:144` | fulldetailedapi.md:21047 |  |
| 10 | CONNECTED | POST | `/admin/author-access/entitlements/${userId}/restore` | `/admin/author-access/entitlements/{param}/restore` | api | `app/admin/author-access/page.tsx:155` | fulldetailedapi.md:21233 |  |
| 11 | CONNECTED | POST | `/admin/author-access/plans` | `/admin/author-access/plans` | api | `app/admin/author-access/page.tsx:170` | fulldetailedapi.md:19768 |  |
| 12 | CONNECTED | GET | `/admin/author-access/entitlements` | `/admin/author-access/entitlements` | api | `app/admin/author-access/page.tsx:71` | fulldetailedapi.md:20672 |  |
| 13 | CONNECTED | GET | `/admin/author-access/plans` | `/admin/author-access/plans` | api | `app/admin/author-access/page.tsx:85` | fulldetailedapi.md:19611 |  |
| 14 | CONNECTED | GET | `/admin/author-access/purchases` | `/admin/author-access/purchases` | api | `app/admin/author-access/page.tsx:99` | fulldetailedapi.md:20475 |  |
| 15 | CONNECTED | GET | `/admin/author-applications` | `/admin/author-applications` | api | `app/admin/author-applications/page.tsx:51` | HM_BACKEND_COMPLETE_HANDOVER (1).md:983 |  |
| 16 | CONNECTED | PUT | `/admin/author-applications/${id}/status` | `/admin/author-applications/{param}/status` | api | `app/admin/author-applications/page.tsx:69` | HM_BACKEND_COMPLETE_HANDOVER (1).md:675 |  |
| 17 | CONNECTED | PUT | `/admin/author-applications/${id}/status` | `/admin/author-applications/{param}/status` | api | `app/admin/author-applications/page.tsx:86` | HM_BACKEND_COMPLETE_HANDOVER (1).md:675 |  |
| 18 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/authors/page.tsx:58` | fulldetailedapi.md:15014 |  |
| 19 | CONNECTED | GET | `/admin/authors/${aId}` | `/admin/authors/{param}` | api | `app/admin/authors/page.tsx:92` | fulldetailedapi.md:30240 |  |
| 20 | CONNECTED | GET | `/admin/authors/${aId}/dashboard` | `/admin/authors/{param}/dashboard` | api | `app/admin/authors/page.tsx:93` | fulldetailedapi.md:21419 |  |
| 21 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/books/[id]/page.tsx:103` | fulldetailedapi.md:18657 |  |
| 22 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/[id]/page.tsx:136` | fulldetailedapi.md:15014 |  |
| 23 | CONNECTED | GET | `/admin/books/${bookId}` | `/admin/books/{param}` | api | `app/admin/books/[id]/page.tsx:176` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 24 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/[id]/page.tsx:351` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 25 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/books/[id]/page.tsx:393` | fulldetailedapi.md:5729 |  |
| 26 | CONNECTED | PUT | `/admin/books/${bookId}` | `/admin/books/{param}` | api | `app/admin/books/[id]/page.tsx:453` | fulldetailedapi.md:18077 |  |
| 27 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/books/new/page.tsx:107` | fulldetailedapi.md:18657 |  |
| 28 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:182` | fulldetailedapi.md:15014 |  |
| 29 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:240` | fulldetailedapi.md:15014 |  |
| 30 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:300` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 31 | CONNECTED | PATCH | `/admin/users/${finalAuthorId}` | `/admin/users/{param}` | api | `app/admin/books/new/page.tsx:456` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 32 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:471` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 33 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:500` | fulldetailedapi.md:15014 |  |
| 34 | CONNECTED | PATCH | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:509` | fulldetailedapi.md:15595 |  |
| 35 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/books/new/page.tsx:536` | fulldetailedapi.md:5729 |  |
| 36 | CONNECTED | POST | `/admin/books` | `/admin/books` | api | `app/admin/books/new/page.tsx:589` | fulldetailedapi.md:17887 |  |
| 37 | CONNECTED | PUT | `/admin/books/${createdBookId}` | `/admin/books/{param}` | api | `app/admin/books/new/page.tsx:597` | fulldetailedapi.md:18077 |  |
| 38 | CONNECTED | GET | `/admin/books` | `/admin/books` | api | `app/admin/books/page.tsx:108` | fulldetailedapi.md:17636 |  |
| 39 | CONNECTED | DELETE | `/admin/books/${id}` | `/admin/books/{param}` | api | `app/admin/books/page.tsx:159` | fulldetailedapi.md:18265 |  |
| 40 | CONNECTED | PUT | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:125` | fulldetailedapi.md:19032 |  |
| 41 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/categories/page.tsx:128` | fulldetailedapi.md:18657 |  |
| 42 | CONNECTED | PATCH | `/admin/categories/${catId}/status` | `/admin/categories/{param}/status` | api | `app/admin/categories/page.tsx:148` | fulldetailedapi.md:19412 |  |
| 43 | CONNECTED | DELETE | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:169` | fulldetailedapi.md:19231 |  |
| 44 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `app/admin/categories/page.tsx:64` | fulldetailedapi.md:18433 |  |
| 45 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/content/page.tsx:71` | fulldetailedapi.md:5729 |  |
| 46 | CONNECTED | PATCH | `/users/me` | `/users/me` | api | `app/admin/content/page.tsx:78` | backend report/live probe | Backend update: profile update alias is supported. |
| 47 | CONNECTED | GET | `/admin/operations/inventory/low-stock` | `/admin/operations/inventory/low-stock` | api | `app/admin/inventory/page.tsx:45` | fulldetailedapi.md:24028 |  |
| 48 | CONNECTED | GET | `/books` | `/books` | api | `app/admin/inventory/page.tsx:49` | fulldetailedapi.md:2486 |  |
| 49 | CONNECTED | GET | `/admin/operations/inventory/reservations` | `/admin/operations/inventory/reservations` | api | `app/admin/inventory/page.tsx:65` | fulldetailedapi.md:23785 |  |
| 50 | CONNECTED | GET | `/admin/operations/ledger/timeline` | `/admin/operations/ledger/timeline` | api | `app/admin/inventory/page.tsx:79` | fulldetailedapi.md:24732 |  |
| 51 | CONNECTED | GET | `/admin/invoices/search` | `/admin/invoices/search` | api | `app/admin/invoices/page.tsx:42` | fulldetailedapi.md:24959 |  |
| 52 | CONNECTED | GET | `/admin/invoices` | `/admin/invoices` | api | `app/admin/invoices/page.tsx:44` | fulldetailedapi.md:25212 |  |
| 53 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/invoices/page.tsx:51` | fulldetailedapi.md:16386 |  |
| 54 | CONNECTED | GET | `/admin/invoices/${invId}/download` | `/admin/invoices/{param}/download` | api | `app/admin/invoices/page.tsx:84` | fulldetailedapi.md:25449 |  |
| 55 | CONNECTED | POST | `/admin/publish-requests/${id}/approve` | `/admin/publish-requests/{param}/approve` | api | `app/admin/manuscripts/page.tsx:135` | fulldetailedapi.md:17450 |  |
| 56 | CONNECTED | POST | `/admin/publish-requests/${id}/reject` | `/admin/publish-requests/{param}/reject` | api | `app/admin/manuscripts/page.tsx:140` | fulldetailedapi.md:17264 |  |
| 57 | CONNECTED | POST | `/admin/publish-requests/${id}/request-changes` | `/admin/publish-requests/{param}/request-changes` | api | `app/admin/manuscripts/page.tsx:142` | fulldetailedapi.md:17078 |  |
| 58 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:144` | fulldetailedapi.md:16891 |  |
| 59 | CONNECTED | GET | `/admin/publish-requests` | `/admin/publish-requests` | api | `app/admin/manuscripts/page.tsx:92` | fulldetailedapi.md:16732 |  |
| 60 | CONNECTED | GET | `/admin/notifications/search` | `/admin/notifications/search` | api | `app/admin/notifications/page.tsx:37` | fulldetailedapi.md:25797 |  |
| 61 | CONNECTED | GET | `/admin/notifications` | `/admin/notifications` | api | `app/admin/notifications/page.tsx:39` | fulldetailedapi.md:26056 |  |
| 62 | CONNECTED | POST | `/admin/notifications/${notificationId}/retry` | `/admin/notifications/{param}/retry` | api | `app/admin/notifications/page.tsx:60` | fulldetailedapi.md:26479 |  |
| 63 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/orders/page.tsx:315` | fulldetailedapi.md:16386 |  |
| 64 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/orders/page.tsx:316` | fulldetailedapi.md:26935 |  |
| 65 | CONNECTED | POST | `/admin/operations/payments/${paymentMongoId}/approve` | `/admin/operations/payments/{param}/approve` | api | `app/admin/orders/page.tsx:359` | fulldetailedapi.md:22587 |  |
| 66 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:375` | fulldetailedapi.md:16545 |  |
| 67 | CONNECTED | POST | `/admin/operations/payments/${paymentMongoId}/reject` | `/admin/operations/payments/{param}/reject` | api | `app/admin/orders/page.tsx:393` | fulldetailedapi.md:22791 |  |
| 68 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:397` | fulldetailedapi.md:16545 |  |
| 69 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:421` | fulldetailedapi.md:16545 |  |
| 70 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/orders/page.tsx:472` | fulldetailedapi.md:26935 |  |
| 71 | CONNECTED | POST | `/admin/shipments/${shipmentId}/update-status` | `/admin/shipments/{param}/update-status` | api | `app/admin/orders/page.tsx:516` | fulldetailedapi.md:27708 |  |
| 72 | REVIEW_NEEDED | PATCH | `/admin/publish-packages/${editing._id}` | `/admin/publish-packages/{param}` | api | `app/admin/packages/page.tsx:142` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 73 | REVIEW_NEEDED | POST | `/admin/publish-packages` | `/admin/publish-packages` | api | `app/admin/packages/page.tsx:145` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 74 | REVIEW_NEEDED | DELETE | `/admin/publish-packages/${pkg._id}` | `/admin/publish-packages/{param}` | api | `app/admin/packages/page.tsx:164` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 75 | REVIEW_NEEDED | PATCH | `/admin/publish-packages/${pkg._id}` | `/admin/publish-packages/{param}` | api | `app/admin/packages/page.tsx:178` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 76 | REVIEW_NEEDED | GET | `/admin/publish-packages` | `/admin/publish-packages` | api | `app/admin/packages/page.tsx:75` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 77 | CONNECTED | GET | `/admin/dashboard` | `/admin/dashboard` | api | `app/admin/page.tsx:31` | fulldetailedapi.md:30069 |  |
| 78 | CONNECTED | GET | `/admin/reviews` | `/admin/reviews` | api | `app/admin/reviews/page.tsx:40` | fulldetailedapi.md:14206 |  |
| 79 | CONNECTED | PATCH | `/admin/reviews/${reviewId}/status` | `/admin/reviews/{param}/status` | api | `app/admin/reviews/page.tsx:59` | fulldetailedapi.md:14411 |  |
| 80 | CONNECTED | DELETE | `/admin/reviews/${reviewId}` | `/admin/reviews/{param}` | api | `app/admin/reviews/page.tsx:76` | fulldetailedapi.md:14610 |  |
| 81 | CONNECTED | POST | `/admin/royalty-settlements/preview` | `/admin/royalty-settlements/preview` | api | `app/admin/settlements/page.tsx:110` | fulldetailedapi.md:30585 |  |
| 82 | CONNECTED | POST | `/admin/royalty-settlements` | `/admin/royalty-settlements` | api | `app/admin/settlements/page.tsx:135` | fulldetailedapi.md:30770 |  |
| 83 | CONNECTED | POST | `/admin/royalty-settlements/${id}/approve` | `/admin/royalty-settlements/{param}/approve` | api | `app/admin/settlements/page.tsx:149` | fulldetailedapi.md:31330 |  |
| 84 | CONNECTED | POST | `/admin/royalty-settlements/${id}/mark-paid` | `/admin/royalty-settlements/{param}/mark-paid` | api | `app/admin/settlements/page.tsx:178` | fulldetailedapi.md:31504 |  |
| 85 | CONNECTED | POST | `/admin/royalty-settlements/${id}/cancel` | `/admin/royalty-settlements/{param}/cancel` | api | `app/admin/settlements/page.tsx:195` | fulldetailedapi.md:31699 |  |
| 86 | CONNECTED | GET | `/admin/royalty-settlements` | `/admin/royalty-settlements` | api | `app/admin/settlements/page.tsx:64` | fulldetailedapi.md:30953 |  |
| 87 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/settlements/page.tsx:80` | fulldetailedapi.md:15014 |  |
| 88 | CONNECTED | POST | `/admin/shipments/${shipmentId}/update-status` | `/admin/shipments/{param}/update-status` | api | `app/admin/shipments/page.tsx:207` | fulldetailedapi.md:27708 |  |
| 89 | CONNECTED | POST | `/admin/shipments/${sId}/cancel` | `/admin/shipments/{param}/cancel` | api | `app/admin/shipments/page.tsx:231` | fulldetailedapi.md:27897 |  |
| 90 | CONNECTED | GET | `/admin/shipments/search` | `/admin/shipments/search` | api | `app/admin/shipments/page.tsx:89` | fulldetailedapi.md:26678 |  |
| 91 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/shipments/page.tsx:91` | fulldetailedapi.md:26935 |  |
| 92 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/users/page.tsx:155` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 93 | CONNECTED | POST | `/admin/users/${targetUserId}/reset-password` | `/admin/users/{param}/reset-password` | api | `app/admin/users/page.tsx:220` | fulldetailedapi.md:16191 |  |
| 94 | CONNECTED | DELETE | `/admin/users/${id}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:249` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 95 | CONNECTED | PATCH | `/admin/users/${userId}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:280` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 96 | CONNECTED | PATCH | `/admin/users/${id}/status` | `/admin/users/{param}/status` | api | `app/admin/users/page.tsx:302` | fulldetailedapi.md:15997 |  |
| 97 | CONNECTED | PUT | `/admin/users/${id}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:304` | fulldetailedapi.md:15385 |  |
| 98 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/users/page.tsx:96` | fulldetailedapi.md:15014 |  |
| 99 | CONNECTED | GET | `/authors/me/analytics` | `/authors/me/analytics` | api | `app/author/analytics/page.tsx:60` | fulldetailedapi.md:11378 |  |
| 100 | CONNECTED | GET | `/authors/me/books/performance` | `/authors/me/books/performance` | api | `app/author/analytics/page.tsx:61` | fulldetailedapi.md:11564 |  |
| 101 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/books/page.tsx:33` | fulldetailedapi.md:11930 |  |
| 102 | CONNECTED | GET | `/authors/me/books/performance` | `/authors/me/books/performance` | api | `app/author/books/page.tsx:34` | fulldetailedapi.md:11564 |  |
| 103 | CONNECTED | GET | `/authors/me/dashboard` | `/authors/me/dashboard` | api | `app/author/books/page.tsx:37` | fulldetailedapi.md:11219 |  |
| 104 | CONNECTED | POST | `/authors/me/uploads/document` | `/authors/me/uploads/document` | api | `app/author/manuscripts/new/page.tsx:155` | fulldetailedapi.md:13025 |  |
| 105 | CONNECTED | POST | `/authors/me/books` | `/authors/me/books` | api | `app/author/manuscripts/new/page.tsx:180` | fulldetailedapi.md:12133 |  |
| 106 | CONNECTED | POST | `/authors/me/books/${bookId}/submit` | `/authors/me/books/{param}/submit` | api | `app/author/manuscripts/new/page.tsx:192` | fulldetailedapi.md:12836 |  |
| 107 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `app/author/manuscripts/new/page.tsx:69` | fulldetailedapi.md:13892 |  |
| 108 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/manuscripts/page.tsx:129` | fulldetailedapi.md:11930 |  |
| 109 | CONNECTED | DELETE | `/authors/me/books/${id}` | `/authors/me/books/{param}` | api | `app/author/manuscripts/page.tsx:154` | fulldetailedapi.md:12668 |  |
| 110 | CONNECTED | POST | `/authors/me/uploads/document` | `/authors/me/uploads/document` | api | `app/author/manuscripts/page.tsx:447` | fulldetailedapi.md:13025 |  |
| 111 | CONNECTED | POST | `/authors/me/books/${item.id}/submit` | `/authors/me/books/{param}/submit` | api | `app/author/manuscripts/page.tsx:452` | fulldetailedapi.md:12836 |  |
| 112 | CONNECTED | GET | `/authors/me/dashboard` | `/authors/me/dashboard` | api | `app/author/page.tsx:120` | fulldetailedapi.md:11219 |  |
| 113 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/page.tsx:121` | fulldetailedapi.md:11930 |  |
| 114 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `app/author/royalties/page.tsx:46` | fulldetailedapi.md:11723 |  |
| 115 | CONNECTED | GET | `/authors/me/royalty-settlements` | `/authors/me/royalty-settlements` | api | `app/author/royalties/page.tsx:47` | fulldetailedapi.md:29708 |  |
| 116 | CONNECTED | GET | `/users/me` | `/users/me` | api | `app/author/settings/page.tsx:102` | fulldetailedapi.md:6077 |  |
| 117 | REVIEW_NEEDED | GET | `/authors/me/payment-details` | `/authors/me/payment-details` | api | `app/author/settings/page.tsx:103` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 118 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/author/settings/page.tsx:165` | fulldetailedapi.md:5729 |  |
| 119 | CONNECTED | PUT | `/authors/${authorId}` | `/authors/{param}` | api | `app/author/settings/page.tsx:185` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 120 | REVIEW_NEEDED | PUT | `/authors/${authorId}/payment-details` | `/authors/{param}/payment-details` | api | `app/author/settings/page.tsx:241` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 121 | CONNECTED | GET | `${API_URL}/authors/${id}` | `/authors/{param}` | fetch | `app/authors/[id]/layout.tsx:11` | fulldetailedapi.md:10022 |  |
| 122 | CONNECTED | GET | `/authors/${params.id}` | `/authors/{param}` | api | `app/authors/[id]/page.tsx:59` | fulldetailedapi.md:10022 |  |
| 123 | CONNECTED | GET | `/authors/${params.id}/books` | `/authors/{param}/books` | api | `app/authors/[id]/page.tsx:60` | fulldetailedapi.md:10186 |  |
| 124 | CONNECTED | GET | `/authors` | `/authors` | api | `app/authors/page.tsx:43` | fulldetailedapi.md:9845 |  |
| 125 | CONNECTED | GET | `${API_URL}/books/${slug}` | `/books/{param}` | fetch | `app/books/[slug]/layout.tsx:11` | fulldetailedapi.md:2743 |  |
| 126 | CONNECTED | PUT | `/books/${params.slug}/reviews/${editingReviewId}` | `/books/{param}/reviews/{param}` | api | `app/books/[slug]/page.tsx:106` | fulldetailedapi.md:3336 |  |
| 127 | CONNECTED | POST | `/books/${params.slug}/reviews` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:112` | fulldetailedapi.md:3115 |  |
| 128 | CONNECTED | DELETE | `/books/${params.slug}/reviews/${reviewId}` | `/books/{param}/reviews/{param}` | api | `app/books/[slug]/page.tsx:142` | fulldetailedapi.md:3563 |  |
| 129 | CONNECTED | GET | `/books/${params.slug}` | `/books/{param}` | api | `app/books/[slug]/page.tsx:162` | fulldetailedapi.md:2743 |  |
| 130 | CONNECTED | GET | `/books/${params.slug}/related?limit=4` | `/books/{param}/related` | api | `app/books/[slug]/page.tsx:163` | fulldetailedapi.md:2929 |  |
| 131 | CONNECTED | GET | `/books/${params.slug}/reviews?page=1&limit=20` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:164` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2553 |  |
| 132 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/books/[slug]/page.tsx:207` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 133 | CONNECTED | GET | `/books/${params.slug}/reviews?page=1&limit=20` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:87` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2553 |  |
| 134 | CONNECTED | GET | `/search` | `/search` | api | `app/books/page.tsx:140` | fulldetailedapi.md:3761 |  |
| 135 | CONNECTED | GET | `/books` | `/books` | api | `app/books/page.tsx:141` | fulldetailedapi.md:2486 |  |
| 136 | CONNECTED | GET | `${API_URL}/categories/${slug}` | `/categories/{param}` | fetch | `app/categories/[slug]/layout.tsx:11` | fulldetailedapi.md:4203 |  |
| 137 | CONNECTED | GET | `/categories/${slug}` | `/categories/{param}` | api | `app/categories/[slug]/page.tsx:38` | fulldetailedapi.md:4203 |  |
| 138 | CONNECTED | GET | `/categories/${slug}/books` | `/categories/{param}/books` | api | `app/categories/[slug]/page.tsx:39` | fulldetailedapi.md:4393 |  |
| 139 | CONNECTED | GET | `/categories` | `/categories` | api | `app/categories/page.tsx:75` | fulldetailedapi.md:3968 |  |
| 140 | CONNECTED | POST | `/orders` | `/orders` | api | `app/checkout/checkout/page.tsx:169` | fulldetailedapi.md:4612 |  |
| 141 | CONNECTED | PUT | `/orders/${currentOrderId}/verify-payment` | `/orders/{param}/verify-payment` | api | `app/checkout/checkout/page.tsx:222` | fulldetailedapi.md:4815 |  |
| 142 | CONNECTED | POST | `/contact` | `/contact` | api | `app/contact/page.tsx:85` | backend report/live probe | Backend update: contact form API is supported. |
| 143 | CONNECTED | POST | `/author-applications` | `/author-applications` | api | `app/dashboard/become-author/page.tsx:128` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2564 |  |
| 144 | CONNECTED | GET | `/users/me/author-application` | `/users/me/author-application` | api | `app/dashboard/become-author/page.tsx:60` | fulldetailedapi.md:6591 |  |
| 145 | CONNECTED | GET | `/users/${userId}/library` | `/users/{param}/library` | api | `app/dashboard/library/page.tsx:38` | fulldetailedapi.md:9501 |  |
| 146 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/orders/page.tsx:192` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 147 | CONNECTED | GET | `/users/${userId}/shipments` | `/users/{param}/shipments` | api | `app/dashboard/orders/page.tsx:193` | fulldetailedapi.md:7877 |  |
| 148 | CONNECTED | GET | `/users/${userId}/payments` | `/users/{param}/payments` | api | `app/dashboard/orders/page.tsx:196` | fulldetailedapi.md:6947 |  |
| 149 | CONNECTED | GET | `/orders/${orderMongoId}/tracking` | `/orders/{param}/tracking` | api | `app/dashboard/orders/page.tsx:233` | fulldetailedapi.md:5373 |  |
| 150 | CONNECTED | DELETE | `/orders/${orderMongoId}` | `/orders/{param}` | api | `app/dashboard/orders/page.tsx:253` | fulldetailedapi.md:5013 |  |
| 151 | CONNECTED | PUT | `/orders/${orderMongoId}/verify-payment` | `/orders/{param}/verify-payment` | api | `app/dashboard/orders/page.tsx:275` | fulldetailedapi.md:4815 |  |
| 152 | CONNECTED | GET | `/users/${userId}/invoices` | `/users/{param}/invoices` | api | `app/dashboard/orders/page.tsx:293` | fulldetailedapi.md:7328 |  |
| 153 | CONNECTED | GET | `/users/${userId}/invoices/${invoiceId}/download` | `/users/{param}/invoices/{param}/download` | api | `app/dashboard/orders/page.tsx:305` | fulldetailedapi.md:7701 |  |
| 154 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/page.tsx:71` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 155 | CONNECTED | GET | `/books?limit=4` | `/books` | api | `app/dashboard/page.tsx:72` | fulldetailedapi.md:2486 |  |
| 156 | CONNECTED | GET | `/users/${userId}/payments` | `/users/{param}/payments` | api | `app/dashboard/payments/page.tsx:168` | fulldetailedapi.md:6947 |  |
| 157 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/payments/page.tsx:169` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 158 | CONNECTED | GET | `/users/${userId}/invoices` | `/users/{param}/invoices` | api | `app/dashboard/payments/page.tsx:233` | fulldetailedapi.md:7328 |  |
| 159 | CONNECTED | GET | `/users/${userId}/invoices/${invoiceId}/download` | `/users/{param}/invoices/{param}/download` | api | `app/dashboard/payments/page.tsx:244` | fulldetailedapi.md:7701 |  |
| 160 | CONNECTED | PUT | `/users/${userId}` | `/users/{param}` | api | `app/dashboard/profile/page.tsx:143` | fulldetailedapi.md:6404 |  |
| 161 | CONNECTED | GET | `/users/me` | `/users/me` | api | `app/dashboard/profile/page.tsx:62` | fulldetailedapi.md:6077 |  |
| 162 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/profile/page.tsx:64` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 163 | CONNECTED | PUT | `/authors/me/dashboard-access/purchases/${purchaseId}/verify-payment` | `/authors/me/dashboard-access/purchases/{param}/verify-payment` | api | `app/dashboard/purchase-access/page.tsx:132` | fulldetailedapi.md:11033 |  |
| 164 | CONNECTED | GET | `/authors/me/dashboard-access` | `/authors/me/dashboard-access` | api | `app/dashboard/purchase-access/page.tsx:65` | fulldetailedapi.md:10715 |  |
| 165 | CONNECTED | POST | `/authors/me/dashboard-access/purchase` | `/authors/me/dashboard-access/purchase` | api | `app/dashboard/purchase-access/page.tsx:94` | fulldetailedapi.md:10874 |  |
| 166 | CONNECTED | GET | `/users/${userId}/wishlist` | `/users/{param}/wishlist` | api | `app/dashboard/wishlist/page.tsx:33` | fulldetailedapi.md:9149 |  |
| 167 | CONNECTED | DELETE | `/users/${userId}/wishlist/${id}` | `/users/{param}/wishlist/{param}` | api | `app/dashboard/wishlist/page.tsx:57` | fulldetailedapi.md:9669 |  |
| 168 | CONNECTED | GET | `/books?bestseller=true&limit=4` | `/books` | api | `app/page.tsx:101` | fulldetailedapi.md:2486 |  |
| 169 | CONNECTED | GET | `/categories?featured=true&limit=6` | `/categories` | api | `app/page.tsx:102` | fulldetailedapi.md:3968 |  |
| 170 | CONNECTED | GET | `/authors?limit=6` | `/authors` | api | `app/page.tsx:103` | fulldetailedapi.md:9845 |  |
| 171 | CONNECTED | GET | `/books?limit=1` | `/books` | api | `app/page.tsx:104` | fulldetailedapi.md:2486 |  |
| 172 | CONNECTED | GET | `/books?featured=true&limit=8` | `/books` | api | `app/page.tsx:92` | fulldetailedapi.md:2486 |  |
| 173 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/publish/page.tsx:72` | fulldetailedapi.md:9845 |  |
| 174 | CONNECTED | GET | `/search` | `/search` | api | `app/search/page.tsx:29` | fulldetailedapi.md:3761 |  |
| 175 | CONNECTED | GET | `${API_URL}/books?limit=1000` | `/books` | fetch | `app/sitemap.ts:10` | fulldetailedapi.md:2486 |  |
| 176 | CONNECTED | GET | `${API_URL}/categories?limit=100` | `/categories` | fetch | `app/sitemap.ts:14` | fulldetailedapi.md:3968 |  |
| 177 | CONNECTED | GET | `${API_URL}/authors?limit=1000` | `/authors` | fetch | `app/sitemap.ts:18` | fulldetailedapi.md:9845 |  |
| 178 | CONNECTED | GET | `/orders/track/${encodeURIComponent(value)}` | `/orders/track/{param}` | api | `app/track-order/page.tsx:52` | fulldetailedapi.md:5553 |  |
| 179 | CONNECTED | POST | `/auth/google` | `/auth/google` | api | `components/auth/google-login-button.tsx:91` | fulldetailedapi.md:769 |  |
| 180 | CONNECTED | POST | `/users/${user._id \|\| user.id}/wishlist` | `/users/{param}/wishlist` | api | `components/books/book-card.tsx:108` | fulldetailedapi.md:9315 |  |
| 181 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `components/orders/recent-orders-section.tsx:35` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 182 | CONNECTED | GET | `/content` | `/content` | api | `context/site-content-context.tsx:342` | fulldetailedapi.md:249 |  |
| 183 | CONNECTED | PUT | `/admin/content` | `/admin/content` | api | `context/site-content-context.tsx:372` | fulldetailedapi.md:14778 |  |
| 184 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/cancel` | `/admin/operations/payments/{param}/cancel` | api | `lib/admin-payments-api.ts:104` | fulldetailedapi.md:22992 |  |
| 185 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/expire` | `/admin/operations/payments/{param}/expire` | api | `lib/admin-payments-api.ts:114` | fulldetailedapi.md:23196 |  |
| 186 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/retry-verification` | `/admin/operations/payments/{param}/retry-verification` | api | `lib/admin-payments-api.ts:124` | fulldetailedapi.md:23400 |  |
| 187 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/recreate-qr` | `/admin/operations/payments/{param}/recreate-qr` | api | `lib/admin-payments-api.ts:134` | fulldetailedapi.md:23583 |  |
| 188 | CONNECTED | GET | `/admin/operations/payments` | `/admin/operations/payments` | api | `lib/admin-payments-api.ts:64` | fulldetailedapi.md:22182 |  |
| 189 | CONNECTED | GET | `/admin/operations/payments/${paymentId}` | `/admin/operations/payments/{param}` | api | `lib/admin-payments-api.ts:74` | fulldetailedapi.md:22404 |  |
| 190 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/approve` | `/admin/operations/payments/{param}/approve` | api | `lib/admin-payments-api.ts:84` | fulldetailedapi.md:22587 |  |
| 191 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/reject` | `/admin/operations/payments/{param}/reject` | api | `lib/admin-payments-api.ts:94` | fulldetailedapi.md:22791 |  |
| 192 | CONNECTED | POST | `${API_URL}/auth/refresh` | `/auth/refresh` | axios | `lib/api.ts:154` | fulldetailedapi.md:950 |  |
| 193 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `lib/api.ts:238` | fulldetailedapi.md:29549 |  |
| 194 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `lib/categories.ts:107` | fulldetailedapi.md:18657 |  |
| 195 | CONNECTED | GET | `/categories` | `/categories` | api | `lib/categories.ts:31` | fulldetailedapi.md:3968 |  |
| 196 | REVIEW_NEEDED | POST | `/admin/manual-royalties` | `/admin/manual-royalties` | api | `lib/manual-royalties.ts:134` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 197 | REVIEW_NEEDED | GET | `/admin/manual-royalties` | `/admin/manual-royalties` | api | `lib/manual-royalties.ts:139` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 198 | REVIEW_NEEDED | POST | `/admin/manual-royalties/${id}/void` | `/admin/manual-royalties/{param}/void` | api | `lib/manual-royalties.ts:147` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 199 | REVIEW_NEEDED | GET | `/authors/me/manual-royalties` | `/authors/me/manual-royalties` | api | `lib/manual-royalties.ts:151` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 200 | REVIEW_NEEDED | GET | `/users/me/addresses` | `/users/me/addresses` | api | `lib/saved-address.ts:56` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 201 | REVIEW_NEEDED | PUT | `/users/me/addresses` | `/users/me/addresses` | api | `lib/saved-address.ts:62` |  | No exact match in parsed backend docs/handover. Verify manually or replace with canonical backend route. |
| 202 | CONNECTED | POST | `/admin/shipments/${shipmentId}/assign-courier` | `/admin/shipments/{param}/assign-courier` | api | `lib/shipment-actions.ts:13` | fulldetailedapi.md:27516 |  |
| 203 | CONNECTED | POST | `/admin/shipments/${shipmentId}/update-status` | `/admin/shipments/{param}/update-status` | api | `lib/shipment-actions.ts:18` | fulldetailedapi.md:27708 |  |

## Backend Request/Response Reference

- Canonical request and response examples live in `fulldetailedapi.md` at the `Backend Doc Source` line shown above.
- Additional route confirmations and workflow notes live in `HM_BACKEND_COMPLETE_HANDOVER (1).md` and `BACKEND_INTEGRATION_GUIDE.md`.
- Protected routes returning `401` without a token are considered connected if documented; send `Authorization: Bearer <token>`.