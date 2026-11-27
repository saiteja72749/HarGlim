import api from "@/lib/api";
import { getSafeExternalUrl } from "@/lib/utils";
import { record, UnconfirmedWriteError } from "@/lib/api-error";
import { getAuthorBookStage } from "@/lib/author-book-status";
import type { components } from "@/types/openapi.generated";

export async function verifyAuthorBookLanguage(bookId: string, language: string) {
  try {
    const { data } = await api.get(`/authors/me/books/${encodeURIComponent(bookId)}`, { cache: "no-store" });
    const payload = record(record(data).data ?? data);
    const book = record(payload.book ?? payload);
    if ((book._id ?? book.id) === bookId && book.language === language) return;
  } catch (cause) {
    throw new UnconfirmedWriteError("The draft was acknowledged, but its language could not be checked. Review the saved draft before continuing.", { cause });
  }
  throw new UnconfirmedWriteError("The saved draft did not return the requested language. Review the draft before continuing.");
}

export async function updateAuthorBookLanguage(bookId: string, language: string) {
  const payload: components["schemas"]["AuthorBookUpdateRequest"] = { language };
  await api.put(`/authors/me/books/${encodeURIComponent(bookId)}`, payload);
  await verifyAuthorBookLanguage(bookId, language);
}

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

export async function submitAuthorManuscript(bookId: string, submission: components["schemas"]["BookSubmissionRequest"]) {
  const { data } = await api.post(`/authors/me/books/${encodeURIComponent(bookId)}/submit`, submission);
  if (data?.success !== true) throw new UnconfirmedWriteError("The backend did not confirm the submission. Check Manuscripts before retrying.");
  try {
    const fresh = await api.get(`/authors/me/books/${encodeURIComponent(bookId)}`, { cache: "no-store" });
    const payload = record(record(fresh.data).data ?? fresh.data);
    const book = record(payload.book ?? payload);
    const stage = getAuthorBookStage({ ...book, publishRequest: payload.publishRequest ?? book.publishRequest });
    if ((book._id ?? book.id) !== bookId || !["submitted", "under_review", "published"].includes(stage)) {
      throw new Error("The submission status or ID did not match.");
    }
  } catch (cause) {
    throw new UnconfirmedWriteError("The API acknowledged submission, but editorial status could not be confirmed. Check Manuscripts before retrying.", { cause });
  }
}
