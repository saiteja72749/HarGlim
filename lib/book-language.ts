import { describeApiError } from "@/lib/api-error";

export function normalizeBookLanguage(input: string): string | undefined {
  const value = input.trim().replace(/\s+/gu, " ");
  return value || undefined;
}

export function bookLanguageError(input: string): string | undefined {
  const value = normalizeBookLanguage(input);
  if (!value) return;
  if ([...value].length > 80) return "Enter a language of 80 characters or fewer.";
  if (/\p{Cc}/u.test(value)) return "Remove control characters from the language.";
}

export function bookLanguageApiError(error: unknown): string | undefined {
  switch (describeApiError(error).response?.data.error) {
    case "BOOK_LANGUAGE_INVALID_TYPE": return "Enter the language as text.";
    case "BOOK_LANGUAGE_REQUIRED": return "Enter the book language.";
    case "BOOK_LANGUAGE_TOO_LONG": return "Enter a language of 80 characters or fewer.";
    case "BOOK_LANGUAGE_INVALID_CHARACTERS": return "The backend rejected characters in this language. Edit the value and try again.";
  }
}
