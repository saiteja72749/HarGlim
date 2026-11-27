export function authorPhoto(author: { profilePicture?: string | null; profileImage?: string | null }): string {
  const source = author.profilePicture ?? author.profileImage;
  if (typeof source !== "string" || !source.trim()) return "";
  try {
    const url = new URL(source);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
