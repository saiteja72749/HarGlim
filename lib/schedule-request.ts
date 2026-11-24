/** Coalesce effect setups that React replaces before their initial request starts. */
export function scheduleRequest(start: () => void | Promise<unknown>): () => void {
  let cancelled = false;
  queueMicrotask(() => {
    if (!cancelled) void start();
  });
  return () => { cancelled = true; };
}
