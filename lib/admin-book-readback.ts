import api, { getPublic } from "@/lib/api";
import { record, UnconfirmedWriteError } from "@/lib/api-error";

export function adminBookRecord(payload: unknown) {
  const envelope = record(payload);
  const data = record(envelope.data ?? envelope);
  return record(data.book ?? data);
}

export async function verifyBookWrite(id: string, expected: {
  title: string; status: string; language?: string; author?: string; reservedStock?: number; discountPrice?: number;
}) {
  try {
    const { data } = await api.get(`/admin/books/${encodeURIComponent(id)}`, { cache: "no-store" });
    const book = adminBookRecord(data);
    if ((book._id ?? book.id) !== id || book.title !== expected.title || book.status !== expected.status) {
      throw new UnconfirmedWriteError("The saved book or publication status could not be confirmed. Check the book in Admin before saving again.");
    }
    if (expected.language && book.language !== expected.language) {
      throw new UnconfirmedWriteError("The book was saved, but its language is missing or different in the admin API. Check the saved book before making another edit.");
    }
    const authorId = typeof book.author === "string" ? book.author : record(book.author)._id ?? record(book.author).id;
    if (expected.author !== undefined && authorId !== expected.author) {
      throw new UnconfirmedWriteError("The saved author association could not be confirmed. Check the book in Admin before saving again.");
    }
    if ((expected.reservedStock !== undefined && book.reservedStock !== expected.reservedStock) ||
        (expected.discountPrice !== undefined && book.discountPrice !== expected.discountPrice)) {
      throw new UnconfirmedWriteError("The saved reserved stock or discount price could not be confirmed. Check the book in Admin before saving again.");
    }
    if (expected.status === "published") {
      if (typeof book.slug !== "string" || !book.slug) throw new Error("The published book omitted its slug.");
      const publicResponse = await getPublic(`/books/${encodeURIComponent(book.slug)}`);
      const published = adminBookRecord(publicResponse.data);
      if ((published._id ?? published.id) !== id || published.title !== expected.title) throw new Error("The public listing could not be confirmed.");
      if (expected.language && published.language !== expected.language) {
        throw new UnconfirmedWriteError("The book was saved, but the public API did not return its saved language.");
      }
    }
    return book;
  } catch (error) {
    if (error instanceof UnconfirmedWriteError) throw error;
    throw new UnconfirmedWriteError("The API acknowledged the save, but the saved record could not be verified. Check the book in Admin before saving again.", { cause: error });
  }
}
