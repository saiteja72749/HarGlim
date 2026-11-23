import api from "@/lib/api";
import { getSafeExternalUrl } from "@/lib/utils";

const manuscriptTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const manuscriptLimit = 25 * 1024 * 1024;

export function manuscriptFileError(file: Pick<File, "type" | "size">): string | null {
  if (!manuscriptTypes.has(file.type)) return "Choose a PDF, DOC, or DOCX file.";
  if (file.size <= 0) return "The file is empty.";
  if (file.size > manuscriptLimit) return "Choose a file of 25 MB or less.";
  return null;
}

export async function uploadAuthorManuscript(file: File, onProgress: (percent: number) => void) {
  const problem = manuscriptFileError(file);
  if (problem) throw new Error(problem);
  const body = new FormData();
  body.append("document", file);
  const { data } = await api.post("/authors/me/uploads/document", body, {
    onUploadProgress: ({ loaded, total }) => {
      if (total && total > 0) onProgress(Math.min(100, Math.round(100 * loaded / total)));
    },
  });
  const candidate = data?.data?.url ?? data?.url ?? data?.data?.fileUrl ?? data?.fileUrl;
  const url = typeof candidate === "string" ? getSafeExternalUrl(candidate) : "";
  if (data?.success === false || !url) throw new Error("The backend did not return a verified file URL.");
  return url;
}

export async function submitAuthorManuscript(bookId: string, submission: {
  fileUrl: string;
  packageId: string;
  wordCount?: number;
  genre?: string;
}) {
  const { data } = await api.post(`/authors/me/books/${encodeURIComponent(bookId)}/submit`, submission);
  if (data?.success !== true) throw new Error("The backend did not confirm the submission.");
}
