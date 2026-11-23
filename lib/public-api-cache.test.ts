import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { retryAfterTime } from '@/lib/api-error';
import { createPublicApiCache } from '@/lib/public-api-cache';

const response = (data: string, status = 200, headers = {}) => ({ data, status, headers }) as AxiosResponse;
const cacheFor = (dispatch: (path: string, config: AxiosRequestConfig) => Promise<AxiosResponse>) =>
  createPublicApiCache(dispatch, (path, config) => `${path}?${JSON.stringify(config.params ?? {})}`);

afterEach(() => { vi.useRealTimers(); });

describe('public API request reuse', () => {
  it('shares one network read across consumers and keeps it alive when one cancels', async () => {
    let finish!: (value: AxiosResponse) => void;
    const transport = vi.fn((_path: string, _config: AxiosRequestConfig) => new Promise<AxiosResponse>((resolve) => { finish = resolve; }));
    const cache = cacheFor(transport);
    const first = new AbortController();
    const pending = cache.get('/books', { signal: first.signal, params: { page: 1 } });
    const remaining = cache.get('/books', { params: { page: 1 } });
    first.abort();
    await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][1].signal?.aborted).toBe(false);
    finish(response('books'));
    await expect(remaining).resolves.toMatchObject({ data: 'books' });
    await expect(cache.get('/books', { params: { page: 1 } })).resolves.toMatchObject({ data: 'books' });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it('cancels an abandoned request and starts a new one for a different search', async () => {
    const transport = vi.fn((_path: string, config: AxiosRequestConfig) => {
      if (config.params.q === 'current') return Promise.resolve(response('current'));
      return new Promise<AxiosResponse>((_, reject) => config.signal?.addEventListener?.('abort', () => reject(new AxiosError('Aborted'))));
    });
    const cache = cacheFor(transport);
    const search = new AbortController();
    const previous = cache.get('/search', { params: { q: 'old' }, signal: search.signal });
    search.abort();
    await expect(previous).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(transport.mock.calls[0][1].signal?.aborted).toBe(true);
    await expect(cache.get('/search', { params: { q: 'current' } })).resolves.toMatchObject({ data: 'current' });
  });

  it('invalidates published lists, reuses 304 responses, and never caches price-sensitive book details', async () => {
    vi.useFakeTimers();
    const transport = vi.fn()
      .mockResolvedValueOnce(response('published'))
      .mockResolvedValueOnce(response('', 304))
      .mockResolvedValueOnce(response('updated'))
      .mockResolvedValueOnce(response('stock1'))
      .mockResolvedValueOnce(response('stock2'));
    const cache = cacheFor(transport);
    expect((await cache.get('/books')).data).toBe('published');
    vi.setSystemTime(Date.now() + 21_000);
    expect((await cache.get('/books')).data).toBe('published');
    cache.invalidate('/books');
    expect((await cache.get('/books')).data).toBe('updated');
    expect((await cache.get('/books/example')).data).toBe('stock1');
    expect((await cache.get('/books/example')).data).toBe('stock2');
    expect(() => cache.get('/users/me')).toThrow('no public cache policy');
    expect(transport).toHaveBeenCalledTimes(5);
  });

  it('blocks repeat requests for the affected collection until Retry-After, then permits an explicit retry', async () => {
    vi.useFakeTimers();
    const limited = new AxiosError('Too many requests', undefined, undefined, undefined, response('', 429, { 'retry-after': '12' }));
    const transport = vi.fn().mockRejectedValueOnce(limited).mockResolvedValue(response('ok'));
    const cache = cacheFor(transport);
    const now = Date.now();
    await expect(cache.get('/categories')).rejects.toMatchObject({ retryAt: now + 12_000 });
    await expect(cache.get('/categories', { params: { page: 2 } })).rejects.toBe(limited);
    expect(transport).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 12_000);
    expect(transport).toHaveBeenCalledTimes(1);
    await expect(cache.get('/categories')).resolves.toMatchObject({ data: 'ok' });
    expect(transport).toHaveBeenCalledTimes(2);
    expect(retryAfterTime(new Date(now + 30_000).toUTCString(), now)).toBeGreaterThan(now + 29_000);
    expect(retryAfterTime(undefined, now)).toBe(now + 15_000);
  });
});
