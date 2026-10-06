import type { UserContextData } from "@/types";

/**
 * Author dashboard access rules (backend handoff: "Author Dashboard Payment Disabled").
 *
 * - Access is decided by `capabilities.canAccessAuthorDashboard`, never by
 *   `states.dashboardAccessStatus` (it may still hold historical values such as
 *   NOT_PURCHASED / REVOKED / ACTIVE that must not block a free dashboard).
 * - Purchase / QR / UTR / paywall UI exists only while
 *   `features.paidAuthorDashboardAccess === true`. A missing flag is treated as
 *   disabled so the purchase endpoint is never called by default.
 * - Author navigation is shown only once the user's role is "author".
 */

type ContextLike = Partial<UserContextData> | null | undefined;
type UserLike = { role?: string } | null | undefined;

export type AuthorApplicationState = "none" | "pending" | "approved" | "rejected";

export function isPaidAuthorDashboardEnabled(context: ContextLike): boolean {
  return context?.features?.paidAuthorDashboardAccess === true;
}

/**
 * true  -> show the author dashboard
 * false -> the user is not an author, or the backend explicitly denied access
 */
export function canOpenAuthorDashboard(user: UserLike, context: ContextLike): boolean {
  const role = context?.user?.role || user?.role;
  if (role !== "author") return false;

  const capability = context?.capabilities?.canAccessAuthorDashboard;
  // Before the context has loaded, the approved "author" role is enough.
  return typeof capability === "boolean" ? capability : true;
}

export function getAuthorApplicationState(context: ContextLike): AuthorApplicationState {
  const raw = String(context?.states?.authorApplicationStatus || "").toUpperCase();
  if (raw === "APPROVED" || raw === "ACCEPTED") return "approved";
  if (raw === "REJECTED" || raw === "DECLINED") return "rejected";
  if (raw === "PENDING" || raw === "SUBMITTED" || raw === "UNDER_REVIEW") return "pending";
  return "none";
}

/** Where a freshly signed-in user lands when no ?redirect= was requested. */
export function getHomeRouteForContext(user: UserLike, context: ContextLike): string {
  const role = context?.user?.role || user?.role;
  if (role === "admin" || context?.capabilities?.canAdminister) return "/admin";
  if (canOpenAuthorDashboard(user, context)) return "/author";
  return "/";
}

export const AUTHOR_ACCESS_ERRORS = {
  ROLE_REQUIRED: "AUTHOR_ROLE_REQUIRED",
  DASHBOARD_ACCESS_REQUIRED: "AUTHOR_DASHBOARD_ACCESS_REQUIRED",
  PAID_ACCESS_DISABLED: "AUTHOR_DASHBOARD_PAID_ACCESS_DISABLED",
} as const;
