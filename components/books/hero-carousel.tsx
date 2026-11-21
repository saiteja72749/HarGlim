"use client";

import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { Book } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useCarouselState } from "@/hooks/use-carousel-state";
import { cn } from "@/lib/utils";

interface HeroCarouselProps {
  books: Book[];
}

export function HeroCarousel({ books }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", skipSnaps: false },
    [Autoplay({ delay: 5000, stopOnInteraction: false })]
  );
  
  const { selectedIndex } = useCarouselState(emblaApi);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  // If no books, fallback to the original static hero (or a loading state)
  if (!books || books.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden" ref={emblaRef}>
      <div className="flex touch-pan-y">
        {books.map((book, index) => (
          <div key={book._id || index} className="flex-[0_0_100%] min-w-0 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-28 md:py-20 lg:py-24 flex flex-col md:flex-row items-center gap-12 lg:gap-24 relative z-10">
              
              {/* Text Content */}
              <motion.div 
                initial="hidden" 
                whileInView="visible" 
                viewport={{ once: true }} 
                variants={staggerContainer} 
                className="flex-1 text-center md:text-left text-white"
              >
                <motion.div variants={fadeInUp} className="mb-6">
                   <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-xs md:text-sm font-semibold backdrop-blur-md border border-white/20 shadow-lg uppercase tracking-wider text-primary-foreground">
                    <Sparkles className="h-4 w-4 text-yellow-300" />
                    Trending Now
                  </span>
                </motion.div>
                
                <motion.h1 variants={fadeInUp} className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-6 leading-tight tracking-tight line-clamp-2">
                  {book.title}
                </motion.h1>
                
                <motion.p variants={fadeInUp} className="text-lg md:text-xl mb-10 text-primary-foreground/90 font-light leading-relaxed line-clamp-3 max-w-xl">
                  {book.description}
                </motion.p>
                
                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link href={`/books/${book.slug || book._id}`}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="text-base px-8 h-12 font-bold bg-white text-primary hover:bg-primary-foreground shadow-xl hover:shadow-2xl transition-all rounded-full">
                        Read Now
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </motion.div>
                  </Link>
                </motion.div>
              </motion.div>

              {/* Image Content */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className="flex-1 relative perspective-1000 w-full max-w-[240px] sm:max-w-xs md:max-w-sm lg:max-w-md mx-auto"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/30 transform-style-3d group">
                  <Image 
                    src={book.coverImage || "/placeholder-book.svg"} 
                    alt={book.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60" />
                  {/* Subtle glare effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 translate-x-full group-hover:-translate-x-full" />
                </div>
              </motion.div>
            </div>
            
            {/* Slide Background blur */}
            <motion.div className="absolute inset-0 z-0">
               <Image 
                 src={book.coverImage || "/placeholder-book.svg"} 
                 alt="" 
                 fill 
                 className="object-cover opacity-30 blur-3xl scale-110 transform-gpu"
               />
               <div className="absolute inset-0 bg-gradient-to-b from-primary/95 to-primary/80 mix-blend-multiply" />
            </motion.div>
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-16 left-0 right-0 z-40 flex items-center justify-center gap-6">
        <button
          onClick={scrollPrev}
          aria-label="Previous slide"
          className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-50"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex gap-3">
          {books.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi && emblaApi.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === selectedIndex ? "true" : undefined}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === selectedIndex ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
        <button
          onClick={scrollNext}
          aria-label="Next slide"
          className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-50"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
