/**
 * Keeps open tabs in step with admin edits without a page reload.
 *
 * After an admin saves, `notifyLiveChange(topic)` tells every other tab of the site in this
 * browser (BroadcastChannel) to reload that data. Any tab, including other people's, also
 * reloads when it comes back into focus, at most once per `FOCUS_REFRESH_MS`.
 */

export type LiveTopic = "site-content" | "publish-packages" | "author-data";

const CHANNEL = "harglim-live-sync";
const FOCUS_REFRESH_MS = 15_000;

const openChannel = () =>
  typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL) : null;

/** Tell other tabs that `topic` changed on the server. */
export function notifyLiveChange(topic: LiveTopic) {
  const channel = openChannel();
  channel?.postMessage({ topic });
  channel?.close();
}

/** Run `reload` when another tab saves `topic` or this tab regains focus. Returns the cleanup. */
export function onLiveChange(topic: LiveTopic, reload: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const channel = openChannel();
  const onMessage = (event: MessageEvent) => {
    if (event.data?.topic === topic) reload();
  };
  channel?.addEventListener("message", onMessage);

  let lastFocusReload = Date.now();
  const onFocus = () => {
    if (document.visibilityState !== "visible" || Date.now() - lastFocusReload < FOCUS_REFRESH_MS) return;
    lastFocusReload = Date.now();
    reload();
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    channel?.removeEventListener("message", onMessage);
    channel?.close();
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  };
}
