export type AuthorRequest = { label: string; result: PromiseSettledResult<unknown> };

/**
 * One sentence for the author when part of the panel could not load, or null when all loaded.
 * Each author screen shows this instead of silent zeros.
 */
export function authorPanelProblem(requests: AuthorRequest[]): string | null {
  const failed = requests.filter((r) => r.result.status === "rejected");
  if (failed.length === 0) return null;

  const reasons = failed.map((r) => (r.result as PromiseRejectedResult).reason);
  const status = (e: any) => e?.response?.status;
  const message = (e: any) => e?.response?.data?.message || e?.message || "";

  const forbidden = reasons.find((e) => status(e) === 403);
  if (forbidden) {
    const why = message(forbidden);
    return `Your author dashboard access is not active yet, so sales and royalty figures can't be shown${
      why ? ` (server: "${why}")` : ""
    }. Please contact Harglim support to activate it.`;
  }
  if (reasons.some((e) => status(e) === 401)) return "Your session has expired. Please sign in again to see your latest figures.";
  if (reasons.some((e) => status(e) === 429)) return "Too many requests right now. Please wait a few minutes and retry.";

  const labels = failed.map((r) => r.label).join(", ");
  const first = message(reasons[0]);
  return `Couldn't load ${labels}${first ? ` (${first})` : ""}. The figures below may be incomplete.`;
}
