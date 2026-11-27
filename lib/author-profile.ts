import api from "@/lib/api";
import { record, UnconfirmedWriteError } from "@/lib/api-error";
import { authorPhoto } from "@/lib/author-presentation";
import { notifyLiveChange } from "@/lib/live-sync";
import { uploadImage } from "@/lib/image-upload";

export const authorPhotoTypes = "image/jpeg,image/png,image/webp,image/gif";

export function validateAuthorPhoto(file: File) {
  if (!authorPhotoTypes.split(",").includes(file.type)) throw new Error("Choose a JPEG, PNG, WebP or GIF image.");
  if (file.size === 0 || file.size > 25 * 1024 * 1024) throw new Error("Choose an image smaller than 25 MB.");
}

export async function uploadAuthorPhoto(file: File, role: "admin" | "author") {
  validateAuthorPhoto(file);
  return uploadImage(file, role === "author" ? "/authors/me/uploads/image" : "/uploads/image");
}

type AuthorProfileChange = { name: string; bio: string; profilePicture?: string | null };

export async function fetchPublicAuthorProfile(id: string) {
  const { data } = await api.get(`/authors/${encodeURIComponent(id)}`, { publicRead: true, cache: "no-store" });
  const result = record(record(data).data ?? data);
  const author = record(result.author ?? result);
  if ((author._id ?? author.id) !== id || typeof author.name !== "string") throw new Error("The API did not return the requested author profile.");
  return author;
}

export async function savePublicAuthorProfile(id: string, changes: AuthorProfileChange) {
  await api.put(`/authors/${encodeURIComponent(id)}`, changes);
  try {
    const stored = await fetchPublicAuthorProfile(id);
    const photo = authorPhoto({ profilePicture: typeof stored.profilePicture === "string" ? stored.profilePicture : null });
    if (stored.name !== changes.name || (stored.bio ?? "") !== changes.bio ||
      (changes.profilePicture !== undefined && photo !== (changes.profilePicture ?? ""))) {
      throw new Error("The public profile did not return the requested values.");
    }
    return stored;
  } catch (cause) {
    throw new UnconfirmedWriteError("The API acknowledged the save, but the public author profile could not be verified. Reload the profile before saving again.", { cause });
  } finally {
    notifyLiveChange("author-data");
  }
}
