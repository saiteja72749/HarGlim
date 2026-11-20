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
      headers: { 'x-request-id': text(headers['x-request-id']) || '' },
      data: { message: text(data.message), error: text(data.error), email: text(data.email), data: { email: text(detail.email) } },
    } } : {}),
  };
}
