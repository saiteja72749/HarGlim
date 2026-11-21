import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { decodeOwnProfile, profileUpdatePayload, type OwnProfileUpdate } from '@/lib/user-profile-data';

function verifiedSession() {
  const session = useAuthStore.getState();
  const id = session.user?._id || session.user?.id;
  if (!id || !session.token || !session.contextVerified) throw new Error('Sign in and verify your session before updating your profile.');
  return { id, token: session.token };
}

function assertSession(expected: { id: string; token: string }) {
  const current = verifiedSession();
  if (current.id !== expected.id || current.token !== expected.token) throw new Error('Your session changed. Please retry.');
}

export async function fetchOwnProfile() {
  const session = verifiedSession();
  const { data } = await api.get('/users/me', { cache: 'no-store' });
  const profile = decodeOwnProfile(data);
  assertSession(session);
  if (profile._id !== session.id) throw new Error('The returned profile does not match your account.');
  return profile;
}

/** A successful response alone does not prove the server persisted the requested fields. */
export async function updateOwnProfile(changes: OwnProfileUpdate) {
  const session = verifiedSession();
  const payload = profileUpdatePayload(changes);
  await api.put(`/users/${encodeURIComponent(session.id)}`, payload);
  assertSession(session);
  const stored = await fetchOwnProfile();
  if (payload.name !== undefined && stored.name !== payload.name) throw new Error('The saved profile name could not be verified.');
  if (payload.profilePicture !== undefined && stored.profilePicture !== payload.profilePicture) throw new Error('The saved profile photo could not be verified.');
  const current = useAuthStore.getState();
  if (!current.user) throw new Error('Your session ended. Please sign in again.');
  current.setUser({ ...current.user,
    ...(stored.name !== undefined ? { name: stored.name } : {}),
    ...(stored.profilePicture !== undefined ? { profilePicture: stored.profilePicture ?? '', profileImage: stored.profilePicture ?? '' } : {}),
  });
  return stored;
}
