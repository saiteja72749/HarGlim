export function normalizeEmailForStorage(email: string) {
  return email.trim();
}

export function isValidEmailAddress(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
