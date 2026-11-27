import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Frontend GET cache control; authenticated requests are never cached. */
    cache?: 'no-store';
    publicRead?: boolean;
    _retry?: boolean;
    startedAt?: number;
  }
}
