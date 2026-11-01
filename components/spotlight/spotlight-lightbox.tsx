"use client";

import { useEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Spotlight } from "@/lib/spotlights";

type SpotlightLightboxProps = {
  items: Spotlight[];
  /** Index of the open photo; null = closed. */
  index: number | null;
  onIndexChange: (index: number | null) => void;
};

/**
 * Full-size photo with the author's name and caption. Esc closes (Radix dialog, which also traps
 * focus and locks page scroll); ← / → and the side buttons move between photos.
 */
export function SpotlightLightbox({ items, index, onIndexChange }: SpotlightLightboxProps) {
  const open = index !== null && index >= 0 && index < items.length;
  const item = open ? items[index] : null;
  const hasPrev = open && index > 0;
  const hasNext = open && index < items.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, hasPrev, hasNext, onIndexChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-10 outline-none"
          aria-describedby={item?.caption ? "spotlight-caption" : undefined}
        >
          {item && (
            <>
              <DialogPrimitive.Close
                className="absolute right-3 top-3 sm:right-6 sm:top-6 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </DialogPrimitive.Close>

              <figure className="flex max-h-full w-full max-w-4xl flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={item.id}
                  src={item.image}
                  alt={item.caption || (item.authorName ? `Spotlight: ${item.authorName}` : "Spotlight photo")}
                  className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                />
                <figcaption className="max-w-2xl text-center text-white space-y-1">
                  <DialogPrimitive.Title className="font-serif text-lg sm:text-xl font-bold">
                    {item.authorName || "Harglim Spotlight"}
                  </DialogPrimitive.Title>
                  {item.caption && (
                    <DialogPrimitive.Description id="spotlight-caption" className="text-sm text-white/80 leading-relaxed">
                      {item.caption}
                    </DialogPrimitive.Description>
                  )}
                  <p className="text-xs text-white/50 pt-1">
                    {(index ?? 0) + 1} / {items.length}
                  </p>
                </figcaption>
              </figure>

              {hasPrev && (
                <button
                  type="button"
                  onClick={() => onIndexChange(index - 1)}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 sm:p-3 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={() => onIndexChange(index + 1)}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 sm:p-3 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              )}
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
