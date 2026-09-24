# Frontend API Connectivity Audit

Backend base: `https://harglimpublish-backend.onrender.com/api`

## Summary

- Frontend call sites: 258
- Unique normalized frontend endpoints: 143
- Connected call sites: 258
- Not connected call sites: 0
- Review-needed call sites: 0
- Connected unique endpoints: 143
- Not connected unique endpoints: 0
- Review-needed unique endpoints: 0

## Status Meaning

- `CONNECTED`: exact normalized method/path found in `fulldetailedapi.md` or backend handover docs.
- `NOT_CONNECTED`: known unsupported frontend call from backend report.
- `REVIEW_NEEDED`: no exact docs match found by parser; this may be a legacy fallback, undocumented deployed route, or parser miss.

## Full Call-Site List

| # | Status | Method | Frontend Route | Normalized Route | Client | Source | Backend Doc Source | Note |
|---:|---|---|---|---|---|---|---|---|
| 1 | CONNECTED | POST | `/auth/forgot-password` | `/auth/forgot-password` | api | `app/(auth)/forgot-password/page.tsx:32` | fulldetailedapi.md:1337 |  |
| 2 | CONNECTED | POST | `/auth/login` | `/auth/login` | api | `app/(auth)/login/page.tsx:67` | fulldetailedapi.md:587 |  |
| 3 | CONNECTED | POST | `/auth/register` | `/auth/register` | api | `app/(auth)/register/page.tsx:87` | fulldetailedapi.md:404 |  |
| 4 | CONNECTED | POST | `/auth/login` | `/auth/login` | api | `app/(auth)/register/page.tsx:99` | fulldetailedapi.md:587 |  |
| 5 | CONNECTED | GET | `/books?limit=1` | `/books` | api | `app/about/page.tsx:45` | fulldetailedapi.md:2486 |  |
| 6 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/about/page.tsx:46` | fulldetailedapi.md:9845 |  |
| 7 | CONNECTED | GET | `/admin/analytics/dashboard` | `/admin/analytics/dashboard` | api | `app/admin/analytics/page.tsx:48` | fulldetailedapi.md:28085 |  |
| 8 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/analytics/page.tsx:49` | fulldetailedapi.md:16386 |  |
| 9 | CONNECTED | GET | `/books` | `/books` | api | `app/admin/analytics/page.tsx:50` | fulldetailedapi.md:2486 |  |
| 10 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/analytics/page.tsx:51` | fulldetailedapi.md:15014 |  |
| 11 | CONNECTED | GET | `/admin/operations/payments` | `/admin/operations/payments` | api | `app/admin/analytics/page.tsx:52` | fulldetailedapi.md:22182 |  |
| 12 | CONNECTED | GET | `/admin/author-access/purchases` | `/admin/author-access/purchases` | api | `app/admin/author-access/page.tsx:112` | fulldetailedapi.md:20475 |  |
| 13 | CONNECTED | POST | `/admin/author-access/entitlements/grant` | `/admin/author-access/entitlements/grant` | api | `app/admin/author-access/page.tsx:137` | fulldetailedapi.md:20869 |  |
| 14 | CONNECTED | POST | `/admin/author-access/entitlements/${userId}/revoke` | `/admin/author-access/entitlements/{param}/revoke` | api | `app/admin/author-access/page.tsx:157` | fulldetailedapi.md:21047 |  |
| 15 | CONNECTED | POST | `/admin/author-access/entitlements/${userId}/restore` | `/admin/author-access/entitlements/{param}/restore` | api | `app/admin/author-access/page.tsx:168` | fulldetailedapi.md:21233 |  |
| 16 | CONNECTED | POST | `/admin/author-access/plans` | `/admin/author-access/plans` | api | `app/admin/author-access/page.tsx:183` | fulldetailedapi.md:19768 |  |
| 17 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `app/admin/author-access/page.tsx:68` | fulldetailedapi.md:29549 |  |
| 18 | CONNECTED | GET | `/admin/author-access/entitlements` | `/admin/author-access/entitlements` | api | `app/admin/author-access/page.tsx:84` | fulldetailedapi.md:20672 |  |
| 19 | CONNECTED | GET | `/admin/author-access/plans` | `/admin/author-access/plans` | api | `app/admin/author-access/page.tsx:98` | fulldetailedapi.md:19611 |  |
| 20 | CONNECTED | GET | `/admin/author-applications` | `/admin/author-applications` | api | `app/admin/author-applications/page.tsx:51` | HM_BACKEND_COMPLETE_HANDOVER (1).md:983 |  |
| 21 | CONNECTED | PUT | `/admin/author-applications/${id}/status` | `/admin/author-applications/{param}/status` | api | `app/admin/author-applications/page.tsx:69` | HM_BACKEND_COMPLETE_HANDOVER (1).md:675 |  |
| 22 | CONNECTED | PUT | `/admin/author-applications/${id}/status` | `/admin/author-applications/{param}/status` | api | `app/admin/author-applications/page.tsx:86` | HM_BACKEND_COMPLETE_HANDOVER (1).md:675 |  |
| 23 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/authors/page.tsx:52` | fulldetailedapi.md:15014 |  |
| 24 | CONNECTED | GET | `/users` | `/users` | api | `app/admin/authors/page.tsx:53` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 25 | CONNECTED | GET | `/admin/authors/${aId}` | `/admin/authors/{param}` | api | `app/admin/authors/page.tsx:86` | fulldetailedapi.md:30240 |  |
| 26 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `app/admin/books/[id]/page.tsx:116` | fulldetailedapi.md:18433 |  |
| 27 | CONNECTED | GET | `/categories` | `/categories` | api | `app/admin/books/[id]/page.tsx:116` | fulldetailedapi.md:3968 |  |
| 28 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/[id]/page.tsx:117` | fulldetailedapi.md:15014 |  |
| 29 | CONNECTED | GET | `/authors` | `/authors` | api | `app/admin/books/[id]/page.tsx:118` | fulldetailedapi.md:9845 |  |
| 30 | CONNECTED | GET | `/admin/books/${bookId}` | `/admin/books/{param}` | api | `app/admin/books/[id]/page.tsx:194` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 31 | CONNECTED | GET | `/books/${bookId}` | `/books/{param}` | api | `app/admin/books/[id]/page.tsx:201` | fulldetailedapi.md:2743 |  |
| 32 | CONNECTED | GET | `/books?limit=100` | `/books` | api | `app/admin/books/[id]/page.tsx:209` | fulldetailedapi.md:2486 |  |
| 33 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/[id]/page.tsx:382` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 34 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/books/[id]/page.tsx:424` | fulldetailedapi.md:5729 |  |
| 35 | CONNECTED | POST | `/uploads/publishing-image` | `/uploads/publishing-image` | api | `app/admin/books/[id]/page.tsx:426` | fulldetailedapi.md:13537 |  |
| 36 | CONNECTED | PUT | `/admin/books/${bookId}` | `/admin/books/{param}` | api | `app/admin/books/[id]/page.tsx:479` | fulldetailedapi.md:18077 |  |
| 37 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/books/[id]/page.tsx:93` | fulldetailedapi.md:18657 |  |
| 38 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `app/admin/books/new/page.tsx:120` | fulldetailedapi.md:18433 |  |
| 39 | CONNECTED | GET | `/categories` | `/categories` | api | `app/admin/books/new/page.tsx:120` | fulldetailedapi.md:3968 |  |
| 40 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:136` | fulldetailedapi.md:15014 |  |
| 41 | CONNECTED | GET | `/authors` | `/authors` | api | `app/admin/books/new/page.tsx:137` | fulldetailedapi.md:9845 |  |
| 42 | CONNECTED | PATCH | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:306` | fulldetailedapi.md:15595 |  |
| 43 | CONNECTED | PUT | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:307` | fulldetailedapi.md:15795 |  |
| 44 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:323` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 45 | CONNECTED | POST | `/auth/register` | `/auth/register` | api | `app/admin/books/new/page.tsx:341` | fulldetailedapi.md:404 |  |
| 46 | CONNECTED | PATCH | `/admin/users/${newUserId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:351` | fulldetailedapi.md:15595 |  |
| 47 | CONNECTED | PUT | `/admin/users/${newUserId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:352` | fulldetailedapi.md:15795 |  |
| 48 | CONNECTED | PUT | `/admin/users/${newUserId}` | `/admin/users/{param}` | api | `app/admin/books/new/page.tsx:363` | fulldetailedapi.md:15385 |  |
| 49 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:375` | fulldetailedapi.md:15014 |  |
| 50 | CONNECTED | PATCH | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:382` | fulldetailedapi.md:15595 |  |
| 51 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/books/new/page.tsx:409` | fulldetailedapi.md:5729 |  |
| 52 | CONNECTED | POST | `/admin/books` | `/admin/books` | api | `app/admin/books/new/page.tsx:460` | fulldetailedapi.md:17887 |  |
| 53 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/books/new/page.tsx:62` | fulldetailedapi.md:18657 |  |
| 54 | CONNECTED | GET | `/admin/books` | `/admin/books` | api | `app/admin/books/page.tsx:108` | fulldetailedapi.md:17636 |  |
| 55 | CONNECTED | GET | `/books` | `/books` | api | `app/admin/books/page.tsx:109` | fulldetailedapi.md:2486 |  |
| 56 | CONNECTED | DELETE | `/admin/books/${id}` | `/admin/books/{param}` | api | `app/admin/books/page.tsx:161` | fulldetailedapi.md:18265 |  |
| 57 | CONNECTED | PUT | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:127` | fulldetailedapi.md:19032 |  |
| 58 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/categories/page.tsx:130` | fulldetailedapi.md:18657 |  |
| 59 | CONNECTED | PATCH | `/admin/categories/${catId}/status` | `/admin/categories/{param}/status` | api | `app/admin/categories/page.tsx:150` | fulldetailedapi.md:19412 |  |
| 60 | CONNECTED | PUT | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:151` | fulldetailedapi.md:19032 |  |
| 61 | CONNECTED | DELETE | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:173` | fulldetailedapi.md:19231 |  |
| 62 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `app/admin/categories/page.tsx:64` | fulldetailedapi.md:18433 |  |
| 63 | CONNECTED | GET | `/categories` | `/categories` | api | `app/admin/categories/page.tsx:65` | fulldetailedapi.md:3968 |  |
| 64 | CONNECTED | PATCH | `/users/me` | `/users/me` | api | `app/admin/content/page.tsx:103` | backend report/live probe | Backend update: profile update alias is supported. |
| 65 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/content/page.tsx:70` | fulldetailedapi.md:5729 |  |
| 66 | CONNECTED | POST | `/authors/me/uploads/image` | `/authors/me/uploads/image` | api | `app/admin/content/page.tsx:73` | fulldetailedapi.md:13194 |  |
| 67 | CONNECTED | GET | `/admin/operations/inventory/low-stock` | `/admin/operations/inventory/low-stock` | api | `app/admin/inventory/page.tsx:45` | fulldetailedapi.md:24028 |  |
| 68 | CONNECTED | GET | `/books` | `/books` | api | `app/admin/inventory/page.tsx:49` | fulldetailedapi.md:2486 |  |
| 69 | CONNECTED | GET | `/admin/operations/inventory/reservations` | `/admin/operations/inventory/reservations` | api | `app/admin/inventory/page.tsx:65` | fulldetailedapi.md:23785 |  |
| 70 | CONNECTED | GET | `/admin/operations/ledger/timeline` | `/admin/operations/ledger/timeline` | api | `app/admin/inventory/page.tsx:79` | fulldetailedapi.md:24732 |  |
| 71 | CONNECTED | GET | `/admin/invoices/search` | `/admin/invoices/search` | api | `app/admin/invoices/page.tsx:42` | fulldetailedapi.md:24959 |  |
| 72 | CONNECTED | GET | `/admin/invoices` | `/admin/invoices` | api | `app/admin/invoices/page.tsx:43` | fulldetailedapi.md:25212 |  |
| 73 | CONNECTED | GET | `/admin/invoices` | `/admin/invoices` | api | `app/admin/invoices/page.tsx:46` | fulldetailedapi.md:25212 |  |
| 74 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/invoices/page.tsx:53` | fulldetailedapi.md:16386 |  |
| 75 | CONNECTED | GET | `/admin/invoices/${invId}/download` | `/admin/invoices/{param}/download` | api | `app/admin/invoices/page.tsx:86` | fulldetailedapi.md:25449 |  |
| 76 | CONNECTED | POST | `/admin/publish-requests/${id}/approve` | `/admin/publish-requests/{param}/approve` | api | `app/admin/manuscripts/page.tsx:135` | fulldetailedapi.md:17450 |  |
| 77 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:136` | fulldetailedapi.md:16891 |  |
| 78 | CONNECTED | POST | `/admin/publish-requests/${id}/reject` | `/admin/publish-requests/{param}/reject` | api | `app/admin/manuscripts/page.tsx:140` | fulldetailedapi.md:17264 |  |
| 79 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:141` | fulldetailedapi.md:16891 |  |
| 80 | CONNECTED | POST | `/admin/publish-requests/${id}/request-changes` | `/admin/publish-requests/{param}/request-changes` | api | `app/admin/manuscripts/page.tsx:144` | fulldetailedapi.md:17078 |  |
| 81 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:145` | fulldetailedapi.md:16891 |  |
| 82 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:148` | fulldetailedapi.md:16891 |  |
| 83 | CONNECTED | GET | `/admin/publish-requests` | `/admin/publish-requests` | api | `app/admin/manuscripts/page.tsx:92` | fulldetailedapi.md:16732 |  |
| 84 | CONNECTED | GET | `/admin/notifications/search` | `/admin/notifications/search` | api | `app/admin/notifications/page.tsx:37` | fulldetailedapi.md:25797 |  |
| 85 | CONNECTED | GET | `/admin/notifications` | `/admin/notifications` | api | `app/admin/notifications/page.tsx:38` | fulldetailedapi.md:26056 |  |
| 86 | CONNECTED | GET | `/admin/notifications` | `/admin/notifications` | api | `app/admin/notifications/page.tsx:41` | fulldetailedapi.md:26056 |  |
| 87 | CONNECTED | POST | `/admin/notifications/${notificationId}/retry` | `/admin/notifications/{param}/retry` | api | `app/admin/notifications/page.tsx:62` | fulldetailedapi.md:26479 |  |
| 88 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/orders/page.tsx:226` | fulldetailedapi.md:16386 |  |
| 89 | CONNECTED | POST | `/admin/operations/payments/${paymentMongoId}/approve` | `/admin/operations/payments/{param}/approve` | api | `app/admin/orders/page.tsx:250` | fulldetailedapi.md:22587 |  |
| 90 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:267` | fulldetailedapi.md:16545 |  |
| 91 | CONNECTED | POST | `/admin/operations/payments/${paymentMongoId}/reject` | `/admin/operations/payments/{param}/reject` | api | `app/admin/orders/page.tsx:285` | fulldetailedapi.md:22791 |  |
| 92 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:289` | fulldetailedapi.md:16545 |  |
| 93 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:313` | fulldetailedapi.md:16545 |  |
| 94 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:359` | fulldetailedapi.md:16545 |  |
| 95 | CONNECTED | GET | `/admin/dashboard` | `/admin/dashboard` | api | `app/admin/page.tsx:32` | fulldetailedapi.md:30069 |  |
| 96 | CONNECTED | GET | `/admin/stats` | `/admin/stats` | api | `app/admin/page.tsx:32` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 97 | CONNECTED | GET | `/admin/orders?limit=100` | `/admin/orders` | api | `app/admin/page.tsx:33` | fulldetailedapi.md:16386 |  |
| 98 | CONNECTED | GET | `/admin/author-applications` | `/admin/author-applications` | api | `app/admin/page.tsx:34` | HM_BACKEND_COMPLETE_HANDOVER (1).md:983 |  |
| 99 | CONNECTED | GET | `/books?limit=100` | `/books` | api | `app/admin/page.tsx:35` | fulldetailedapi.md:2486 |  |
| 100 | CONNECTED | GET | `/admin/operations/payments?status=VERIFICATION_PENDING` | `/admin/operations/payments` | api | `app/admin/page.tsx:36` | fulldetailedapi.md:22182 |  |
| 101 | CONNECTED | GET | `/admin/reviews` | `/admin/reviews` | api | `app/admin/reviews/page.tsx:40` | fulldetailedapi.md:14206 |  |
| 102 | CONNECTED | GET | `/reviews` | `/reviews` | api | `app/admin/reviews/page.tsx:41` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 103 | CONNECTED | PATCH | `/admin/reviews/${reviewId}/status` | `/admin/reviews/{param}/status` | api | `app/admin/reviews/page.tsx:61` | fulldetailedapi.md:14411 |  |
| 104 | CONNECTED | DELETE | `/admin/reviews/${reviewId}` | `/admin/reviews/{param}` | api | `app/admin/reviews/page.tsx:78` | fulldetailedapi.md:14610 |  |
| 105 | CONNECTED | POST | `/admin/royalty-settlements/preview` | `/admin/royalty-settlements/preview` | api | `app/admin/settlements/page.tsx:111` | fulldetailedapi.md:30585 |  |
| 106 | CONNECTED | POST | `/admin/royalty-settlements` | `/admin/royalty-settlements` | api | `app/admin/settlements/page.tsx:136` | fulldetailedapi.md:30770 |  |
| 107 | CONNECTED | POST | `/admin/royalty-settlements/${id}/approve` | `/admin/royalty-settlements/{param}/approve` | api | `app/admin/settlements/page.tsx:150` | fulldetailedapi.md:31330 |  |
| 108 | CONNECTED | POST | `/admin/royalty-settlements/${id}/mark-paid` | `/admin/royalty-settlements/{param}/mark-paid` | api | `app/admin/settlements/page.tsx:179` | fulldetailedapi.md:31504 |  |
| 109 | CONNECTED | POST | `/admin/royalty-settlements/${id}/cancel` | `/admin/royalty-settlements/{param}/cancel` | api | `app/admin/settlements/page.tsx:196` | fulldetailedapi.md:31699 |  |
| 110 | CONNECTED | GET | `/admin/royalty-settlements` | `/admin/royalty-settlements` | api | `app/admin/settlements/page.tsx:64` | fulldetailedapi.md:30953 |  |
| 111 | CONNECTED | GET | `/authors` | `/authors` | api | `app/admin/settlements/page.tsx:79` | fulldetailedapi.md:9845 |  |
| 112 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/settlements/page.tsx:80` | fulldetailedapi.md:15014 |  |
| 113 | CONNECTED | POST | `/admin/shipments/${shipmentId}/assign-courier` | `/admin/shipments/{param}/assign-courier` | api | `app/admin/shipments/page.tsx:170` | fulldetailedapi.md:27516 |  |
| 114 | CONNECTED | POST | `/admin/shipments/${shipmentId}/update-status` | `/admin/shipments/{param}/update-status` | api | `app/admin/shipments/page.tsx:188` | fulldetailedapi.md:27708 |  |
| 115 | CONNECTED | POST | `/admin/shipments/${sId}/cancel` | `/admin/shipments/{param}/cancel` | api | `app/admin/shipments/page.tsx:208` | fulldetailedapi.md:27897 |  |
| 116 | CONNECTED | GET | `/admin/shipments/search` | `/admin/shipments/search` | api | `app/admin/shipments/page.tsx:76` | fulldetailedapi.md:26678 |  |
| 117 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/shipments/page.tsx:77` | fulldetailedapi.md:26935 |  |
| 118 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/shipments/page.tsx:80` | fulldetailedapi.md:26935 |  |
| 119 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/users/page.tsx:160` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 120 | CONNECTED | POST | `/auth/register` | `/auth/register` | api | `app/admin/users/page.tsx:173` | fulldetailedapi.md:404 |  |
| 121 | CONNECTED | PATCH | `/admin/users/${newId}/role` | `/admin/users/{param}/role` | api | `app/admin/users/page.tsx:183` | fulldetailedapi.md:15595 |  |
| 122 | CONNECTED | PUT | `/admin/users/${newId}/role` | `/admin/users/{param}/role` | api | `app/admin/users/page.tsx:184` | fulldetailedapi.md:15795 |  |
| 123 | CONNECTED | PATCH | `/admin/users/${newId}/status` | `/admin/users/{param}/status` | api | `app/admin/users/page.tsx:188` | fulldetailedapi.md:15997 |  |
| 124 | CONNECTED | PUT | `/admin/users/${newId}/status` | `/admin/users/{param}/status` | api | `app/admin/users/page.tsx:189` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 125 | CONNECTED | POST | `/admin/users/${targetUserId}/reset-password` | `/admin/users/{param}/reset-password` | api | `app/admin/users/page.tsx:265` | fulldetailedapi.md:16191 |  |
| 126 | CONNECTED | DELETE | `/admin/users/${id}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:294` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 127 | CONNECTED | PUT | `/admin/users/${userId}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:338` | fulldetailedapi.md:15385 |  |
| 128 | CONNECTED | PATCH | `/admin/users/${userId}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:339` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 129 | CONNECTED | PUT | `/users/${userId}` | `/users/{param}` | api | `app/admin/users/page.tsx:340` | fulldetailedapi.md:6404 |  |
| 130 | CONNECTED | PUT | `/admin/users/${id}/status` | `/admin/users/{param}/status` | api | `app/admin/users/page.tsx:374` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 131 | CONNECTED | PUT | `/admin/users/${id}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:378` | fulldetailedapi.md:15385 |  |
| 132 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/users/page.tsx:96` | fulldetailedapi.md:15014 |  |
| 133 | CONNECTED | GET | `/users` | `/users` | api | `app/admin/users/page.tsx:97` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 134 | CONNECTED | GET | `/authors/me/analytics` | `/authors/me/analytics` | api | `app/author/analytics/page.tsx:32` | fulldetailedapi.md:11378 |  |
| 135 | CONNECTED | GET | `/authors/me/books/performance` | `/authors/me/books/performance` | api | `app/author/analytics/page.tsx:33` | fulldetailedapi.md:11564 |  |
| 136 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `app/author/analytics/page.tsx:34` | fulldetailedapi.md:11723 |  |
| 137 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/books/page.tsx:30` | fulldetailedapi.md:11930 |  |
| 138 | CONNECTED | GET | `/books` | `/books` | api | `app/author/books/page.tsx:38` | fulldetailedapi.md:2486 |  |
| 139 | CONNECTED | POST | `/authors/me/uploads/document` | `/authors/me/uploads/document` | api | `app/author/manuscripts/new/page.tsx:146` | fulldetailedapi.md:13025 |  |
| 140 | CONNECTED | POST | `/publish-requests` | `/publish-requests` | api | `app/author/manuscripts/new/page.tsx:181` | fulldetailedapi.md:13711 |  |
| 141 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `app/author/manuscripts/new/page.tsx:68` | fulldetailedapi.md:13892 |  |
| 142 | CONNECTED | DELETE | `/authors/me/books/${id}` | `/authors/me/books/{param}` | api | `app/author/manuscripts/page.tsx:118` | fulldetailedapi.md:12668 |  |
| 143 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/manuscripts/page.tsx:82` | fulldetailedapi.md:11930 |  |
| 144 | CONNECTED | GET | `/authors/me/dashboard` | `/authors/me/dashboard` | api | `app/author/page.tsx:31` | fulldetailedapi.md:11219 |  |
| 145 | CONNECTED | GET | `/authors/${authorId}/stats` | `/authors/{param}/stats` | api | `app/author/page.tsx:32` | fulldetailedapi.md:10379 |  |
| 146 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `app/author/royalties/page.tsx:25` | fulldetailedapi.md:11723 |  |
| 147 | CONNECTED | GET | `/authors/me/royalty-settlements` | `/authors/me/royalty-settlements` | api | `app/author/royalties/page.tsx:26` | fulldetailedapi.md:29708 |  |
| 148 | CONNECTED | POST | `/uploads/publishing-image` | `/uploads/publishing-image` | api | `app/author/settings/page.tsx:166` | fulldetailedapi.md:13537 |  |
| 149 | CONNECTED | POST | `/authors/me/uploads/image` | `/authors/me/uploads/image` | api | `app/author/settings/page.tsx:171` | fulldetailedapi.md:13194 |  |
| 150 | CONNECTED | PUT | `/users/${authorId}` | `/users/{param}` | api | `app/author/settings/page.tsx:193` | fulldetailedapi.md:6404 |  |
| 151 | CONNECTED | PUT | `/authors/${authorId}` | `/authors/{param}` | api | `app/author/settings/page.tsx:236` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 152 | CONNECTED | GET | `/authors/${authorId}` | `/authors/{param}` | api | `app/author/settings/page.tsx:79` | fulldetailedapi.md:10022 |  |
| 153 | CONNECTED | GET | `${API_URL}/authors/${id}` | `/authors/{param}` | fetch | `app/authors/[id]/layout.tsx:11` | fulldetailedapi.md:10022 |  |
| 154 | CONNECTED | GET | `/users/${params.id}` | `/users/{param}` | api | `app/authors/[id]/page.tsx:63` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 155 | CONNECTED | GET | `/authors` | `/authors` | api | `app/authors/[id]/page.tsx:65` | fulldetailedapi.md:9845 |  |
| 156 | CONNECTED | GET | `/authors/${params.id}/books` | `/authors/{param}/books` | api | `app/authors/[id]/page.tsx:86` | fulldetailedapi.md:10186 |  |
| 157 | CONNECTED | GET | `/books` | `/books` | api | `app/authors/[id]/page.tsx:87` | fulldetailedapi.md:2486 |  |
| 158 | CONNECTED | GET | `/authors` | `/authors` | api | `app/authors/page.tsx:43` | fulldetailedapi.md:9845 |  |
| 159 | CONNECTED | GET | `${API_URL}/books/${slug}` | `/books/{param}` | fetch | `app/books/[slug]/layout.tsx:11` | fulldetailedapi.md:2743 |  |
| 160 | CONNECTED | PUT | `/books/${params.slug}/reviews/${editingReviewId}` | `/books/{param}/reviews/{param}` | api | `app/books/[slug]/page.tsx:106` | fulldetailedapi.md:3336 |  |
| 161 | CONNECTED | POST | `/books/${params.slug}/reviews` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:112` | fulldetailedapi.md:3115 |  |
| 162 | CONNECTED | DELETE | `/books/${params.slug}/reviews/${reviewId}` | `/books/{param}/reviews/{param}` | api | `app/books/[slug]/page.tsx:142` | fulldetailedapi.md:3563 |  |
| 163 | CONNECTED | GET | `/books/${params.slug}` | `/books/{param}` | api | `app/books/[slug]/page.tsx:162` | fulldetailedapi.md:2743 |  |
| 164 | CONNECTED | GET | `/books/${params.slug}/related?limit=4` | `/books/{param}/related` | api | `app/books/[slug]/page.tsx:163` | fulldetailedapi.md:2929 |  |
| 165 | CONNECTED | GET | `/books/${params.slug}/reviews?page=1&limit=20` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:164` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2553 |  |
| 166 | CONNECTED | GET | `/users/me/orders` | `/users/me/orders` | api | `app/books/[slug]/page.tsx:205` | backend report/live probe | Backend report: supported reader order route. |
| 167 | CONNECTED | GET | `/books/${params.slug}/reviews?page=1&limit=20` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:87` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2553 |  |
| 168 | CONNECTED | GET | `/books` | `/books` | api | `app/books/page.tsx:135` | fulldetailedapi.md:2486 |  |
| 169 | CONNECTED | GET | `${API_URL}/categories/${slug}` | `/categories/{param}` | fetch | `app/categories/[slug]/layout.tsx:11` | fulldetailedapi.md:4203 |  |
| 170 | CONNECTED | GET | `/categories/${slug}` | `/categories/{param}` | api | `app/categories/[slug]/page.tsx:38` | fulldetailedapi.md:4203 |  |
| 171 | CONNECTED | GET | `/categories/${slug}/books` | `/categories/{param}/books` | api | `app/categories/[slug]/page.tsx:39` | fulldetailedapi.md:4393 |  |
| 172 | CONNECTED | GET | `/books` | `/books` | api | `app/categories/[slug]/page.tsx:40` | fulldetailedapi.md:2486 |  |
| 173 | CONNECTED | GET | `/categories` | `/categories` | api | `app/categories/page.tsx:75` | fulldetailedapi.md:3968 |  |
| 174 | CONNECTED | POST | `/orders` | `/orders` | api | `app/checkout/checkout/page.tsx:149` | fulldetailedapi.md:4612 |  |
| 175 | CONNECTED | PUT | `/orders/${currentOrderId}/verify-payment` | `/orders/{param}/verify-payment` | api | `app/checkout/checkout/page.tsx:193` | fulldetailedapi.md:4815 |  |
| 176 | CONNECTED | POST | `/contact` | `/contact` | api | `app/contact/page.tsx:74` | backend report/live probe | Backend update: contact form API is supported. |
| 177 | CONNECTED | POST | `/contact-requests` | `/contact-requests` | api | `app/contact/page.tsx:82` | backend report/live probe | Backend update: contact request alias is supported. |
| 178 | CONNECTED | POST | `/author-applications` | `/author-applications` | api | `app/dashboard/become-author/page.tsx:112` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2564 |  |
| 179 | CONNECTED | GET | `/users/me/author-application` | `/users/me/author-application` | api | `app/dashboard/become-author/page.tsx:60` | fulldetailedapi.md:6591 |  |
| 180 | CONNECTED | GET | `/author-applications/me` | `/author-applications/me` | api | `app/dashboard/become-author/page.tsx:61` | backend report/live probe | Backend update: author application status alias is supported. |
| 181 | CONNECTED | GET | `/users/${userId}/library` | `/users/{param}/library` | api | `app/dashboard/library/page.tsx:37` | fulldetailedapi.md:9501 |  |
| 182 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/orders/page.tsx:338` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 183 | CONNECTED | GET | `/users/${userId}/shipments` | `/users/{param}/shipments` | api | `app/dashboard/orders/page.tsx:339` | fulldetailedapi.md:7877 |  |
| 184 | CONNECTED | PUT | `/orders/${orderId}/verify-payment` | `/orders/{param}/verify-payment` | api | `app/dashboard/orders/page.tsx:387` | fulldetailedapi.md:4815 |  |
| 185 | CONNECTED | GET | `/users/${userId}/invoices` | `/users/{param}/invoices` | api | `app/dashboard/orders/page.tsx:405` | fulldetailedapi.md:7328 |  |
| 186 | CONNECTED | GET | `/users/${userId}/invoices/${invoiceId}/download` | `/users/{param}/invoices/{param}/download` | api | `app/dashboard/orders/page.tsx:414` | fulldetailedapi.md:7701 |  |
| 187 | CONNECTED | GET | `/users/${userId}/orders?limit=3&sort=-createdAt` | `/users/{param}/orders` | api | `app/dashboard/page.tsx:83` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 188 | CONNECTED | GET | `/books?limit=4` | `/books` | api | `app/dashboard/page.tsx:84` | fulldetailedapi.md:2486 |  |
| 189 | CONNECTED | GET | `/users/${userId}/payments` | `/users/{param}/payments` | api | `app/dashboard/payments/page.tsx:155` | fulldetailedapi.md:6947 |  |
| 190 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/payments/page.tsx:164` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 191 | CONNECTED | GET | `/users/${userId}/invoices` | `/users/{param}/invoices` | api | `app/dashboard/payments/page.tsx:232` | fulldetailedapi.md:7328 |  |
| 192 | CONNECTED | GET | `/users/${userId}/invoices/${invoiceId}/download` | `/users/{param}/invoices/{param}/download` | api | `app/dashboard/payments/page.tsx:241` | fulldetailedapi.md:7701 |  |
| 193 | CONNECTED | PUT | `/users/me` | `/users/me` | api | `app/dashboard/profile/page.tsx:127` | backend report/live probe | Backend update: profile update alias is supported. |
| 194 | CONNECTED | PUT | `/auth/me` | `/auth/me` | api | `app/dashboard/profile/page.tsx:128` | backend report/live probe | Backend update: profile update alias is supported. |
| 195 | CONNECTED | GET | `/auth/me` | `/auth/me` | api | `app/dashboard/profile/page.tsx:55` | fulldetailedapi.md:1527 |  |
| 196 | CONNECTED | GET | `/users/me` | `/users/me` | api | `app/dashboard/profile/page.tsx:56` | fulldetailedapi.md:6077 |  |
| 197 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/profile/page.tsx:57` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 198 | CONNECTED | GET | `/authors/me/dashboard-access` | `/authors/me/dashboard-access` | api | `app/dashboard/purchase-access/page.tsx:30` | fulldetailedapi.md:10715 |  |
| 199 | CONNECTED | POST | `/authors/me/dashboard-access/purchase` | `/authors/me/dashboard-access/purchase` | api | `app/dashboard/purchase-access/page.tsx:59` | fulldetailedapi.md:10874 |  |
| 200 | CONNECTED | PUT | `/authors/me/dashboard-access/purchases/${purchaseId}/verify-payment` | `/authors/me/dashboard-access/purchases/{param}/verify-payment` | api | `app/dashboard/purchase-access/page.tsx:90` | fulldetailedapi.md:11033 |  |
| 201 | CONNECTED | GET | `/users/${userId}/wishlist` | `/users/{param}/wishlist` | api | `app/dashboard/wishlist/page.tsx:32` | fulldetailedapi.md:9149 |  |
| 202 | CONNECTED | DELETE | `/users/${userId}/wishlist/${id}` | `/users/{param}/wishlist/{param}` | api | `app/dashboard/wishlist/page.tsx:51` | fulldetailedapi.md:9669 |  |
| 203 | CONNECTED | GET | `/content` | `/content` | api | `app/faq/page.tsx:115` | fulldetailedapi.md:249 |  |
| 204 | CONNECTED | GET | `/books?featured=true&limit=8` | `/books` | api | `app/page.tsx:111` | fulldetailedapi.md:2486 |  |
| 205 | CONNECTED | GET | `/books?isFeatured=true&limit=8` | `/books` | api | `app/page.tsx:111` | fulldetailedapi.md:2486 |  |
| 206 | CONNECTED | GET | `/books?bestseller=true&limit=4` | `/books` | api | `app/page.tsx:112` | fulldetailedapi.md:2486 |  |
| 207 | CONNECTED | GET | `/books?sort=rating&limit=4` | `/books` | api | `app/page.tsx:112` | fulldetailedapi.md:2486 |  |
| 208 | CONNECTED | GET | `/categories?featured=true&limit=6` | `/categories` | api | `app/page.tsx:113` | fulldetailedapi.md:3968 |  |
| 209 | CONNECTED | GET | `/categories?limit=6` | `/categories` | api | `app/page.tsx:113` | fulldetailedapi.md:3968 |  |
| 210 | CONNECTED | GET | `/authors?limit=6` | `/authors` | api | `app/page.tsx:114` | fulldetailedapi.md:9845 |  |
| 211 | CONNECTED | GET | `/books?limit=1` | `/books` | api | `app/page.tsx:145` | fulldetailedapi.md:2486 |  |
| 212 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/page.tsx:146` | fulldetailedapi.md:9845 |  |
| 213 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/publish/page.tsx:230` | fulldetailedapi.md:9845 |  |
| 214 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `app/publish/page.tsx:244` | fulldetailedapi.md:13892 |  |
| 215 | CONNECTED | GET | `/search` | `/search` | api | `app/search/page.tsx:29` | fulldetailedapi.md:3761 |  |
| 216 | CONNECTED | GET | `${API_URL}/books?limit=1000` | `/books` | fetch | `app/sitemap.ts:10` | fulldetailedapi.md:2486 |  |
| 217 | CONNECTED | GET | `${API_URL}/categories?limit=100` | `/categories` | fetch | `app/sitemap.ts:14` | fulldetailedapi.md:3968 |  |
| 218 | CONNECTED | GET | `${API_URL}/authors?limit=1000` | `/authors` | fetch | `app/sitemap.ts:18` | fulldetailedapi.md:9845 |  |
| 219 | CONNECTED | POST | `/auth/google` | `/auth/google` | api | `components/auth/google-login-button.tsx:91` | fulldetailedapi.md:769 |  |
| 220 | CONNECTED | POST | `/users/${user._id \|\| user.id}/wishlist` | `/users/{param}/wishlist` | api | `components/books/book-card.tsx:104` | fulldetailedapi.md:9315 |  |
| 221 | CONNECTED | GET | `/users/me/orders` | `/users/me/orders` | api | `components/orders/recent-orders-section.tsx:25` | backend report/live probe | Backend report: supported reader order route. |
| 222 | CONNECTED | GET | `/content` | `/content` | api | `context/site-content-context.tsx:274` | fulldetailedapi.md:249 |  |
| 223 | CONNECTED | PUT | `/admin/content` | `/admin/content` | api | `context/site-content-context.tsx:302` | fulldetailedapi.md:14778 |  |
| 224 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/cancel` | `/admin/operations/payments/{param}/cancel` | api | `lib/admin-payments-api.ts:104` | fulldetailedapi.md:22992 |  |
| 225 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/expire` | `/admin/operations/payments/{param}/expire` | api | `lib/admin-payments-api.ts:114` | fulldetailedapi.md:23196 |  |
| 226 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/retry-verification` | `/admin/operations/payments/{param}/retry-verification` | api | `lib/admin-payments-api.ts:124` | fulldetailedapi.md:23400 |  |
| 227 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/recreate-qr` | `/admin/operations/payments/{param}/recreate-qr` | api | `lib/admin-payments-api.ts:134` | fulldetailedapi.md:23583 |  |
| 228 | CONNECTED | GET | `/admin/operations/payments` | `/admin/operations/payments` | api | `lib/admin-payments-api.ts:64` | fulldetailedapi.md:22182 |  |
| 229 | CONNECTED | GET | `/admin/operations/payments/${paymentId}` | `/admin/operations/payments/{param}` | api | `lib/admin-payments-api.ts:74` | fulldetailedapi.md:22404 |  |
| 230 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/approve` | `/admin/operations/payments/{param}/approve` | api | `lib/admin-payments-api.ts:84` | fulldetailedapi.md:22587 |  |
| 231 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/reject` | `/admin/operations/payments/{param}/reject` | api | `lib/admin-payments-api.ts:94` | fulldetailedapi.md:22791 |  |
| 232 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `lib/api.ts:131` | fulldetailedapi.md:29549 |  |
| 233 | CONNECTED | GET | `/categories` | `/categories` | api | `lib/api.ts:158` | fulldetailedapi.md:3968 |  |
| 234 | CONNECTED | POST | `${API_URL}/auth/refresh` | `/auth/refresh` | axios | `lib/api.ts:82` | fulldetailedapi.md:950 |  |
| 235 | CONNECTED | PUT | `/authors/me/books/${bookId}` | `/authors/me/books/{param}` | api | `lib/author-api.ts:105` | fulldetailedapi.md:12482 |  |
| 236 | CONNECTED | DELETE | `/authors/me/books/${bookId}` | `/authors/me/books/{param}` | api | `lib/author-api.ts:114` | fulldetailedapi.md:12668 |  |
| 237 | CONNECTED | POST | `/authors/me/books/${bookId}/submit` | `/authors/me/books/{param}/submit` | api | `lib/author-api.ts:123` | fulldetailedapi.md:12836 |  |
| 238 | CONNECTED | POST | `/authors/me/uploads/image` | `/authors/me/uploads/image` | api | `lib/author-api.ts:135` | fulldetailedapi.md:13194 |  |
| 239 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `lib/author-api.ts:138` | fulldetailedapi.md:5729 |  |
| 240 | CONNECTED | POST | `/authors/me/uploads/document` | `/authors/me/uploads/document` | api | `lib/author-api.ts:154` | fulldetailedapi.md:13025 |  |
| 241 | CONNECTED | POST | `/uploads/document` | `/uploads/document` | api | `lib/author-api.ts:157` | fulldetailedapi.md:5903 |  |
| 242 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `lib/author-api.ts:170` | fulldetailedapi.md:13892 |  |
| 243 | CONNECTED | GET | `/authors/me/dashboard-access` | `/authors/me/dashboard-access` | api | `lib/author-api.ts:179` | fulldetailedapi.md:10715 |  |
| 244 | CONNECTED | GET | `/authors/me/dashboard` | `/authors/me/dashboard` | api | `lib/author-api.ts:188` | fulldetailedapi.md:11219 |  |
| 245 | CONNECTED | GET | `/authors/me/analytics` | `/authors/me/analytics` | api | `lib/author-api.ts:197` | fulldetailedapi.md:11378 |  |
| 246 | CONNECTED | GET | `/authors/me/books/performance` | `/authors/me/books/performance` | api | `lib/author-api.ts:206` | fulldetailedapi.md:11564 |  |
| 247 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `lib/author-api.ts:215` | fulldetailedapi.md:11723 |  |
| 248 | CONNECTED | GET | `/authors/me/royalty-settlements` | `/authors/me/royalty-settlements` | api | `lib/author-api.ts:224` | fulldetailedapi.md:29708 |  |
| 249 | CONNECTED | GET | `/authors/me/royalty-settlements/${settlementId}` | `/authors/me/royalty-settlements/{param}` | api | `lib/author-api.ts:233` | fulldetailedapi.md:29895 |  |
| 250 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `lib/author-api.ts:45` | fulldetailedapi.md:29549 |  |
| 251 | CONNECTED | GET | `/users/me/author-application` | `/users/me/author-application` | api | `lib/author-api.ts:54` | fulldetailedapi.md:6591 |  |
| 252 | CONNECTED | POST | `/author-applications` | `/author-applications` | api | `lib/author-api.ts:63` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2564 |  |
| 253 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `lib/author-api.ts:78` | fulldetailedapi.md:11930 |  |
| 254 | CONNECTED | POST | `/authors/me/books` | `/authors/me/books` | api | `lib/author-api.ts:87` | fulldetailedapi.md:12133 |  |
| 255 | CONNECTED | GET | `/authors/me/books/${bookId}` | `/authors/me/books/{param}` | api | `lib/author-api.ts:96` | fulldetailedapi.md:12316 |  |
| 256 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `lib/categories.ts:106` | fulldetailedapi.md:18657 |  |
| 257 | CONNECTED | GET | `/categories` | `/categories` | api | `lib/categories.ts:29` | fulldetailedapi.md:3968 |  |
| 258 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `lib/categories.ts:30` | fulldetailedapi.md:18433 |  |

## Backend Request/Response Reference

- Canonical request and response examples live in `fulldetailedapi.md` at the `Backend Doc Source` line shown above.
- Additional route confirmations and workflow notes live in `HM_BACKEND_COMPLETE_HANDOVER (1).md` and `BACKEND_INTEGRATION_GUIDE.md`.
- Protected routes returning `401` without a token are considered connected if documented; send `Authorization: Bearer <token>`.