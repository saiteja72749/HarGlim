import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Guards against open-redirect attacks: only allows same-origin, relative
 * paths (a single leading "/"). Rejects protocol-relative ("//host") and
 * absolute (http(s)://, javascript:, etc.) values.
 */
export function getSafeRedirect(target: string | null | undefined, fallback = '/'): string {
  if (!target) return fallback
  if (!target.startsWith('/') || target.startsWith('//')) return fallback
  try {
    // Reject anything that resolves to a different origin once parsed.
    const url = new URL(target, 'http://localhost')
    if (url.origin !== 'http://localhost') return fallback
    return `${url.pathname}${url.search}${url.hash}` || fallback
  } catch {
    return fallback
  }
}

export function getSafeExternalUrl(target: string | null | undefined): string {
  if (!target || typeof target !== 'string') return ''

  try {
    const url = new URL(target.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : ''
  } catch {
    return ''
  }
}

export function isSafeExternalUrl(target: string | null | undefined): boolean {
  return Boolean(getSafeExternalUrl(target))
}

/**
 * Resolves the real author display name and profile link eligibility for any book.
 * Defends against books mistakenly attributed to the platform admin ("Demo Admin")
 * and handles external / unregistered authors cleanly.
 */
export function getBookAuthorInfo(book: any): {
  name: string;
  id: string | null;
  hasProfile: boolean;
} {
  if (!book) {
    return { name: "Harglim Author", id: null, hasProfile: false };
  }

  // Known book-to-author override dictionary for catalog books with external authors
  const knownAuthorOverrides: Record<string, string> = {
    "enterprise-risk-management-simplified": "Dr Arjita Biswas and Pretesh Biswas",
    "6a99bb4f5d102a2fe5a2099d": "Dr Arjita Biswas and Pretesh Biswas",
  };

  const slugOrId = book.slug || book._id || book.id || "";
  if (knownAuthorOverrides[slugOrId]) {
    return {
      name: knownAuthorOverrides[slugOrId],
      id: null,
      hasProfile: false,
    };
  }

  // 1. Direct explicit authorName field
  const explicitAuthorName = typeof book.authorName === "string" && book.authorName.trim()
    ? book.authorName.trim()
    : "";

  // 2. Author object resolution
  if (book.author && typeof book.author === "object") {
    const rawName = book.author.name || book.author.fullName || "";
    const rawId = book.author._id || book.author.id || "";
    const role = (book.author.role || "").toLowerCase();

    // If author name is Demo Admin or role is admin, prefer explicit authorName or fallback
    if (rawName.toLowerCase().includes("admin") || role === "admin" || rawName === "Demo Admin") {
      if (explicitAuthorName) {
        return { name: explicitAuthorName, id: null, hasProfile: false };
      }
      if ((book.title || "").toLowerCase().includes("risk management")) {
        return { name: "Dr Arjita Biswas and Pretesh Biswas", id: null, hasProfile: false };
      }
      return { name: explicitAuthorName || "Harglim Editorial", id: null, hasProfile: false };
    }

    if (rawName) {
      return {
        name: rawName,
        id: rawId || null,
        hasProfile: Boolean(rawId && /^[0-9a-fA-F]{24}$/.test(rawId) && role !== "admin"),
      };
    }
  }

  // 3. String author
  if (typeof book.author === "string" && book.author.trim()) {
    const val = book.author.trim();
    if (!/^[0-9a-fA-F]{24}$/.test(val)) {
      return { name: val, id: null, hasProfile: false };
    }
  }

  if (explicitAuthorName) {
    return { name: explicitAuthorName, id: null, hasProfile: false };
  }

  return { name: "Harglim Author", id: null, hasProfile: false };
}

