// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isTrustedApiTarget } from './api-origin';

describe('API credential boundary', () => {
  const base = 'https://backend.example/api';
  it('accepts relative API paths and absolute URLs inside the configured API', () => {
    expect(isTrustedApiTarget('/authors/me/books?limit=100', base)).toBe(true);
    expect(isTrustedApiTarget('https://backend.example/api/users/me', base)).toBe(true);
  });
  it('rejects other origins, protocol-relative URLs, userinfo and paths outside the API', () => {
    for (const path of ['https://attacker.example/api', '//attacker.example', '/\\attacker.example', 'https://user:pass@backend.example/api', 'https://backend.example/admin', 'javascript:alert(1)', '/../auth', '/%2e%2e/auth', '/books\n']) expect(isTrustedApiTarget(path, base)).toBe(false);
  });
});
