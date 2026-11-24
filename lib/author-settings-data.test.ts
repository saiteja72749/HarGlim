import { expect, it } from 'vitest';
import { authorSnapshot, payoutNotSaved } from './author-settings-data';
it('uses the actual author bio with private account email', () => {
  expect(authorSnapshot({ email: 'reader@example.test', bio: 'Legacy' }, { bio: 'Published' })).toMatchObject({ bio: 'Published', email: 'reader@example.test' });
});
it('rejects dropped payout edits and unmasked account readback', () => {
  expect(payoutNotSaved({ bankName: 'Bank' }, {})).toEqual(['bankName']);
  expect(payoutNotSaved({ accountNumber: '12345678' }, { accountNumberMasked: '****5678' })).toEqual([]);
  expect(payoutNotSaved({}, { accountNumber: '12345678' })).toEqual(['unsafeAccountReadback']);
});
it('does not restore explicitly cleared author values from stale user mirrors', () => {
  expect(authorSnapshot({ bio: 'Legacy', profilePicture: 'legacy' }, { bio: '', profilePicture: null })).toMatchObject({ bio: '', profileImage: '' });
});
