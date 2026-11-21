"use client";

import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Book } from "@/types";
import { BookCard } from "@/components/books/book-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCarouselState } from "@/hooks/use-carousel-state";
import { cn } from "@/lib/utils";

interface FeaturedCarouselProps {
  books: Book[];
}

export function FeaturedCarousel({ books }: FeaturedCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    breakpoints: {
      "(min-width: 640px)": { slidesToScroll: 2 },
      "(min-width: 1024px)": { slidesToScroll: 3 },
      "(min-width: 1280px)": { slidesToScroll: 4 },
    },
  });

  const { canScrollPrev: prevBtnEnabled, canScrollNext: nextBtnEnabled } = useCarouselState(emblaApi);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  if (!books || books.length === 0) return null;

  return (
    <div className="relative group">
      <div className="overflow-hidden py-8 -my-8 px-4 -mx-4" ref={emblaRef}>
        <div className="flex gap-6">
          {books.map((book) => (
            <div key={book._id} className="flex-[0_0_65%] sm:flex-[0_0_40%] md:flex-[0_0_30%] lg:flex-[0_0_22%] xl:flex-[0_0_18%] min-w-0">
              <BookCard book={book} />
            </div>
          ))}
        </div>
      </div>

      {/* Controls - visible mostly on desktop on hover */}
      <button
        onClick={scrollPrev}
        disabled={!prevBtnEnabled}
        aria-label="Previous slide"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-12 w-12 rounded-full bg-background border border-border shadow-xl flex items-center justify-center text-primary transition-all z-10",
          !prevBtnEnabled ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-primary hover:text-primary-foreground"
        )}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={scrollNext}
        disabled={!nextBtnEnabled}
        aria-label="Next slide"
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-12 w-12 rounded-full bg-background border border-border shadow-xl flex items-center justify-center text-primary transition-all z-10",
          !nextBtnEnabled ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-primary hover:text-primary-foreground"
        )}
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
