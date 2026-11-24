/** Safe error information for UI and logs; excludes request headers, credentials and bodies. */
export interface ApiFailure {
  name: string;
  message: string;
  code?: string;
  response?: {
    status?: number;
    headers: Record<string, string>;
    data: { message?: string; error?: string; email?: string; data?: { email?: string } };
  };
}

export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function describeApiError(value: unknown): ApiFailure {
  const source = record(value);
  const text = (v: unknown) => typeof v === 'string' ? v : undefined;
  const response = record(source.response);
  const data = record(response.data);
  const detail = record(data.data);
  const headers = record(response.headers);
  return {
    name: text(source.name) || 'Error',
    message: text(source.message) || 'The request could not be completed.',
    code: text(source.code),
    ...(source.response ? { response: {
      status: typeof response.status === 'number' ? response.status : undefined,
      headers: { 'x-request-id': text(headers['x-request-id']) || '', 'retry-after': text(headers['retry-after']) || '' },
      data: { message: text(data.message), error: text(data.error), email: text(data.email), data: { email: text(detail.email) } },
    } } : {}),
  };
}

export function retryAfterTime(header: unknown, now = Date.now()): number {
  const value = typeof header === 'number' || typeof header === 'string' ? String(header).trim() : '';
  if (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))) return now + Number(value) * 1000;
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) ? Math.max(date, now) : now + 15_000;
}

export function publicApiMessage(error: unknown, fallback: string): string {
  const failure = describeApiError(error);
  switch (failure.response?.status) {
    case 429: return 'The service is receiving too many requests. Wait briefly before trying again.';
    case 503:
    case 504: return 'The service is temporarily unavailable. Please try again shortly.';
    default: return fallback;
  }
}

export function publicRetryAt(error: unknown): number | undefined {
  const value = record(error).retryAt;
  return typeof value === 'number' ? value : undefined;
}
