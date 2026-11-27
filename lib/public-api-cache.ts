import { AxiosError, CanceledError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { retryAfterTime } from '@/lib/api-error';

// These endpoints have anonymous representations. Keep prices and stock fresh on
// the book detail and checkout paths, which don't use this cache.
const policies: Array<[RegExp, number]> = [
  [/^\/content$/, 60_000],
  [/^\/categories$/, 60_000],
  [/^\/publish-packages$/, 30_000],
  [/^\/publishing-terms$/, 0],
  [/^\/authors(?:\/[^/]+(?:\/books)?)?$/, 60_000],
  [/^\/books(?:\/[^/]+\/related)?$/, 20_000],
  [/^\/books\/[^/]+$/, 0],
  [/^\/search$/, 15_000],
  [/^\/stats\/public$/, 60_000],
];

type Cached = { response: AxiosResponse; expiresAt: number };
type Flight = { controller: AbortController; promise: Promise<AxiosResponse>; readers: number };
type Dispatch = (url: string, config: AxiosRequestConfig) => Promise<AxiosResponse>;

export function createPublicApiCache(dispatch: Dispatch, makeKey: (url: string, config: AxiosRequestConfig) => string) {
  const responses = new Map<string, Cached>();
  const flights = new Map<string, Flight>();
  const cooldowns = new Map<RegExp, { expiresAt: number; error: AxiosError }>();

  function get(url: string, config: AxiosRequestConfig = {}): Promise<AxiosResponse> {
    const path = url.split('?')[0];
    const policy = policies.find(([pattern]) => pattern.test(path));
    if (!policy) throw new Error('This endpoint has no public cache policy.');
    const [resource, ttl] = policy;
    const signal = config.signal;
    if (signal?.aborted) return Promise.reject(new CanceledError());

    const anonymousConfig: AxiosRequestConfig = { params: config.params, publicRead: true };
    const key = makeKey(url, anonymousConfig);
    const cached = responses.get(key);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return Promise.resolve(cached.response);

    const cooldown = cooldowns.get(resource);
    if (cooldown && cooldown.expiresAt > now) return Promise.reject(cooldown.error);
    if (cooldown) cooldowns.delete(resource);

    let entry = flights.get(key);
    if (!entry || entry.controller.signal.aborted) {
      const controller = new AbortController();
      const flight: Flight = {
        controller,
        readers: 0,
        promise: dispatch(url, {
          ...anonymousConfig,
          signal: controller.signal,
          ...(ttl === 0 ? { adapter: 'fetch', fetchOptions: { cache: 'no-store' } } : {}),
          validateStatus: (status) => (status >= 200 && status < 300) || (status === 304 && Boolean(cached)),
        })
          .then((result) => {
            const response = result.status === 304 && cached ? cached.response : result;
            if (ttl > 0 && flights.get(key) === flight && !controller.signal.aborted) {
              responses.delete(key);
              responses.set(key, { response, expiresAt: Date.now() + ttl });
              if (responses.size > 128) responses.delete(responses.keys().next().value!);
            }
            return response;
          })
          .catch((error: AxiosError) => {
            if (error.response?.status === 429) {
              const expiresAt = retryAfterTime(error.response.headers['retry-after']);
              Object.assign(error, { retryAt: expiresAt });
              if ((cooldowns.get(resource)?.expiresAt ?? 0) < expiresAt) {
                cooldowns.set(resource, { expiresAt, error });
              }
            }
            throw error;
          })
          .finally(() => {
            if (flights.get(key) === flight) flights.delete(key);
          }),
      };
      entry = flight;
      flights.set(key, flight);
    }

    const flight = entry;
    flight.readers++;
    return new Promise((resolve, reject) => {
      const release = () => {
        signal?.removeEventListener?.('abort', cancel);
        flight.readers--;
      };
      const cancel = () => {
        release();
        reject(new CanceledError());
        queueMicrotask(() => {
          if (flight.readers === 0 && flights.get(key) === flight) flight.controller.abort();
        });
      };
      signal?.addEventListener?.('abort', cancel, { once: true });
      flight.promise.then(
        (response) => { if (!signal?.aborted) { release(); resolve(response); } },
        (error) => { if (!signal?.aborted) { release(); reject(error); } },
      );
    });
  }

  function invalidate(resource: string) {
    const match = (key: string) => key === resource || key.startsWith(`${resource}?`) || key.startsWith(`${resource}/`);
    for (const key of responses.keys()) if (match(key)) responses.delete(key);
    // Current consumers can finish. A read starting after a mutation must use a new flight.
    for (const key of flights.keys()) if (match(key)) flights.delete(key);
  }

  return { get, invalidate };
}
