import { record } from '@/lib/api-error';
import { getSafeExternalUrl } from '@/lib/utils';

export interface OwnProfile {
  _id: string;
  name?: string;
  profilePicture?: string | null;
}

export interface OwnProfileUpdate {
  name?: string;
  profilePicture?: string;
}

/** Only fields supported by UserUpdateRequest may reach the profile update endpoint. */
export function profileUpdatePayload(input: unknown): OwnProfileUpdate {
  const source = record(input);
  const payload: OwnProfileUpdate = {};
  if (source.name !== undefined) {
    if (typeof source.name !== 'string' || !source.name.trim()) throw new Error('A name is required.');
    payload.name = source.name.trim();
  }
  if (source.profilePicture !== undefined) {
    if (typeof source.profilePicture !== 'string' || !source.profilePicture.trim()) throw new Error('Photo removal is currently unavailable.');
    const safe = getSafeExternalUrl(source.profilePicture);
    if (!safe) throw new Error('Enter a valid HTTP or HTTPS profile photo URL.');
    const url = new URL(safe);
    if (url.username || url.password) throw new Error('Profile photo URLs must not contain embedded credentials.');
    payload.profilePicture = safe;
  }
  if (!Object.keys(payload).length) throw new Error('No supported profile changes were provided.');
  return payload;
}

export function decodeOwnProfile(input: unknown): OwnProfile {
  const envelope = record(input);
  const data = record(envelope.data ?? envelope);
  const user = record(data.user ?? data);
  const id = user._id ?? user.id;
  if (typeof id !== 'string' || !id) throw new Error('The backend returned an invalid profile identity.');
  const photo = Object.hasOwn(user, 'profilePicture') ? user.profilePicture : user.profileImage;
  return {
    _id: id,
    ...(typeof user.name === 'string' ? { name: user.name } : {}),
    ...(typeof photo === 'string' || photo === null ? { profilePicture: photo } : {}),
  };
}
