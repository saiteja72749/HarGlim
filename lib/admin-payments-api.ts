import api from '@/lib/api';

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

function assertMongoId(paymentId: string) {
  if (!MONGO_ID_REGEX.test(paymentId)) {
    throw new Error('Payment Mongo ID is required for admin payment operations.');
  }
}

export interface AdminPaymentQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  provider?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
}

export interface ApprovePaymentPayload {
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RejectPaymentPayload {
  reason?: string;
  metadata?: Record<string, any>;
}

export interface CancelPaymentPayload {
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ExpirePaymentPayload {
  reason?: string;
  metadata?: Record<string, any>;
}

export interface RecreateQrPayload {
  force?: boolean;
  reason?: string;
}

/**
 * 1. List Payments For Admin Queue
 * GET /admin/operations/payments
 */
export async function listAdminPayments(params: AdminPaymentQueryParams = {}) {
  const queryParams: Record<string, any> = {};
  if (params.page) queryParams.page = params.page;
  if (params.limit) queryParams.limit = params.limit;
  if (params.status && params.status !== 'ALL') queryParams.status = params.status;
  if (params.paymentMethod && params.paymentMethod !== 'ALL') queryParams.paymentMethod = params.paymentMethod;
  if (params.provider && params.provider !== 'ALL') queryParams.provider = params.provider;
  if (params.from) queryParams.from = params.from;
  if (params.to) queryParams.to = params.to;
  if (params.search?.trim()) queryParams.search = params.search.trim();
  if (params.sort) queryParams.sort = params.sort;

  const { data } = await api.get('/admin/operations/payments', { params: queryParams });
  return data;
}

/**
 * 2. View Payment Detail
 * GET /admin/operations/payments/:id
 */
export async function getAdminPaymentDetail(paymentId: string) {
  assertMongoId(paymentId);
  const { data } = await api.get(`/admin/operations/payments/${paymentId}`);
  return data;
}

/**
 * 3. Approve Payment
 * POST /admin/operations/payments/:id/approve
 */
export async function approveAdminPayment(paymentId: string, payload: ApprovePaymentPayload = {}) {
  assertMongoId(paymentId);
  const { data } = await api.post(`/admin/operations/payments/${paymentId}/approve`, payload);
  return data;
}

/**
 * 4. Reject Payment
 * POST /admin/operations/payments/:id/reject
 */
export async function rejectAdminPayment(paymentId: string, payload: RejectPaymentPayload = {}) {
  assertMongoId(paymentId);
  const { data } = await api.post(`/admin/operations/payments/${paymentId}/reject`, payload);
  return data;
}

/**
 * 5. Cancel Payment Intent
 * POST /admin/operations/payments/:id/cancel
 */
export async function cancelAdminPayment(paymentId: string, payload: CancelPaymentPayload = {}) {
  assertMongoId(paymentId);
  const { data } = await api.post(`/admin/operations/payments/${paymentId}/cancel`, payload);
  return data;
}

/**
 * 6. Expire Payment Intent
 * POST /admin/operations/payments/:id/expire
 */
export async function expireAdminPayment(paymentId: string, payload: ExpirePaymentPayload = {}) {
  assertMongoId(paymentId);
  const { data } = await api.post(`/admin/operations/payments/${paymentId}/expire`, payload);
  return data;
}

/**
 * 7. Retry Verification
 * POST /admin/operations/payments/:id/retry-verification
 */
export async function retryAdminVerification(paymentId: string) {
  assertMongoId(paymentId);
  const { data } = await api.post(`/admin/operations/payments/${paymentId}/retry-verification`, {});
  return data;
}

/**
 * 8. Recreate QR
 * POST /admin/operations/payments/:id/recreate-qr
 */
export async function recreateAdminQr(paymentId: string, payload: RecreateQrPayload = { force: true }) {
  assertMongoId(paymentId);
  const { data } = await api.post(`/admin/operations/payments/${paymentId}/recreate-qr`, payload);
  return data;
}
