// @vitest-environment node
import { expect, it } from 'vitest';
import { describeApiError } from './api-error';

it('keeps actionable API errors without request credentials or financial payloads', () => {
  const failure = describeApiError({ message: 'Request failed', config: { headers: { Authorization: 'private-token' }, data: { password: 'private-password', accountNumber: 'private-account' } }, response: { status: 403, headers: { 'x-request-id': 'request-id', 'set-cookie': 'private-cookie' }, data: { message: 'Access denied', error: 'FORBIDDEN', accountNumber: 'private-account' } } });
  expect(failure.response?.status).toBe(403);
  expect(failure.response?.data.message).toBe('Access denied');
  expect(failure.response?.headers['x-request-id']).toBe('request-id');
  expect(JSON.stringify(failure)).not.toContain('private-');
});
