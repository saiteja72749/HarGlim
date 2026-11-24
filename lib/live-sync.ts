/**
 * Keeps open tabs in step with admin edits without a page reload.
 *
 * After an admin saves, `notifyLiveChange(topic)` tells every other tab of the site in this
 * browser (BroadcastChannel) to reload that data. Any tab, including other people's, also
 * reloads when it comes back into focus, at most once per `FOCUS_REFRESH_MS`.
 */

export type LiveTopic = "site-content" | "publish-packages" | "author-data" | "categories" | "books";

const CHANNEL = "harglim-live-sync";
const LOCAL_EVENT = "harglim-live-change";
const FOCUS_REFRESH_MS = 15_000;

const openChannel = () =>
  typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL) : null;

/** Tell other tabs that `topic` changed on the server. */
export function notifyLiveChange(topic: LiveTopic, includeCurrentTab = true) {
  if (includeCurrentTab && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: topic }));
  const channel = openChannel();
  channel?.postMessage({ topic });
  channel?.close();
}

/** Run `reload` when another tab saves `topic` or this tab regains focus. Returns the cleanup. */
export function onLiveChange(topic: LiveTopic | LiveTopic[], reload: (reason: "change" | "focus") => void, focusInterval = FOCUS_REFRESH_MS): () => void {
  if (typeof window === "undefined") return () => {};
  const topics = typeof topic === "string" ? [topic] : topic;

  const channel = openChannel();
  const onMessage = (event: MessageEvent) => {
    if (topics.includes(event.data?.topic)) reload("change");
  };
  channel?.addEventListener("message", onMessage);
  const onLocal = (event: Event) => {
    if (topics.includes((event as CustomEvent<LiveTopic>).detail)) reload("change");
  };
  window.addEventListener(LOCAL_EVENT, onLocal);

  let lastFocusReload = Date.now();
  const onFocus = () => {
    if (document.visibilityState !== "visible" || Date.now() - lastFocusReload < focusInterval) return;
    lastFocusReload = Date.now();
    reload("focus");
  };
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onFocus);

  return () => {
    channel?.removeEventListener("message", onMessage);
    window.removeEventListener(LOCAL_EVENT, onLocal);
    channel?.close();
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  };
}
