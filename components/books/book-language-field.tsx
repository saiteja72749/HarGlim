"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bookLanguageError } from "@/lib/book-language";

const languages = [
  "Assamese", "Bengali", "English", "French", "German", "Gujarati", "Hindi", "Kannada",
  "Malayalam", "Marathi", "Odia", "Punjabi", "Sanskrit", "Spanish", "Tamil", "Telugu", "Urdu",
];

export function BookLanguageField({ value, onChange, readOnly, serverError }: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  readOnly?: boolean;
  serverError?: string;
}) {
  const id = useId();
  const error = bookLanguageError(value) ?? serverError;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider">Language</Label>
      <Input id={id} name="language" list={`${id}-options`} value={value} onChange={onChange} readOnly={readOnly}
        aria-invalid={Boolean(error)} aria-describedby={`${id}-hint`}
        placeholder="Choose or enter a language" className="rounded-xl bg-[#F8F9F7]" />
      <p id={`${id}-hint`} className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>{error ?? "Optional. Custom names up to 80 characters are accepted."}</p>
      <datalist id={`${id}-options`}>
        {languages.map((language) => <option key={language} value={language} />)}
      </datalist>
    </div>
  );
}
