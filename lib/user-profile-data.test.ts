// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decodeOwnProfile, profileUpdatePayload } from './user-profile-data';

describe('own profile boundary', () => {
  it('allows documented profile fields and excludes privilege or financial fields', () => {
    expect(profileUpdatePayload({ name: ' Author ', profilePicture: 'https://example.com/photo.png', role: 'admin', bankDetails: { accountNumber: 'test' } })).toEqual({ name: 'Author', profilePicture: 'https://example.com/photo.png' });
    expect(() => profileUpdatePayload({ role: 'admin' })).toThrow('No supported profile changes');
  });
  it('rejects unsupported clearing, empty names and executable image URLs', () => {
    expect(() => profileUpdatePayload({ name: '' })).toThrow('A name is required');
    expect(() => profileUpdatePayload({ profilePicture: '' })).toThrow('Photo removal is currently unavailable');
    for (const url of ['javascript:alert(1)', 'data:image/png;base64,test', 'file:///private/photo.png']) expect(() => profileUpdatePayload({ profilePicture: url })).toThrow('HTTP or HTTPS');
    expect(() => profileUpdatePayload({ profilePicture: 'https://user:example@example.com/photo.png' })).toThrow('embedded credentials');
  });
  it('requires the backend identity and keeps explicit photo clears', () => {
    expect(decodeOwnProfile({ data: { _id: 'own-id', name: 'Author', profilePicture: '', profileImage: 'https://example.com/old.png' } })).toEqual({ _id: 'own-id', name: 'Author', profilePicture: '' });
    expect(decodeOwnProfile({ data: { user: { id: 'own-id', profilePicture: null } } })).toEqual({ _id: 'own-id', profilePicture: null });
    expect(() => decodeOwnProfile({ name: 'Missing identity' })).toThrow('invalid profile identity');
  });
});
