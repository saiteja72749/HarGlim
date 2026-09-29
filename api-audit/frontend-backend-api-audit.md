# Frontend API Connectivity Audit

Backend base: `https://harglimpublish-backend.onrender.com/api`

## Summary

- Frontend call sites: 237
- Unique normalized frontend endpoints: 141
- Connected call sites: 237
- Not connected call sites: 0
- Review-needed call sites: 0
- Connected unique endpoints: 141
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
| 7 | CONNECTED | GET | `/admin/analytics/dashboard` | `/admin/analytics/dashboard` | api | `app/admin/analytics/page.tsx:47` | fulldetailedapi.md:28085 |  |
| 8 | CONNECTED | GET | `/admin/author-access/purchases` | `/admin/author-access/purchases` | api | `app/admin/author-access/page.tsx:112` | fulldetailedapi.md:20475 |  |
| 9 | CONNECTED | POST | `/admin/author-access/entitlements/grant` | `/admin/author-access/entitlements/grant` | api | `app/admin/author-access/page.tsx:137` | fulldetailedapi.md:20869 |  |
| 10 | CONNECTED | POST | `/admin/author-access/entitlements/${userId}/revoke` | `/admin/author-access/entitlements/{param}/revoke` | api | `app/admin/author-access/page.tsx:157` | fulldetailedapi.md:21047 |  |
| 11 | CONNECTED | POST | `/admin/author-access/entitlements/${userId}/restore` | `/admin/author-access/entitlements/{param}/restore` | api | `app/admin/author-access/page.tsx:168` | fulldetailedapi.md:21233 |  |
| 12 | CONNECTED | POST | `/admin/author-access/plans` | `/admin/author-access/plans` | api | `app/admin/author-access/page.tsx:183` | fulldetailedapi.md:19768 |  |
| 13 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `app/admin/author-access/page.tsx:68` | fulldetailedapi.md:29549 |  |
| 14 | CONNECTED | GET | `/admin/author-access/entitlements` | `/admin/author-access/entitlements` | api | `app/admin/author-access/page.tsx:84` | fulldetailedapi.md:20672 |  |
| 15 | CONNECTED | GET | `/admin/author-access/plans` | `/admin/author-access/plans` | api | `app/admin/author-access/page.tsx:98` | fulldetailedapi.md:19611 |  |
| 16 | CONNECTED | GET | `/admin/author-applications` | `/admin/author-applications` | api | `app/admin/author-applications/page.tsx:51` | HM_BACKEND_COMPLETE_HANDOVER (1).md:983 |  |
| 17 | CONNECTED | PUT | `/admin/author-applications/${id}/status` | `/admin/author-applications/{param}/status` | api | `app/admin/author-applications/page.tsx:69` | HM_BACKEND_COMPLETE_HANDOVER (1).md:675 |  |
| 18 | CONNECTED | PUT | `/admin/author-applications/${id}/status` | `/admin/author-applications/{param}/status` | api | `app/admin/author-applications/page.tsx:86` | HM_BACKEND_COMPLETE_HANDOVER (1).md:675 |  |
| 19 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/authors/page.tsx:52` | fulldetailedapi.md:15014 |  |
| 20 | CONNECTED | GET | `/users` | `/users` | api | `app/admin/authors/page.tsx:53` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 21 | CONNECTED | GET | `/admin/authors/${aId}` | `/admin/authors/{param}` | api | `app/admin/authors/page.tsx:86` | fulldetailedapi.md:30240 |  |
| 22 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/[id]/page.tsx:126` | fulldetailedapi.md:15014 |  |
| 23 | CONNECTED | GET | `/admin/books/${bookId}` | `/admin/books/{param}` | api | `app/admin/books/[id]/page.tsx:168` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 24 | CONNECTED | GET | `/books/${bookId}` | `/books/{param}` | api | `app/admin/books/[id]/page.tsx:175` | fulldetailedapi.md:2743 |  |
| 25 | CONNECTED | GET | `/books?limit=100` | `/books` | api | `app/admin/books/[id]/page.tsx:183` | fulldetailedapi.md:2486 |  |
| 26 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/[id]/page.tsx:357` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 27 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/books/[id]/page.tsx:399` | fulldetailedapi.md:5729 |  |
| 28 | CONNECTED | POST | `/uploads/publishing-image` | `/uploads/publishing-image` | api | `app/admin/books/[id]/page.tsx:401` | fulldetailedapi.md:13537 |  |
| 29 | CONNECTED | PUT | `/admin/books/${bookId}` | `/admin/books/{param}` | api | `app/admin/books/[id]/page.tsx:454` | fulldetailedapi.md:18077 |  |
| 30 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/books/[id]/page.tsx:95` | fulldetailedapi.md:18657 |  |
| 31 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `app/admin/books/new/page.tsx:121` | fulldetailedapi.md:18433 |  |
| 32 | CONNECTED | GET | `/categories` | `/categories` | api | `app/admin/books/new/page.tsx:121` | fulldetailedapi.md:3968 |  |
| 33 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:144` | fulldetailedapi.md:15014 |  |
| 34 | CONNECTED | PATCH | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:274` | fulldetailedapi.md:15595 |  |
| 35 | CONNECTED | PUT | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:275` | fulldetailedapi.md:15795 |  |
| 36 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:291` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 37 | CONNECTED | PUT | `/admin/users/${newUserId}` | `/admin/users/{param}` | api | `app/admin/books/new/page.tsx:317` | fulldetailedapi.md:15385 |  |
| 38 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/books/new/page.tsx:329` | fulldetailedapi.md:15014 |  |
| 39 | CONNECTED | PATCH | `/admin/users/${finalAuthorId}/role` | `/admin/users/{param}/role` | api | `app/admin/books/new/page.tsx:338` | fulldetailedapi.md:15595 |  |
| 40 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/books/new/page.tsx:365` | fulldetailedapi.md:5729 |  |
| 41 | CONNECTED | POST | `/admin/books` | `/admin/books` | api | `app/admin/books/new/page.tsx:416` | fulldetailedapi.md:17887 |  |
| 42 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/books/new/page.tsx:62` | fulldetailedapi.md:18657 |  |
| 43 | CONNECTED | GET | `/admin/books` | `/admin/books` | api | `app/admin/books/page.tsx:108` | fulldetailedapi.md:17636 |  |
| 44 | CONNECTED | GET | `/books` | `/books` | api | `app/admin/books/page.tsx:109` | fulldetailedapi.md:2486 |  |
| 45 | CONNECTED | DELETE | `/admin/books/${id}` | `/admin/books/{param}` | api | `app/admin/books/page.tsx:161` | fulldetailedapi.md:18265 |  |
| 46 | CONNECTED | PUT | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:127` | fulldetailedapi.md:19032 |  |
| 47 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `app/admin/categories/page.tsx:130` | fulldetailedapi.md:18657 |  |
| 48 | CONNECTED | PATCH | `/admin/categories/${catId}/status` | `/admin/categories/{param}/status` | api | `app/admin/categories/page.tsx:150` | fulldetailedapi.md:19412 |  |
| 49 | CONNECTED | PUT | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:151` | fulldetailedapi.md:19032 |  |
| 50 | CONNECTED | DELETE | `/admin/categories/${catId}` | `/admin/categories/{param}` | api | `app/admin/categories/page.tsx:173` | fulldetailedapi.md:19231 |  |
| 51 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `app/admin/categories/page.tsx:64` | fulldetailedapi.md:18433 |  |
| 52 | CONNECTED | GET | `/categories` | `/categories` | api | `app/admin/categories/page.tsx:65` | fulldetailedapi.md:3968 |  |
| 53 | CONNECTED | PATCH | `/users/me` | `/users/me` | api | `app/admin/content/page.tsx:103` | backend report/live probe | Backend update: profile update alias is supported. |
| 54 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `app/admin/content/page.tsx:70` | fulldetailedapi.md:5729 |  |
| 55 | CONNECTED | POST | `/authors/me/uploads/image` | `/authors/me/uploads/image` | api | `app/admin/content/page.tsx:73` | fulldetailedapi.md:13194 |  |
| 56 | CONNECTED | GET | `/admin/operations/inventory/low-stock` | `/admin/operations/inventory/low-stock` | api | `app/admin/inventory/page.tsx:45` | fulldetailedapi.md:24028 |  |
| 57 | CONNECTED | GET | `/books` | `/books` | api | `app/admin/inventory/page.tsx:49` | fulldetailedapi.md:2486 |  |
| 58 | CONNECTED | GET | `/admin/operations/inventory/reservations` | `/admin/operations/inventory/reservations` | api | `app/admin/inventory/page.tsx:65` | fulldetailedapi.md:23785 |  |
| 59 | CONNECTED | GET | `/admin/operations/ledger/timeline` | `/admin/operations/ledger/timeline` | api | `app/admin/inventory/page.tsx:79` | fulldetailedapi.md:24732 |  |
| 60 | CONNECTED | GET | `/admin/invoices/search` | `/admin/invoices/search` | api | `app/admin/invoices/page.tsx:42` | fulldetailedapi.md:24959 |  |
| 61 | CONNECTED | GET | `/admin/invoices` | `/admin/invoices` | api | `app/admin/invoices/page.tsx:43` | fulldetailedapi.md:25212 |  |
| 62 | CONNECTED | GET | `/admin/invoices` | `/admin/invoices` | api | `app/admin/invoices/page.tsx:46` | fulldetailedapi.md:25212 |  |
| 63 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/invoices/page.tsx:53` | fulldetailedapi.md:16386 |  |
| 64 | CONNECTED | GET | `/admin/invoices/${invId}/download` | `/admin/invoices/{param}/download` | api | `app/admin/invoices/page.tsx:86` | fulldetailedapi.md:25449 |  |
| 65 | CONNECTED | POST | `/admin/publish-requests/${id}/approve` | `/admin/publish-requests/{param}/approve` | api | `app/admin/manuscripts/page.tsx:135` | fulldetailedapi.md:17450 |  |
| 66 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:136` | fulldetailedapi.md:16891 |  |
| 67 | CONNECTED | POST | `/admin/publish-requests/${id}/reject` | `/admin/publish-requests/{param}/reject` | api | `app/admin/manuscripts/page.tsx:140` | fulldetailedapi.md:17264 |  |
| 68 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:141` | fulldetailedapi.md:16891 |  |
| 69 | CONNECTED | POST | `/admin/publish-requests/${id}/request-changes` | `/admin/publish-requests/{param}/request-changes` | api | `app/admin/manuscripts/page.tsx:144` | fulldetailedapi.md:17078 |  |
| 70 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:145` | fulldetailedapi.md:16891 |  |
| 71 | CONNECTED | PUT | `/admin/publish-requests/${id}/status` | `/admin/publish-requests/{param}/status` | api | `app/admin/manuscripts/page.tsx:148` | fulldetailedapi.md:16891 |  |
| 72 | CONNECTED | GET | `/admin/publish-requests` | `/admin/publish-requests` | api | `app/admin/manuscripts/page.tsx:92` | fulldetailedapi.md:16732 |  |
| 73 | CONNECTED | GET | `/admin/notifications/search` | `/admin/notifications/search` | api | `app/admin/notifications/page.tsx:37` | fulldetailedapi.md:25797 |  |
| 74 | CONNECTED | GET | `/admin/notifications` | `/admin/notifications` | api | `app/admin/notifications/page.tsx:38` | fulldetailedapi.md:26056 |  |
| 75 | CONNECTED | GET | `/admin/notifications` | `/admin/notifications` | api | `app/admin/notifications/page.tsx:41` | fulldetailedapi.md:26056 |  |
| 76 | CONNECTED | POST | `/admin/notifications/${notificationId}/retry` | `/admin/notifications/{param}/retry` | api | `app/admin/notifications/page.tsx:62` | fulldetailedapi.md:26479 |  |
| 77 | CONNECTED | GET | `/admin/orders` | `/admin/orders` | api | `app/admin/orders/page.tsx:226` | fulldetailedapi.md:16386 |  |
| 78 | CONNECTED | POST | `/admin/operations/payments/${paymentMongoId}/approve` | `/admin/operations/payments/{param}/approve` | api | `app/admin/orders/page.tsx:250` | fulldetailedapi.md:22587 |  |
| 79 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:267` | fulldetailedapi.md:16545 |  |
| 80 | CONNECTED | POST | `/admin/operations/payments/${paymentMongoId}/reject` | `/admin/operations/payments/{param}/reject` | api | `app/admin/orders/page.tsx:285` | fulldetailedapi.md:22791 |  |
| 81 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:289` | fulldetailedapi.md:16545 |  |
| 82 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:313` | fulldetailedapi.md:16545 |  |
| 83 | CONNECTED | PUT | `/admin/orders/${orderMongoId}/status` | `/admin/orders/{param}/status` | api | `app/admin/orders/page.tsx:359` | fulldetailedapi.md:16545 |  |
| 84 | CONNECTED | GET | `/admin/dashboard` | `/admin/dashboard` | api | `app/admin/page.tsx:31` | fulldetailedapi.md:30069 |  |
| 85 | CONNECTED | GET | `/admin/reviews` | `/admin/reviews` | api | `app/admin/reviews/page.tsx:40` | fulldetailedapi.md:14206 |  |
| 86 | CONNECTED | GET | `/reviews` | `/reviews` | api | `app/admin/reviews/page.tsx:41` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 87 | CONNECTED | PATCH | `/admin/reviews/${reviewId}/status` | `/admin/reviews/{param}/status` | api | `app/admin/reviews/page.tsx:61` | fulldetailedapi.md:14411 |  |
| 88 | CONNECTED | DELETE | `/admin/reviews/${reviewId}` | `/admin/reviews/{param}` | api | `app/admin/reviews/page.tsx:78` | fulldetailedapi.md:14610 |  |
| 89 | CONNECTED | POST | `/admin/royalty-settlements/preview` | `/admin/royalty-settlements/preview` | api | `app/admin/settlements/page.tsx:111` | fulldetailedapi.md:30585 |  |
| 90 | CONNECTED | POST | `/admin/royalty-settlements` | `/admin/royalty-settlements` | api | `app/admin/settlements/page.tsx:136` | fulldetailedapi.md:30770 |  |
| 91 | CONNECTED | POST | `/admin/royalty-settlements/${id}/approve` | `/admin/royalty-settlements/{param}/approve` | api | `app/admin/settlements/page.tsx:150` | fulldetailedapi.md:31330 |  |
| 92 | CONNECTED | POST | `/admin/royalty-settlements/${id}/mark-paid` | `/admin/royalty-settlements/{param}/mark-paid` | api | `app/admin/settlements/page.tsx:179` | fulldetailedapi.md:31504 |  |
| 93 | CONNECTED | POST | `/admin/royalty-settlements/${id}/cancel` | `/admin/royalty-settlements/{param}/cancel` | api | `app/admin/settlements/page.tsx:196` | fulldetailedapi.md:31699 |  |
| 94 | CONNECTED | GET | `/admin/royalty-settlements` | `/admin/royalty-settlements` | api | `app/admin/settlements/page.tsx:64` | fulldetailedapi.md:30953 |  |
| 95 | CONNECTED | GET | `/authors` | `/authors` | api | `app/admin/settlements/page.tsx:79` | fulldetailedapi.md:9845 |  |
| 96 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/settlements/page.tsx:80` | fulldetailedapi.md:15014 |  |
| 97 | CONNECTED | POST | `/admin/shipments/${shipmentId}/assign-courier` | `/admin/shipments/{param}/assign-courier` | api | `app/admin/shipments/page.tsx:170` | fulldetailedapi.md:27516 |  |
| 98 | CONNECTED | POST | `/admin/shipments/${shipmentId}/update-status` | `/admin/shipments/{param}/update-status` | api | `app/admin/shipments/page.tsx:188` | fulldetailedapi.md:27708 |  |
| 99 | CONNECTED | POST | `/admin/shipments/${sId}/cancel` | `/admin/shipments/{param}/cancel` | api | `app/admin/shipments/page.tsx:208` | fulldetailedapi.md:27897 |  |
| 100 | CONNECTED | GET | `/admin/shipments/search` | `/admin/shipments/search` | api | `app/admin/shipments/page.tsx:76` | fulldetailedapi.md:26678 |  |
| 101 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/shipments/page.tsx:77` | fulldetailedapi.md:26935 |  |
| 102 | CONNECTED | GET | `/admin/shipments` | `/admin/shipments` | api | `app/admin/shipments/page.tsx:80` | fulldetailedapi.md:26935 |  |
| 103 | CONNECTED | POST | `/admin/users` | `/admin/users` | api | `app/admin/users/page.tsx:157` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 104 | CONNECTED | POST | `/admin/users/${targetUserId}/reset-password` | `/admin/users/{param}/reset-password` | api | `app/admin/users/page.tsx:222` | fulldetailedapi.md:16191 |  |
| 105 | CONNECTED | DELETE | `/admin/users/${id}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:251` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 106 | CONNECTED | PUT | `/admin/users/${userId}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:288` | fulldetailedapi.md:15385 |  |
| 107 | CONNECTED | PATCH | `/admin/users/${userId}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:289` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 108 | CONNECTED | PUT | `/users/${userId}` | `/users/{param}` | api | `app/admin/users/page.tsx:290` | fulldetailedapi.md:6404 |  |
| 109 | CONNECTED | PUT | `/admin/users/${id}/status` | `/admin/users/{param}/status` | api | `app/admin/users/page.tsx:309` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 110 | CONNECTED | PUT | `/admin/users/${id}` | `/admin/users/{param}` | api | `app/admin/users/page.tsx:313` | fulldetailedapi.md:15385 |  |
| 111 | CONNECTED | GET | `/admin/users` | `/admin/users` | api | `app/admin/users/page.tsx:96` | fulldetailedapi.md:15014 |  |
| 112 | CONNECTED | GET | `/users` | `/users` | api | `app/admin/users/page.tsx:97` | backend report/live probe | Live probe: route exists and returns 401 without token. |
| 113 | CONNECTED | GET | `/authors/me/analytics` | `/authors/me/analytics` | api | `app/author/analytics/page.tsx:32` | fulldetailedapi.md:11378 |  |
| 114 | CONNECTED | GET | `/authors/me/books/performance` | `/authors/me/books/performance` | api | `app/author/analytics/page.tsx:33` | fulldetailedapi.md:11564 |  |
| 115 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `app/author/analytics/page.tsx:34` | fulldetailedapi.md:11723 |  |
| 116 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/books/page.tsx:30` | fulldetailedapi.md:11930 |  |
| 117 | CONNECTED | GET | `/books` | `/books` | api | `app/author/books/page.tsx:38` | fulldetailedapi.md:2486 |  |
| 118 | CONNECTED | POST | `/authors/me/uploads/document` | `/authors/me/uploads/document` | api | `app/author/manuscripts/new/page.tsx:146` | fulldetailedapi.md:13025 |  |
| 119 | CONNECTED | POST | `/publish-requests` | `/publish-requests` | api | `app/author/manuscripts/new/page.tsx:181` | fulldetailedapi.md:13711 |  |
| 120 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `app/author/manuscripts/new/page.tsx:68` | fulldetailedapi.md:13892 |  |
| 121 | CONNECTED | DELETE | `/authors/me/books/${id}` | `/authors/me/books/{param}` | api | `app/author/manuscripts/page.tsx:118` | fulldetailedapi.md:12668 |  |
| 122 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `app/author/manuscripts/page.tsx:82` | fulldetailedapi.md:11930 |  |
| 123 | CONNECTED | GET | `/authors/me/dashboard` | `/authors/me/dashboard` | api | `app/author/page.tsx:31` | fulldetailedapi.md:11219 |  |
| 124 | CONNECTED | GET | `/authors/${authorId}/stats` | `/authors/{param}/stats` | api | `app/author/page.tsx:32` | fulldetailedapi.md:10379 |  |
| 125 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `app/author/royalties/page.tsx:25` | fulldetailedapi.md:11723 |  |
| 126 | CONNECTED | GET | `/authors/me/royalty-settlements` | `/authors/me/royalty-settlements` | api | `app/author/royalties/page.tsx:26` | fulldetailedapi.md:29708 |  |
| 127 | CONNECTED | POST | `/uploads/publishing-image` | `/uploads/publishing-image` | api | `app/author/settings/page.tsx:166` | fulldetailedapi.md:13537 |  |
| 128 | CONNECTED | POST | `/authors/me/uploads/image` | `/authors/me/uploads/image` | api | `app/author/settings/page.tsx:171` | fulldetailedapi.md:13194 |  |
| 129 | CONNECTED | PUT | `/users/${authorId}` | `/users/{param}` | api | `app/author/settings/page.tsx:193` | fulldetailedapi.md:6404 |  |
| 130 | CONNECTED | PUT | `/authors/${authorId}` | `/authors/{param}` | api | `app/author/settings/page.tsx:236` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 131 | CONNECTED | GET | `/authors/${authorId}` | `/authors/{param}` | api | `app/author/settings/page.tsx:79` | fulldetailedapi.md:10022 |  |
| 132 | CONNECTED | GET | `${API_URL}/authors/${id}` | `/authors/{param}` | fetch | `app/authors/[id]/layout.tsx:11` | fulldetailedapi.md:10022 |  |
| 133 | CONNECTED | GET | `/users/${params.id}` | `/users/{param}` | api | `app/authors/[id]/page.tsx:63` | backend report/live probe | Backend update: all latest frontend audit endpoints are supported. |
| 134 | CONNECTED | GET | `/authors` | `/authors` | api | `app/authors/[id]/page.tsx:65` | fulldetailedapi.md:9845 |  |
| 135 | CONNECTED | GET | `/authors/${params.id}/books` | `/authors/{param}/books` | api | `app/authors/[id]/page.tsx:86` | fulldetailedapi.md:10186 |  |
| 136 | CONNECTED | GET | `/books` | `/books` | api | `app/authors/[id]/page.tsx:87` | fulldetailedapi.md:2486 |  |
| 137 | CONNECTED | GET | `/authors` | `/authors` | api | `app/authors/page.tsx:43` | fulldetailedapi.md:9845 |  |
| 138 | CONNECTED | GET | `${API_URL}/books/${slug}` | `/books/{param}` | fetch | `app/books/[slug]/layout.tsx:11` | fulldetailedapi.md:2743 |  |
| 139 | CONNECTED | PUT | `/books/${params.slug}/reviews/${editingReviewId}` | `/books/{param}/reviews/{param}` | api | `app/books/[slug]/page.tsx:106` | fulldetailedapi.md:3336 |  |
| 140 | CONNECTED | POST | `/books/${params.slug}/reviews` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:112` | fulldetailedapi.md:3115 |  |
| 141 | CONNECTED | DELETE | `/books/${params.slug}/reviews/${reviewId}` | `/books/{param}/reviews/{param}` | api | `app/books/[slug]/page.tsx:142` | fulldetailedapi.md:3563 |  |
| 142 | CONNECTED | GET | `/books/${params.slug}` | `/books/{param}` | api | `app/books/[slug]/page.tsx:162` | fulldetailedapi.md:2743 |  |
| 143 | CONNECTED | GET | `/books/${params.slug}/related?limit=4` | `/books/{param}/related` | api | `app/books/[slug]/page.tsx:163` | fulldetailedapi.md:2929 |  |
| 144 | CONNECTED | GET | `/books/${params.slug}/reviews?page=1&limit=20` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:164` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2553 |  |
| 145 | CONNECTED | GET | `/users/me/orders` | `/users/me/orders` | api | `app/books/[slug]/page.tsx:205` | backend report/live probe | Backend report: supported reader order route. |
| 146 | CONNECTED | GET | `/books/${params.slug}/reviews?page=1&limit=20` | `/books/{param}/reviews` | api | `app/books/[slug]/page.tsx:87` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2553 |  |
| 147 | CONNECTED | GET | `/books` | `/books` | api | `app/books/page.tsx:135` | fulldetailedapi.md:2486 |  |
| 148 | CONNECTED | GET | `${API_URL}/categories/${slug}` | `/categories/{param}` | fetch | `app/categories/[slug]/layout.tsx:11` | fulldetailedapi.md:4203 |  |
| 149 | CONNECTED | GET | `/categories/${slug}` | `/categories/{param}` | api | `app/categories/[slug]/page.tsx:38` | fulldetailedapi.md:4203 |  |
| 150 | CONNECTED | GET | `/categories/${slug}/books` | `/categories/{param}/books` | api | `app/categories/[slug]/page.tsx:39` | fulldetailedapi.md:4393 |  |
| 151 | CONNECTED | GET | `/books` | `/books` | api | `app/categories/[slug]/page.tsx:40` | fulldetailedapi.md:2486 |  |
| 152 | CONNECTED | GET | `/categories` | `/categories` | api | `app/categories/page.tsx:75` | fulldetailedapi.md:3968 |  |
| 153 | CONNECTED | POST | `/orders` | `/orders` | api | `app/checkout/checkout/page.tsx:149` | fulldetailedapi.md:4612 |  |
| 154 | CONNECTED | PUT | `/orders/${currentOrderId}/verify-payment` | `/orders/{param}/verify-payment` | api | `app/checkout/checkout/page.tsx:193` | fulldetailedapi.md:4815 |  |
| 155 | CONNECTED | POST | `/contact` | `/contact` | api | `app/contact/page.tsx:74` | backend report/live probe | Backend update: contact form API is supported. |
| 156 | CONNECTED | POST | `/contact-requests` | `/contact-requests` | api | `app/contact/page.tsx:82` | backend report/live probe | Backend update: contact request alias is supported. |
| 157 | CONNECTED | POST | `/author-applications` | `/author-applications` | api | `app/dashboard/become-author/page.tsx:112` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2564 |  |
| 158 | CONNECTED | GET | `/users/me/author-application` | `/users/me/author-application` | api | `app/dashboard/become-author/page.tsx:60` | fulldetailedapi.md:6591 |  |
| 159 | CONNECTED | GET | `/author-applications/me` | `/author-applications/me` | api | `app/dashboard/become-author/page.tsx:61` | backend report/live probe | Backend update: author application status alias is supported. |
| 160 | CONNECTED | GET | `/users/${userId}/library` | `/users/{param}/library` | api | `app/dashboard/library/page.tsx:37` | fulldetailedapi.md:9501 |  |
| 161 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/orders/page.tsx:338` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 162 | CONNECTED | GET | `/users/${userId}/shipments` | `/users/{param}/shipments` | api | `app/dashboard/orders/page.tsx:339` | fulldetailedapi.md:7877 |  |
| 163 | CONNECTED | PUT | `/orders/${orderId}/verify-payment` | `/orders/{param}/verify-payment` | api | `app/dashboard/orders/page.tsx:387` | fulldetailedapi.md:4815 |  |
| 164 | CONNECTED | GET | `/users/${userId}/invoices` | `/users/{param}/invoices` | api | `app/dashboard/orders/page.tsx:405` | fulldetailedapi.md:7328 |  |
| 165 | CONNECTED | GET | `/users/${userId}/invoices/${invoiceId}/download` | `/users/{param}/invoices/{param}/download` | api | `app/dashboard/orders/page.tsx:414` | fulldetailedapi.md:7701 |  |
| 166 | CONNECTED | GET | `/users/${userId}/orders?limit=3&sort=-createdAt` | `/users/{param}/orders` | api | `app/dashboard/page.tsx:83` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 167 | CONNECTED | GET | `/books?limit=4` | `/books` | api | `app/dashboard/page.tsx:84` | fulldetailedapi.md:2486 |  |
| 168 | CONNECTED | GET | `/users/${userId}/payments` | `/users/{param}/payments` | api | `app/dashboard/payments/page.tsx:155` | fulldetailedapi.md:6947 |  |
| 169 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/payments/page.tsx:164` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 170 | CONNECTED | GET | `/users/${userId}/invoices` | `/users/{param}/invoices` | api | `app/dashboard/payments/page.tsx:232` | fulldetailedapi.md:7328 |  |
| 171 | CONNECTED | GET | `/users/${userId}/invoices/${invoiceId}/download` | `/users/{param}/invoices/{param}/download` | api | `app/dashboard/payments/page.tsx:241` | fulldetailedapi.md:7701 |  |
| 172 | CONNECTED | PUT | `/users/me` | `/users/me` | api | `app/dashboard/profile/page.tsx:127` | backend report/live probe | Backend update: profile update alias is supported. |
| 173 | CONNECTED | PUT | `/auth/me` | `/auth/me` | api | `app/dashboard/profile/page.tsx:128` | backend report/live probe | Backend update: profile update alias is supported. |
| 174 | CONNECTED | GET | `/auth/me` | `/auth/me` | api | `app/dashboard/profile/page.tsx:55` | fulldetailedapi.md:1527 |  |
| 175 | CONNECTED | GET | `/users/me` | `/users/me` | api | `app/dashboard/profile/page.tsx:56` | fulldetailedapi.md:6077 |  |
| 176 | CONNECTED | GET | `/users/${userId}/orders` | `/users/{param}/orders` | api | `app/dashboard/profile/page.tsx:57` | HM_BACKEND_COMPLETE_HANDOVER (1).md:628 |  |
| 177 | CONNECTED | GET | `/authors/me/dashboard-access` | `/authors/me/dashboard-access` | api | `app/dashboard/purchase-access/page.tsx:30` | fulldetailedapi.md:10715 |  |
| 178 | CONNECTED | POST | `/authors/me/dashboard-access/purchase` | `/authors/me/dashboard-access/purchase` | api | `app/dashboard/purchase-access/page.tsx:59` | fulldetailedapi.md:10874 |  |
| 179 | CONNECTED | PUT | `/authors/me/dashboard-access/purchases/${purchaseId}/verify-payment` | `/authors/me/dashboard-access/purchases/{param}/verify-payment` | api | `app/dashboard/purchase-access/page.tsx:90` | fulldetailedapi.md:11033 |  |
| 180 | CONNECTED | GET | `/users/${userId}/wishlist` | `/users/{param}/wishlist` | api | `app/dashboard/wishlist/page.tsx:32` | fulldetailedapi.md:9149 |  |
| 181 | CONNECTED | DELETE | `/users/${userId}/wishlist/${id}` | `/users/{param}/wishlist/{param}` | api | `app/dashboard/wishlist/page.tsx:51` | fulldetailedapi.md:9669 |  |
| 182 | CONNECTED | GET | `/content` | `/content` | api | `app/faq/page.tsx:115` | fulldetailedapi.md:249 |  |
| 183 | CONNECTED | GET | `/books?featured=true&limit=8` | `/books` | api | `app/page.tsx:111` | fulldetailedapi.md:2486 |  |
| 184 | CONNECTED | GET | `/books?isFeatured=true&limit=8` | `/books` | api | `app/page.tsx:111` | fulldetailedapi.md:2486 |  |
| 185 | CONNECTED | GET | `/books?bestseller=true&limit=4` | `/books` | api | `app/page.tsx:112` | fulldetailedapi.md:2486 |  |
| 186 | CONNECTED | GET | `/books?sort=rating&limit=4` | `/books` | api | `app/page.tsx:112` | fulldetailedapi.md:2486 |  |
| 187 | CONNECTED | GET | `/categories?featured=true&limit=6` | `/categories` | api | `app/page.tsx:113` | fulldetailedapi.md:3968 |  |
| 188 | CONNECTED | GET | `/categories?limit=6` | `/categories` | api | `app/page.tsx:113` | fulldetailedapi.md:3968 |  |
| 189 | CONNECTED | GET | `/authors?limit=6` | `/authors` | api | `app/page.tsx:114` | fulldetailedapi.md:9845 |  |
| 190 | CONNECTED | GET | `/books?limit=1` | `/books` | api | `app/page.tsx:145` | fulldetailedapi.md:2486 |  |
| 191 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/page.tsx:146` | fulldetailedapi.md:9845 |  |
| 192 | CONNECTED | GET | `/authors?limit=1` | `/authors` | api | `app/publish/page.tsx:230` | fulldetailedapi.md:9845 |  |
| 193 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `app/publish/page.tsx:244` | fulldetailedapi.md:13892 |  |
| 194 | CONNECTED | GET | `/search` | `/search` | api | `app/search/page.tsx:29` | fulldetailedapi.md:3761 |  |
| 195 | CONNECTED | GET | `${API_URL}/books?limit=1000` | `/books` | fetch | `app/sitemap.ts:10` | fulldetailedapi.md:2486 |  |
| 196 | CONNECTED | GET | `${API_URL}/categories?limit=100` | `/categories` | fetch | `app/sitemap.ts:14` | fulldetailedapi.md:3968 |  |
| 197 | CONNECTED | GET | `${API_URL}/authors?limit=1000` | `/authors` | fetch | `app/sitemap.ts:18` | fulldetailedapi.md:9845 |  |
| 198 | CONNECTED | POST | `/auth/google` | `/auth/google` | api | `components/auth/google-login-button.tsx:91` | fulldetailedapi.md:769 |  |
| 199 | CONNECTED | POST | `/users/${user._id \|\| user.id}/wishlist` | `/users/{param}/wishlist` | api | `components/books/book-card.tsx:104` | fulldetailedapi.md:9315 |  |
| 200 | CONNECTED | GET | `/users/me/orders` | `/users/me/orders` | api | `components/orders/recent-orders-section.tsx:25` | backend report/live probe | Backend report: supported reader order route. |
| 201 | CONNECTED | GET | `/content` | `/content` | api | `context/site-content-context.tsx:274` | fulldetailedapi.md:249 |  |
| 202 | CONNECTED | PUT | `/admin/content` | `/admin/content` | api | `context/site-content-context.tsx:302` | fulldetailedapi.md:14778 |  |
| 203 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/cancel` | `/admin/operations/payments/{param}/cancel` | api | `lib/admin-payments-api.ts:104` | fulldetailedapi.md:22992 |  |
| 204 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/expire` | `/admin/operations/payments/{param}/expire` | api | `lib/admin-payments-api.ts:114` | fulldetailedapi.md:23196 |  |
| 205 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/retry-verification` | `/admin/operations/payments/{param}/retry-verification` | api | `lib/admin-payments-api.ts:124` | fulldetailedapi.md:23400 |  |
| 206 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/recreate-qr` | `/admin/operations/payments/{param}/recreate-qr` | api | `lib/admin-payments-api.ts:134` | fulldetailedapi.md:23583 |  |
| 207 | CONNECTED | GET | `/admin/operations/payments` | `/admin/operations/payments` | api | `lib/admin-payments-api.ts:64` | fulldetailedapi.md:22182 |  |
| 208 | CONNECTED | GET | `/admin/operations/payments/${paymentId}` | `/admin/operations/payments/{param}` | api | `lib/admin-payments-api.ts:74` | fulldetailedapi.md:22404 |  |
| 209 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/approve` | `/admin/operations/payments/{param}/approve` | api | `lib/admin-payments-api.ts:84` | fulldetailedapi.md:22587 |  |
| 210 | CONNECTED | POST | `/admin/operations/payments/${paymentId}/reject` | `/admin/operations/payments/{param}/reject` | api | `lib/admin-payments-api.ts:94` | fulldetailedapi.md:22791 |  |
| 211 | CONNECTED | POST | `${API_URL}/auth/refresh` | `/auth/refresh` | axios | `lib/api.ts:154` | fulldetailedapi.md:950 |  |
| 212 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `lib/api.ts:213` | fulldetailedapi.md:29549 |  |
| 213 | CONNECTED | GET | `/categories` | `/categories` | api | `lib/api.ts:240` | fulldetailedapi.md:3968 |  |
| 214 | CONNECTED | PUT | `/authors/me/books/${bookId}` | `/authors/me/books/{param}` | api | `lib/author-api.ts:105` | fulldetailedapi.md:12482 |  |
| 215 | CONNECTED | DELETE | `/authors/me/books/${bookId}` | `/authors/me/books/{param}` | api | `lib/author-api.ts:114` | fulldetailedapi.md:12668 |  |
| 216 | CONNECTED | POST | `/authors/me/books/${bookId}/submit` | `/authors/me/books/{param}/submit` | api | `lib/author-api.ts:123` | fulldetailedapi.md:12836 |  |
| 217 | CONNECTED | POST | `/authors/me/uploads/image` | `/authors/me/uploads/image` | api | `lib/author-api.ts:135` | fulldetailedapi.md:13194 |  |
| 218 | CONNECTED | POST | `/uploads/image` | `/uploads/image` | api | `lib/author-api.ts:138` | fulldetailedapi.md:5729 |  |
| 219 | CONNECTED | POST | `/authors/me/uploads/document` | `/authors/me/uploads/document` | api | `lib/author-api.ts:154` | fulldetailedapi.md:13025 |  |
| 220 | CONNECTED | POST | `/uploads/document` | `/uploads/document` | api | `lib/author-api.ts:157` | fulldetailedapi.md:5903 |  |
| 221 | CONNECTED | GET | `/publish-packages` | `/publish-packages` | api | `lib/author-api.ts:170` | fulldetailedapi.md:13892 |  |
| 222 | CONNECTED | GET | `/authors/me/dashboard-access` | `/authors/me/dashboard-access` | api | `lib/author-api.ts:179` | fulldetailedapi.md:10715 |  |
| 223 | CONNECTED | GET | `/authors/me/dashboard` | `/authors/me/dashboard` | api | `lib/author-api.ts:188` | fulldetailedapi.md:11219 |  |
| 224 | CONNECTED | GET | `/authors/me/analytics` | `/authors/me/analytics` | api | `lib/author-api.ts:197` | fulldetailedapi.md:11378 |  |
| 225 | CONNECTED | GET | `/authors/me/books/performance` | `/authors/me/books/performance` | api | `lib/author-api.ts:206` | fulldetailedapi.md:11564 |  |
| 226 | CONNECTED | GET | `/authors/me/royalties` | `/authors/me/royalties` | api | `lib/author-api.ts:215` | fulldetailedapi.md:11723 |  |
| 227 | CONNECTED | GET | `/authors/me/royalty-settlements` | `/authors/me/royalty-settlements` | api | `lib/author-api.ts:224` | fulldetailedapi.md:29708 |  |
| 228 | CONNECTED | GET | `/authors/me/royalty-settlements/${settlementId}` | `/authors/me/royalty-settlements/{param}` | api | `lib/author-api.ts:233` | fulldetailedapi.md:29895 |  |
| 229 | CONNECTED | GET | `/users/me/context` | `/users/me/context` | api | `lib/author-api.ts:45` | fulldetailedapi.md:29549 |  |
| 230 | CONNECTED | GET | `/users/me/author-application` | `/users/me/author-application` | api | `lib/author-api.ts:54` | fulldetailedapi.md:6591 |  |
| 231 | CONNECTED | POST | `/author-applications` | `/author-applications` | api | `lib/author-api.ts:63` | HM_BACKEND_COMPLETE_HANDOVER (1).md:2564 |  |
| 232 | CONNECTED | GET | `/authors/me/books` | `/authors/me/books` | api | `lib/author-api.ts:78` | fulldetailedapi.md:11930 |  |
| 233 | CONNECTED | POST | `/authors/me/books` | `/authors/me/books` | api | `lib/author-api.ts:87` | fulldetailedapi.md:12133 |  |
| 234 | CONNECTED | GET | `/authors/me/books/${bookId}` | `/authors/me/books/{param}` | api | `lib/author-api.ts:96` | fulldetailedapi.md:12316 |  |
| 235 | CONNECTED | POST | `/admin/categories` | `/admin/categories` | api | `lib/categories.ts:106` | fulldetailedapi.md:18657 |  |
| 236 | CONNECTED | GET | `/categories` | `/categories` | api | `lib/categories.ts:29` | fulldetailedapi.md:3968 |  |
| 237 | CONNECTED | GET | `/admin/categories` | `/admin/categories` | api | `lib/categories.ts:30` | fulldetailedapi.md:18433 |  |

## Backend Request/Response Reference

- Canonical request and response examples live in `fulldetailedapi.md` at the `Backend Doc Source` line shown above.
- Additional route confirmations and workflow notes live in `HM_BACKEND_COMPLETE_HANDOVER (1).md` and `BACKEND_INTEGRATION_GUIDE.md`.
- Protected routes returning `401` without a token are considered connected if documented; send `Authorization: Bearer <token>`.