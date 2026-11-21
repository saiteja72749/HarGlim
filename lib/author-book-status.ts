export type AuthorBookStage =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "rejected"
  | "published"
  | "archived";

const normalize = (value: unknown) => String(value || "").toLowerCase().replace(/\s+/g, "_");

/** Editorial review lives on the publish request while Book.status can remain draft. */
export function getAuthorBookStage(input: unknown): AuthorBookStage {
  const book = record(input);
  const status = normalize(book.status);
  if (["published", "active"].includes(status)) return "published";
  if (status === "archived") return "archived";

  const request = record(book.publishRequest || book.latestPublishRequest || book.submission || book.review);
  const review = normalize(
    request?.status || book.publishingStatus || book.publishRequestStatus || book.reviewStatus || book.submissionStatus || status
  );
  if (["approved", "published"].includes(review)) return "published";
  if (["under_review", "in_review", "in_editing", "processing"].includes(review)) return "under_review";
  if (["changes_requested", "revision_required"].includes(review)) return "changes_requested";
  if (review === "rejected") return "rejected";
  if (["pending", "submitted"].includes(review)) return "submitted";
  return "draft";
}
import { record } from '@/lib/api-error';
