"use client";
import { scheduleRequest } from "@/lib/schedule-request";
import { publishedNumber } from "@/lib/book-presentation";
import { publicApiMessage, publicRetryAt, record } from "@/lib/api-error";


import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from '@/components/ui/backend-image';
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Users,
  Truck,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Search,
  Feather,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeBookShelf } from "@/components/books/home-book-shelf";
import { Input } from "@/components/ui/input";
import { getPublic } from "@/lib/api";
import { uniqueBooks } from "@/lib/catalog";
import { ErrorState } from "@/components/ui/error-state";
import type { Book, Category, Author } from "@/types";
import { fetchBackendCategories } from "@/lib/categories";
import { onLiveChange } from "@/lib/live-sync";
import { getBookAuthorInfo } from "@/lib/utils";

import { useSiteContent } from "@/context/site-content-context";
import { flattenFaqs, readSection } from "@/lib/page-content";
import { fetchPublicStats } from "@/lib/public-stats";
import { cn } from "@/lib/utils";

const WHY_CHOOSE_ICONS = [Feather, Layers, Truck, ShieldCheck];


const extractBooks = (input: unknown): Book[] => {
  const data = record(input);
  const items = record(data.data).books || data.books || data.data || input || [];
  if (!Array.isArray(items)) throw new Error("The backend returned an invalid book list.");
  return items as Book[];
};

const getOptimizedCoverImage = (src?: string) => {
  if (!src || (!src.startsWith("http") && !src.startsWith("/"))) {
    return "/logo.png";
  }

  if (src.startsWith("https://res.cloudinary.com/") && src.includes("/upload/")) {
    return src.replace("/upload/", "/upload/f_auto,q_auto,w_680,c_limit/");
  }

  return src;
};

export default function Home() {
  const { content } = useSiteContent();
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  // null until the backend answers, so the counters never flash "0+" on refresh.
  const [liveStats, setLiveStats] = useState<{ booksCount: number; authorsCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [featuredError, setFeaturedError] = useState<unknown>(null);
  const [categoryError, setCategoryError] = useState<unknown>(null);

  // Hero featured-book rotation
  const [heroIndex, setHeroIndex] = useState(0);

  // FAQ Accordion & Search State
  const [faqSearch, setFaqSearch] = useState("");

  // Copy from Admin → Site Content: FAQs (categorised or flat) and the "why choose us" cards.
  const parseFaqs = (raw?: string) => {
    try {
      return flattenFaqs(JSON.parse(raw || ""));
    } catch {
      return [];
    }
  };
  const savedFaqs = parseFaqs(content?.faqsJson);
  const activeFaqs = savedFaqs;
  const whyChooseBlocks = readSection<{ title: string; description: string; highlight?: string }>(
    content,
    "homeWhyChooseJson"
  ).map((block, idx) => ({ ...block, icon: WHY_CHOOSE_ICONS[idx % WHY_CHOOSE_ICONS.length] }));

  const fetchFeaturedBooks = useCallback(async () => {
    setLoading(true);
    setFeaturedError(null);
    try {
      const { data } = await getPublic("/books", { params: { featured: true, limit: 8 } });
      setFeaturedBooks(uniqueBooks(extractBooks(data).filter((book) => book.isFeatured === true || book.featured === true)));
    } catch (error) {
      setFeaturedError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHomeCategories = useCallback(async (fresh = false) => {
    setCategoryError(null);
    try {
      const items = await fetchBackendCategories(fresh);
      setCategories(items.filter((category) => category.featured).slice(0, 6) as Category[]);
    } catch (error) {
      setCategoryError(error);
    }
  }, []);

  const fetchHomeData = useCallback(async () => {
    setError(false);
    const [authorsRes, statsRes] = await Promise.allSettled([
      getPublic("/authors", { params: { limit: 6 } }),
      fetchPublicStats(),
    ]);
    if (authorsRes.status === "fulfilled") {
      const data = authorsRes.value.data;
      const items = data?.data?.authors || data?.data || data;
      if (Array.isArray(items)) setAuthors(items);
      else setError(true);
    }
    if (statsRes.status === "fulfilled") setLiveStats(statsRes.value);
    if (authorsRes.status === "rejected" || statsRes.status === "rejected") setError(true);
  }, []);

  useEffect(() => scheduleRequest(fetchHomeData), [fetchHomeData]);

  useEffect(() => scheduleRequest(fetchHomeCategories), [fetchHomeCategories]);

  useEffect(() => {
    return onLiveChange("categories", (reason) => void fetchHomeCategories(reason === "change"), 60_000);
  }, [fetchHomeCategories]);

  useEffect(() => scheduleRequest(fetchFeaturedBooks), [fetchFeaturedBooks]);

  useEffect(() => {
    return onLiveChange("books", () => {
      void fetchFeaturedBooks();
    }, 20_000);
  }, [fetchFeaturedBooks]);

  const filteredFaqs = activeFaqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="bg-[#F8F9F7] text-[#0F3D3E] overflow-hidden font-sans">
      {error && <div className="mx-auto max-w-7xl px-4 py-6"><ErrorState title="Some website information could not load" onRetry={fetchHomeData} /></div>}
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO SECTION (Layered Gradient + Floating Book Mockup + CTAs) */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white pt-24 pb-20 md:pt-32 md:pb-28 lg:pt-36 lg:pb-32 overflow-hidden">
        {/* Subtle Background Glow Spheres */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content (7 Cols) */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-7 text-center lg:text-left space-y-6"
            >
              {/* Top Tag Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold tracking-wide shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Professional Book Publishing &amp; Distribution House</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-[clamp(2rem,5.5vw,4.5rem)] font-serif font-bold tracking-tight text-white leading-[1.1] whitespace-pre-line">
                {content.homeTitle || "You write, we print. You dream, we publish."}
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
                {content.homeSubtitle}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Button
                    size="lg"
                    className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-14 px-8 rounded-full transition-colors gap-2 text-base"
                   asChild><Link href="/publish">
                    <span>{content.homeCtaButtonText || "Publish"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link></Button>

                <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border-2 border-white/40 text-white font-serif font-bold h-14 px-8 rounded-full text-base transition-all"
                   asChild><Link href="/books">
                    <span>{content.homeHeroCtaText || "Browse Books"}</span>
                  </Link></Button>
              </div>

              {/* Trust Badges */}
              {liveStats && <div className="pt-5 border-t border-white/10 grid grid-cols-2 gap-4 text-left">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-[#D4AF37]" />
                    <span className="font-serif font-bold text-sm text-white">{liveStats ? `${liveStats.booksCount}+` : "—"}</span>
                  </div>
                  <p className="text-sm text-white/75">Books Published</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span className="font-serif font-bold text-sm text-white">{liveStats ? `${liveStats.authorsCount}+` : "—"}</span>
                  </div>
                  <p className="text-sm text-white/75">Authors</p>
                </div>
              </div>}
            </motion.div>

            {/* Right Column: 3D Floating Book Mockup (5 Cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className={cn("relative w-full max-w-[280px] lg:max-w-[310px]", (loading || featuredBooks.length > 0) && "aspect-[2/3]")}>

                {/* 3D Floating Book Cover Card */}
                {loading ? (
                    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/30 bg-[#0C3233] animate-pulse flex flex-col justify-end p-6">
                      <div className="space-y-3 z-10">
                        <div className="h-4 bg-[#D4AF37]/30 rounded-md w-1/3" />
                        <div className="h-6 bg-white/20 rounded-md w-3/4" />
                        <div className="h-3 bg-white/10 rounded-md w-1/2" />
                      </div>
                    </div>
                  ) : (() => {
                  const heroBooks = featuredBooks;
                  const activeIndex = heroBooks.length > 0 ? heroIndex % heroBooks.length : 0;
                  const heroBook = heroBooks[activeIndex] || null;
                  if (!heroBook) return <div className="relative rounded-2xl border border-white/20 p-8 text-center text-white/70" role="status">{featuredError ? "Featured books could not load." : "No featured books are currently published."}</div>;
                  const heroAuthor = heroBook ? getBookAuthorInfo(heroBook).name : "Harglim Publishers Catalog";
                  const heroCover = getOptimizedCoverImage(heroBook?.coverImage);
                  const heroTitle = heroBook?.title || "Discover Inspiring Books";
                  const heroTag = heroBook ? "Featured on Home" : "Harglim Publishers";
                  const heroHref = heroBook ? `/books/${heroBook.slug || heroBook._id}` : "/books";

                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, y: [0, -10, 0] }}
                      transition={{ opacity: { duration: 0.5 }, y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
                      className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/40 bg-[#0C3233]"
                    >
                      <AnimatePresence initial={false}>
                        <motion.div
                          key={heroBook?._id || "placeholder"}
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          className="absolute inset-0"
                        >
                          <Link href={heroHref} className="block w-full h-full">
                            <Image
                              src={heroCover}
                              onError={(e) => {
                                if (e?.target) {
                                  e.currentTarget.src = "/logo.png";
                                }
                              }}
                              alt={heroTitle}
                              fill
                              className="object-cover"
                              sizes="(max-width: 1024px) 340px, 28vw"
                              priority={activeIndex === 0}
                              unoptimized={heroCover.startsWith("https://res.cloudinary.com/")}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0F3D3E] via-[#0F3D3E]/40 to-transparent opacity-90" />
                            <div className="absolute bottom-10 left-6 right-6 space-y-1.5 text-white z-10">
                              <span className="px-2.5 py-0.5 rounded bg-[#D4AF37] text-[#0F3D3E] text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                {heroTag}
                              </span>
                              <p className="font-serif font-bold text-xl line-clamp-2">
                                {heroTitle}
                              </p>
                              <p className="text-xs text-white/80 font-medium">
                                {heroAuthor}
                              </p>
                            </div>
                          </Link>
                        </motion.div>
                      </AnimatePresence>

                      {heroBooks.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-1.5">
                          {heroBooks.map((b, i) => (
                            <button
                              key={b._id || i}
                              type="button"
                              aria-label={`Show featured book ${i + 1}`}
                              onClick={() => setHeroIndex(i)}
                              className={`h-1.5 rounded-full transition-all ${
                                i === activeIndex ? "w-6 bg-[#D4AF37]" : "w-1.5 bg-white/50 hover:bg-white/80"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })()}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      
      {/* ------------------------------------------------------------------ */}
      {/* TRUST & PUBLISHING EXCELLENCE STRIP */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-white border-b border-[#E2E6DF] py-6 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Link href="/track-order" className="flex min-w-0 items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] focus-visible:ring-2 focus-visible:ring-[#D4AF37] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Track an order</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">View shipment updates</p>
              </div>
            </Link>

            <Link href="/dashboard/payments" className="flex min-w-0 items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] focus-visible:ring-2 focus-visible:ring-[#D4AF37] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Your payments</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">View verification status</p>
              </div>
            </Link>

            <Link href="/books" className="flex min-w-0 items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] focus-visible:ring-2 focus-visible:ring-[#D4AF37] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Explore books</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">Browse the catalog</p>
              </div>
            </Link>

            <Link href="/author" className="flex min-w-0 items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] focus-visible:ring-2 focus-visible:ring-[#D4AF37] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Author dashboard</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">Books, sales and royalties</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {Boolean(featuredError) && <div className="mx-auto max-w-7xl px-4 py-6">
        <ErrorState title="Featured books could not load" message={publicApiMessage(featuredError, "Please retry to load featured books.")}
          retryAt={publicRetryAt(featuredError)} onRetry={() => void fetchFeaturedBooks()} />
      </div>}
      <HomeBookShelf />

      {/* ------------------------------------------------------------------ */}
      {/* 3. WHY CHOOSE HARGILM (Glassmorphic Trust Blocks) */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 sm:py-20 bg-white border-y border-[#E2E6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
              Why Publish With Us
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
              Built for Writers, Loved by Readers
            </h2>
            <p className="text-sm text-[#5C6E6E]">
              We empower authors with complete creative freedom, transparent royalty tracking, and nationwide bookstores distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseBlocks.map((block, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -6 }}
                className="bg-[#F8F9F7] border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-6 shadow-xs transition-all space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                    <block.icon className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4AF37]/20 text-[#0F3D3E]">
                    {block.highlight}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">{block.title}</h3>
                <p className="text-xs text-[#5C6E6E] leading-relaxed">{block.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. CATEGORIES / GENRE SHOWCASE (/api/categories API) */}
      {Boolean(categoryError) && <div className="mx-auto max-w-7xl px-4 py-6">
        <ErrorState title="Categories could not load" message={publicApiMessage(categoryError, "Please retry to load book categories.")}
          retryAt={publicRetryAt(categoryError)} onRetry={() => void fetchHomeCategories()} />
      </div>}
      {/* ------------------------------------------------------------------ */}
      {categories.length > 0 && (
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8A6D1E] mb-1">
                <BookOpen className="h-4 w-4" />
                <span>Explore Genres</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
                Browse by Category
              </h2>
            </div>
            <Link href="/books#catalog" className="flex items-center gap-1 text-sm font-serif font-bold text-primary hover:underline">
              <span>All Categories</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat._id || cat.id || cat.slug}
                href={`/books?category=${encodeURIComponent(cat.slug || cat._id)}`}
                className="group p-5 bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl text-center shadow-xs hover:shadow-md transition-all space-y-2 block"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] group-hover:bg-[#0F3D3E] group-hover:text-[#D4AF37] flex items-center justify-center mx-auto transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-serif font-bold text-sm text-[#0F3D3E] line-clamp-1 group-hover:text-[#D4AF37]">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-[#5C6E6E]">
                  {publishedNumber(cat.bookCount ?? cat.booksCount) === null ? "Book count unavailable" : `${cat.bookCount ?? cat.booksCount} Books`}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 6. FEATURED AUTHORS SPOTLIGHT (/api/authors API) */}
      {/* ------------------------------------------------------------------ */}
      {authors.length > 0 && (
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8A6D1E] mb-1">
                <Users className="h-4 w-4" />
                <span>Featured Voices</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
                Spotlight Authors
              </h2>
            </div>
            <Link href="/authors" className="hidden sm:flex items-center gap-1 text-sm font-serif font-bold text-[#0F3D3E] hover:text-[#D4AF37]">
              <span>Meet All Authors</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {authors.slice(0, 6).map((author) => (
              <Link
                key={author._id || author.id}
                href={`/authors/${author._id || author.id}`}
                className="group bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-4 text-center shadow-xs hover:shadow-md transition-all space-y-3 block"
              >
                <div className="h-16 w-16 rounded-full bg-[#0F3D3E] text-[#D4AF37] font-serif font-bold text-xl flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
                  {(author.name || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#0F3D3E] line-clamp-1 group-hover:text-[#D4AF37]">
                    {author.name}
                  </h3>
                  <p className="text-[11px] text-[#5C6E6E] mt-0.5">
                    {publishedNumber(author.bookCount ?? author.booksCount) === null ? "Book count unavailable" : `${author.bookCount ?? author.booksCount} Published`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. FAQ SECTION (Filterable Accordion with Search) */}
      {/* ------------------------------------------------------------------ */}
      {activeFaqs.length > 0 && <section className="py-16 sm:py-20 bg-white border-t border-[#E2E6DF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#5C6E6E]">
              Everything you need to know about our publishing process, distribution, and royalties.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              type="text"
              aria-label="Search frequently asked questions"
              placeholder="Search questions (e.g. royalties, publishing, delivery)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="pl-10 h-11 bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm"
            />
          </div>

          {/* Accordion List */}
          <div className="space-y-4 pt-2">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <details key={`${faq.question}-${index}`} className="rounded-xl border border-border bg-background">
                  <summary className="cursor-pointer px-5 py-4 font-serif font-semibold">{faq.question}</summary>
                  <p className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{faq.answer}</p>
                </details>
              ))
            ) : (
              <p className="text-center text-xs text-[#5C6E6E] py-8">
                No questions found matching &ldquo;{faqSearch}&rdquo;. Try another search term.
              </p>
            )}
          </div>
        </div>
      </section>}

      {/* ------------------------------------------------------------------ */}
      {/* BOTTOM CTA BANNER (Admin → Site Content → Home: Bottom Banner) */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold">{content.homeCtaHeading}</h2>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed">{content.homeCtaSubtitle}</p>
          <Button
              size="lg"
              className="bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-14 px-8 rounded-full gap-2 text-base"
             asChild><Link href="/publish" className="inline-block pt-2">
              <span>{content.homeCtaButtonText}</span>
              <ArrowRight className="h-4 w-4" />
            </Link></Button>
        </div>
      </section>

    </div>
  );
}
