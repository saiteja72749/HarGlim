"use client";

import type { Spotlight } from "@/lib/spotlights";
import { cn } from "@/lib/utils";

type SpotlightGridProps = {
  items: Spotlight[];
  /** Opens the lightbox at this index. */
  onSelect: (index: number) => void;
  /** Grid columns and gaps, e.g. "grid-cols-2 sm:grid-cols-3 gap-1". */
  className?: string;
  /** Skeleton tiles shown after the items while loading (first load or "load more"). */
  loadingCount?: number;
};

/**
 * Square photo tiles. Images load lazily from the thumbnail; the full image is only fetched by
 * the lightbox. Plain <img> because spotlight photos may come from any host, which next/image
 * would reject unless listed in next.config.
 */
export function SpotlightGrid({ items, onSelect, className, loadingCount = 0 }: SpotlightGridProps) {
  return (
    <ul className={cn("grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2", className)}>
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(index)}
            className="group relative block w-full aspect-square overflow-hidden bg-[#E2E6DF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2"
            aria-label={item.authorName ? `Open photo of ${item.authorName}` : "Open photo"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnail}
              alt={item.caption || (item.authorName ? `Spotlight: ${item.authorName}` : "Spotlight photo")}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {item.authorName && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-[11px] sm:text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 truncate">
                {item.authorName}
              </span>
            )}
          </button>
        </li>
      ))}
      {Array.from({ length: loadingCount }, (_, i) => (
        <li key={`skeleton-${i}`} aria-hidden="true">
          <div className="aspect-square w-full animate-pulse bg-[#0F3D3E]/10" />
        </li>
      ))}
    </ul>
  );
}
