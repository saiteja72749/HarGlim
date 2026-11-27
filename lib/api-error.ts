/** Safe error information for UI and logs; excludes request headers, credentials and bodies. */
export interface ApiFailure {
  name: string;
  message: string;
  code?: string;
  retryAt?: number;
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

export function isRejectedEnvelope(value: unknown): boolean {
  const envelope = record(value);
  return envelope.success === false || envelope.status === "error";
}

export class UnconfirmedWriteError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UnconfirmedWriteError";
  }
}

export function writeOutcomeUncertain(error: unknown): boolean {
  if (error instanceof UnconfirmedWriteError) return true;
  const failure = describeApiError(error);
  return failure.code === "ERR_BAD_RESPONSE" || failure.code === "ECONNABORTED"
    || failure.code === "ETIMEDOUT" || failure.code === "ERR_NETWORK"
    || (failure.response?.status ?? 0) >= 500;
}

export function mutationErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof UnconfirmedWriteError) return error.message;
  const failure = describeApiError(error);
  if (writeOutcomeUncertain(error)) return "The request outcome is uncertain. Check the saved record before submitting again.";
  switch (failure.response?.status) {
    case 401: return "Your session needs to be renewed. Sign in and try again.";
    case 403: return "You do not have permission to do that.";
    case 404: return "The requested record or operation is unavailable.";
    case 409: return "This request conflicts with the current record. Reload and check its latest state.";
    case 413: return "The selected file exceeds the server upload limit.";
    case 429: return rateLimitMessage(failure);
    default: return fallback;
  }
}

function rateLimitMessage(failure: ApiFailure): string {
  switch (failure.response?.data.error) {
    case "AUTH_RATE_LIMIT_EXCEEDED": return "Too many authentication requests. Wait before trying again.";
    case "UPLOAD_RATE_LIMIT_EXCEEDED": return "Too many uploads. Wait before trying again.";
    case "WRITE_RATE_LIMIT_EXCEEDED": return "Too many save requests. Wait before trying again.";
    default: return "Too many requests. Wait before trying again.";
  }
}

export function imageUploadErrorMessage(error: unknown): string {
  const failure = describeApiError(error);
  if (failure.response?.status === 429) return rateLimitMessage(failure);
  switch (failure.response?.data.error) {
    case "UPLOAD_PROVIDER_NOT_CONFIGURED": return "Image uploads are temporarily unavailable.";
    case "UPLOAD_INVALID": return "Choose a valid JPEG, PNG, WebP or GIF image.";
    case "UPLOAD_TOO_LARGE": return "The selected image exceeds the server upload limit.";
    case "UPLOAD_TOO_MANY_FILES": return "Choose one image.";
    case "UPLOAD_TIMEOUT": return "The image upload timed out. Try again.";
    default: return failure.response?.status === 413
      ? "The selected image exceeds the server upload limit."
      : "The image could not upload. Check the file and try again.";
  }
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
    ...(typeof source.retryAt === 'number' ? { retryAt: source.retryAt } : {}),
    ...(source.response ? { response: {
      status: typeof response.status === 'number' ? response.status : undefined,
      headers: {
        'x-request-id': text(headers['x-request-id']) || '',
        'retry-after': text(headers['retry-after']) || '',
        ...(typeof headers.ratelimit === 'string' ? { ratelimit: headers.ratelimit } : {}),
        ...(typeof headers['ratelimit-policy'] === 'string' ? { 'ratelimit-policy': headers['ratelimit-policy'] } : {}),
      },
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
