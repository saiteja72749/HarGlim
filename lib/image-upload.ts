import api from "@/lib/api";
import { imageUploadErrorMessage, record } from "@/lib/api-error";
import { authorPhoto } from "@/lib/author-presentation";

export async function uploadImage(file: File, endpoint: "/uploads/image" | "/authors/me/uploads/image" = "/uploads/image") {
  const body = new FormData();
  body.append("image", file);
  const response = await api.post(endpoint, body).catch((error: unknown) => {
    throw new Error(imageUploadErrorMessage(error), { cause: error });
  });
  const data = record(response.data);
  const value = record(data.data ?? data).url;
  const url = typeof value === "string" ? authorPhoto({ profilePicture: value }) : "";
  if (!url) throw new Error("The upload response did not provide a usable image URL.");
  return url;
}
