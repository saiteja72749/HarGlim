import api from '@/lib/api';

export interface AuthorApplicationPayload {
  penName?: string;
  bio?: string;
  portfolioUrl?: string;
  experience?: string;
}

export interface AuthorBookCreatePayload {
  title: string;
  description: string;
  category: string;
  mrp: number;
  coverImage?: string;
  format?: string;
  isbn?: string;
  pages?: number;
}

export interface AuthorBookUpdatePayload {
  title?: string;
  description?: string;
  category?: string;
  mrp?: number;
  coverImage?: string;
  format?: string;
  isbn?: string;
  pages?: number;
}

export interface SubmitBookReviewPayload {
  packageId?: string;
  fileUrl?: string;
  message?: string;
  wordCount?: number;
  pages?: number;
}

/**
 * 1. GET User Context & Entitlements
 * GET /users/me/context
 */
export async function getUserContext() {
  const { data } = await api.get('/users/me/context');
  return data;
}

/**
 * 2. GET My Author Application
 * GET /users/me/author-application
 */
export async function getMyAuthorApplication() {
  const { data } = await api.get('/users/me/author-application');
  return data;
}

/**
 * 3. Submit Author Application
 * POST /author-applications
 */
export async function submitAuthorApplication(payload: AuthorApplicationPayload) {
  const { data } = await api.post('/author-applications', payload);
  return data;
}

/**
 * 4. List My Books
 * GET /authors/me/books
 */
export async function listMyAuthorBooks(params: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sort?: string;
} = {}) {
  const { data } = await api.get('/authors/me/books', { params });
  return data;
}

/**
 * 5. Create Author Book Draft
 * POST /authors/me/books
 */
export async function createAuthorBook(payload: AuthorBookCreatePayload) {
  const { data } = await api.post('/authors/me/books', payload);
  return data;
}

/**
 * 6. Get My Book Detail
 * GET /authors/me/books/:bookId
 */
export async function getMyAuthorBookDetail(bookId: string) {
  const { data } = await api.get(`/authors/me/books/${bookId}`);
  return data;
}

/**
 * 7. Update Author Draft
 * PUT /authors/me/books/:bookId
 */
export async function updateAuthorBook(bookId: string, payload: AuthorBookUpdatePayload) {
  const { data } = await api.put(`/authors/me/books/${bookId}`, payload);
  return data;
}

/**
 * 8. Delete Author Draft
 * DELETE /authors/me/books/:bookId
 */
export async function deleteAuthorBook(bookId: string) {
  const { data } = await api.delete(`/authors/me/books/${bookId}`);
  return data;
}

/**
 * 9. Submit Book For Editorial Review
 * POST /authors/me/books/:bookId/submit
 */
export async function submitBookForReview(bookId: string, payload: SubmitBookReviewPayload) {
  const { data } = await api.post(`/authors/me/books/${bookId}/submit`, payload);
  return data;
}

/**
 * 10. Upload Cover Image
 * POST /authors/me/uploads/image
 */
export async function uploadAuthorImage(file: File) {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post('/authors/me/uploads/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch(() =>
    api.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );

  return data;
}

/**
 * 11. Upload Manuscript Document
 * POST /authors/me/uploads/document
 */
export async function uploadAuthorDocument(file: File) {
  const formData = new FormData();
  formData.append('document', file);

  const { data } = await api.post('/authors/me/uploads/document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).catch(() =>
    api.post('/uploads/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );

  return data;
}

/**
 * 12. List Publish Packages
 * GET /publish-packages
 */
export async function getPublishPackages() {
  const { data } = await api.get('/publish-packages');
  return data;
}

/**
 * 13. Dashboard Access Status
 * GET /authors/me/dashboard-access
 */
export async function getAuthorDashboardAccessStatus() {
  const { data } = await api.get('/authors/me/dashboard-access');
  return data;
}

/**
 * 14. Get Author Dashboard Summary
 * GET /authors/me/dashboard
 */
export async function getAuthorDashboardSummary() {
  const { data } = await api.get('/authors/me/dashboard');
  return data;
}

/**
 * 15. Get Author Analytics
 * GET /authors/me/analytics
 */
export async function getAuthorAnalytics(params: { range?: string; from?: string; to?: string } = {}) {
  const { data } = await api.get('/authors/me/analytics', { params });
  return data;
}

/**
 * 16. Get Book Performance
 * GET /authors/me/books/performance
 */
export async function getAuthorBookPerformance() {
  const { data } = await api.get('/authors/me/books/performance');
  return data;
}

/**
 * 17. Get Royalty History
 * GET /authors/me/royalties
 */
export async function getAuthorRoyalties(params: { page?: number; limit?: number; bookId?: string; from?: string; to?: string } = {}) {
  const { data } = await api.get('/authors/me/royalties', { params });
  return data;
}

/**
 * 18. List Royalty Settlements
 * GET /authors/me/royalty-settlements
 */
export async function getAuthorRoyaltySettlements(params: { page?: number; limit?: number } = {}) {
  const { data } = await api.get('/authors/me/royalty-settlements', { params });
  return data;
}

/**
 * 19. Settlement Detail
 * GET /authors/me/royalty-settlements/:id
 */
export async function getAuthorRoyaltySettlementDetail(settlementId: string) {
  const { data } = await api.get(`/authors/me/royalty-settlements/${settlementId}`);
  return data;
}
