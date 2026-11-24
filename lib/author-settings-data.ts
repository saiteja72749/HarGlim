/** User identity is private; the author biography belongs to the public author record. */
export function authorSnapshot(me: Record<string, unknown>, author: Record<string, unknown>) {
  const text = (value: unknown) => typeof value === 'string' ? value : '';
  const canonical = (primary: Record<string, unknown>, keys: string[], fallback: Record<string, unknown>) => {
    for (const key of keys) if (Object.hasOwn(primary, key)) return text(primary[key]);
    for (const key of keys) if (Object.hasOwn(fallback, key)) return text(fallback[key]);
    return '';
  };
  return {
    name: canonical(author, ['name'], me),
    email: text(me.email),
    bio: canonical(author, ['bio'], me),
    profileImage: canonical(author, ['profilePicture', 'profileImage'], me),
  };
}

/** Verify masked readback without retaining or logging the entered account number. */
export function payoutNotSaved(requested: Record<string, string>, saved: Record<string, unknown>): string[] {
  const missing = Object.entries(requested).filter(([key, value]) => {
    if (key === 'accountNumber') {
      const mask = typeof saved.accountNumberMasked === 'string' ? saved.accountNumberMasked : '';
      const digits = mask.replace(/\D/g, '');
      return digits.length !== 4 || digits !== value.replace(/\D/g, '').slice(-4);
    }
    if (value === '' && saved[key] == null) return false;
    return typeof saved[key] !== 'string' || (saved[key] as string).trim().toLowerCase() !== value.trim().toLowerCase();
  }).map(([key]) => key);
  if (typeof saved.accountNumber === 'string' && saved.accountNumber.replace(/\D/g, '').length > 4) missing.push('unsafeAccountReadback');
  return missing;
}
