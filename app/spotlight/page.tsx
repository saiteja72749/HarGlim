"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightGrid } from "@/components/spotlight/spotlight-grid";
import { SpotlightLightbox } from "@/components/spotlight/spotlight-lightbox";
import { fetchSpotlights, type Spotlight } from "@/lib/spotlights";

const PAGE_SIZE = 24;

/** Every spotlight photo as an Instagram-style grid, loading more as the reader scrolls. */
export default function SpotlightPage() {
  const [items, setItems] = useState<Spotlight[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const loadingRef = useRef(false);
  const itemsRef = useRef<Spotlight[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadNext = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    const nextPage = page + 1;
    try {
      const result = await fetchSpotlights(nextPage, PAGE_SIZE);
      const seen = new Set(itemsRef.current.map((s) => s.id));
      const fresh = result.items.filter((s) => !seen.has(s.id));
      itemsRef.current = [...itemsRef.current, ...fresh];
      setItems(itemsRef.current);
      setPage(nextPage);
      // Stop when the backend says so, or when a page brings nothing new (an unpaged list).
      setHasMore(result.hasMore && fresh.length > 0);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [page]);

  // First page.
  useEffect(() => {
    if (page === 0) loadNext();
  }, [page, loadNext]);

  // Infinite scroll: load the next page when the end of the grid comes near.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || error || page === 0) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadNext(), {
      rootMargin: "600px 0px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, error, page, loadNext]);

  const firstLoad = page === 0;

  return (
    <div className="bg-[#F8F9F7] min-h-screen">
      <div className="max-w-5xl mx-auto px-1 sm:px-6 py-10 sm:py-14">
        <header className="text-center px-3 mb-8 sm:mb-10 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">Author Spotlight</span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">Our Authors, In Their Words</h1>
          <p className="text-sm text-[#5C6E6E]">Moments and messages from authors who published with Harglim.</p>
        </header>

        {error && items.length === 0 ? (
          <div className="max-w-md mx-auto text-center rounded-2xl border border-[#E2E6DF] bg-white p-8 space-y-3">
            <p className="font-serif font-bold text-[#0F3D3E]">We couldn&apos;t load the spotlight right now.</p>
            <Button onClick={loadNext} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold">
              Try again
            </Button>
          </div>
        ) : !loading && !firstLoad && items.length === 0 ? (
          <div className="max-w-md mx-auto text-center rounded-2xl border border-dashed border-[#E2E6DF] bg-white p-10 space-y-2">
            <Camera className="h-8 w-8 mx-auto text-[#8A6D1E]" />
            <p className="font-serif font-bold text-[#0F3D3E]">Author photos are coming soon.</p>
            <p className="text-sm text-[#5C6E6E]">Check back after our next book launch.</p>
          </div>
        ) : (
          <>
            <SpotlightGrid
              items={items}
              onSelect={setOpenIndex}
              loadingCount={loading ? (firstLoad ? 12 : 6) : 0}
              className="grid-cols-2 sm:grid-cols-3 gap-0.5 sm:gap-1"
            />

            <div ref={sentinelRef} className="h-px" aria-hidden="true" />

            <div className="flex justify-center py-8">
              {error ? (
                <Button onClick={loadNext} variant="outline" className="font-bold">
                  Couldn&apos;t load more. Try again
                </Button>
              ) : hasMore ? (
                <Button onClick={loadNext} disabled={loading} variant="outline" className="font-bold gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Loading…" : "Load more"}
                </Button>
              ) : (
                items.length > 0 && <p className="text-xs text-[#5C6E6E]">You&apos;ve seen every spotlight.</p>
              )}
            </div>
          </>
        )}
      </div>

      <SpotlightLightbox items={items} index={openIndex} onIndexChange={setOpenIndex} />
    </div>
  );
}
