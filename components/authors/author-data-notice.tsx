"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown at the top of an author page when part of its data could not load (instead of silent zeros). */
export function AuthorDataNotice({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <p className="text-xs sm:text-sm flex-1">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5 border-amber-300 bg-white text-amber-900 hover:bg-amber-100">
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}
