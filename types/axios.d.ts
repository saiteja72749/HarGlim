import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Frontend GET cache control; authenticated requests are never cached. */
    cache?: 'no-store';
    metadata?: { cacheKey?: string };
    _retry?: boolean;
  }
}
