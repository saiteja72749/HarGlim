/** Requests carrying a session must stay inside the configured backend API. */
export function isTrustedApiTarget(target: string, base: string): boolean {
  if (!target || /[\\\u0000-\u0020]/.test(target) || target.startsWith('//')) return false;
  try {
    const configured = new URL(base);
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) {
      const url = new URL(target);
      const prefix = configured.pathname.replace(/\/$/, '');
      return !url.username && !url.password && url.origin === configured.origin && (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`));
    }
    return target.startsWith('/') && !target.split(/[/?#]/).some((part) => decodeURIComponent(part) === '..');
  } catch { return false; }
}
