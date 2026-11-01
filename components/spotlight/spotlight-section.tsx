"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotlightGrid } from "@/components/spotlight/spotlight-grid";
import { SpotlightLightbox } from "@/components/spotlight/spotlight-lightbox";
import { fetchSpotlights, type Spotlight } from "@/lib/spotlights";

const PREVIEW_COUNT = 6;

/** Six spotlight photos (3×2 desktop, 2 columns mobile) and a link to the full /spotlight feed. */
export function SpotlightSection() {
  const [items, setItems] = useState<Spotlight[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { items: page } = await fetchSpotlights(1, PREVIEW_COUNT);
      setItems(page.slice(0, PREVIEW_COUNT));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section id="spotlight" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">Author Spotlight</span>
        <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">Our Authors, In Their Words</h2>
        <p className="text-sm text-[#5C6E6E]">Moments and messages from authors who published with Harglim.</p>
      </div>

      {status === "error" ? (
        <div className="max-w-md mx-auto text-center rounded-2xl border border-[#E2E6DF] bg-white p-8 space-y-3">
          <p className="font-serif font-bold text-[#0F3D3E]">We couldn&apos;t load the spotlight right now.</p>
          <Button onClick={load} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold">
            Try again
          </Button>
        </div>
      ) : status === "ready" && items.length === 0 ? (
        <div className="max-w-md mx-auto text-center rounded-2xl border border-dashed border-[#E2E6DF] bg-white p-8 space-y-2">
          <Camera className="h-8 w-8 mx-auto text-[#8A6D1E]" />
          <p className="font-serif font-bold text-[#0F3D3E]">Author photos are coming soon.</p>
        </div>
      ) : (
        <>
          <SpotlightGrid
            items={items}
            onSelect={setOpenIndex}
            loadingCount={status === "loading" ? PREVIEW_COUNT : 0}
            className="max-w-4xl mx-auto grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 [&_button]:rounded-xl [&_li>div]:rounded-xl"
          />
          {status === "ready" && (
            <div className="text-center pt-8">
              <Link href="/spotlight" className="inline-block">
                <Button className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-serif font-bold h-12 px-8 rounded-xl gap-2">
                  <span>View more</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      <SpotlightLightbox items={items} index={openIndex} onIndexChange={setOpenIndex} />
    </section>
  );
}
