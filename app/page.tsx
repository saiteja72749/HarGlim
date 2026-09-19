"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Users,
  Truck,
  Star,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Search,
  TrendingUp,
  Feather,
  Layers,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookCard } from "@/components/books/book-card";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import type { Book } from "@/types";
import { getBookAuthorInfo } from "@/lib/utils";

import { useSiteContent } from "@/context/site-content-context";

const whyChooseBlocks = [
  {
    title: "100% Author Rights & Freedom",
    description: "You retain total copyright ownership and creative control over your manuscript and book covers.",
    icon: Feather,
    highlight: "Author Centric",
  },
  {
    title: "Premium Print & Hardcover Quality",
    description: "Acid-free archival paper, rich color saturation, and durable matte/gloss hardcover bindings.",
    icon: Layers,
    highlight: "Luxury Finish",
  },
  {
    title: "Pan-India Express Distribution",
    description: "Direct listing across online stores, local bookstore partnerships, and fast door-step delivery.",
    icon: Truck,
    highlight: "Fast Delivery",
  },
  {
    title: "Transparent Royalty Settlements",
    description: "Real-time dashboard reporting on copy sales, transparent split, and automated monthly payouts.",
    icon: ShieldCheck,
    highlight: "Guaranteed Payouts",
  },
];

const defaultFaqs = [
  {
    question: "How do I publish my manuscript with Harglim Publishers?",
    answer: "Getting published is simple! Navigate to our 'Publish With Us' page, fill out the manuscript submission form with your book details, sample chapters, and contact information. Our editorial review team will respond within 3 to 5 business days.",
  },
  {
    question: "What royalty percentages do authors earn on book sales?",
    answer: "Authors earn up to 70% net royalties on print sales and e-books. All earnings are calculated transparently and visible inside your Author Dashboard with automated monthly settlements.",
  },
  {
    question: "Do I retain full copyright ownership of my book?",
    answer: "Yes, 100%! You retain complete copyright ownership, translation rights, and adaptation rights to your work. Harglim Publishers acts strictly as your printing, distribution, and publishing partner.",
  },
  {
    question: "How long does shipping take for ordered books?",
    answer: "Orders are processed and printed within 24 to 48 hours. Express shipping across India typically arrives within 3 to 5 business days with live SMS and email tracking.",
  },
];

export default function Home() {
  const { content } = useSiteContent();
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);
  const [bestsellers, setBestsellers] = useState<Book[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [liveStats, setLiveStats] = useState({ booksCount: 0, authorsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(false);

  // FAQ Accordion & Search State
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Parse FAQs dynamically if provided in site content
  let activeFaqs = defaultFaqs;
  if (content?.faqsJson) {
    try {
      const parsed = JSON.parse(content.faqsJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        activeFaqs = parsed;
      }
    } catch {
      // Fallback
    }
  }

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      setError(false);

      const [booksRes, bestsellersRes, categoriesRes, authorsRes] = await Promise.allSettled([
        api.get("/books?featured=true&limit=8").catch(() => api.get("/books?isFeatured=true&limit=8")),
        api.get("/books?sort=rating&limit=4").catch(() => api.get("/books?bestseller=true&limit=4")),
        api.get("/categories?featured=true&limit=6").catch(() => api.get("/categories?limit=6")),
        api.get("/authors?limit=6"),
      ]);

      if (booksRes.status === "fulfilled") {
        const data = booksRes.value.data;
        const items = data?.data?.books || data?.data || data || [];
        const rawList = Array.isArray(items) ? items : [];
        // Strictly enforce Feature on Home (isFeatured) flag; new release alone must not qualify
        const strictlyFeatured = rawList.filter((b: any) => b.isFeatured === true || b.featured === true);
        setFeaturedBooks(strictlyFeatured);
      }

      if (bestsellersRes.status === "fulfilled") {
        const data = bestsellersRes.value.data;
        const items = data?.data?.books || data?.data || data || [];
        setBestsellers(Array.isArray(items) ? items : []);
      }

      if (categoriesRes.status === "fulfilled") {
        const data = categoriesRes.value.data;
        const items = data?.data?.categories || data?.data || data || [];
        setCategories(Array.isArray(items) ? items : []);
      }

      if (authorsRes.status === "fulfilled") {
        const data = authorsRes.value.data;
        const items = data?.data?.authors || data?.data || data || [];
        setAuthors(Array.isArray(items) ? items : []);
      }

      const [booksCountRes, authorsCountRes] = await Promise.allSettled([
        api.get("/books?limit=1"),
        api.get("/authors?limit=1"),
      ]);

      let booksCount = 0;
      let authorsCount = 0;

      if (booksCountRes.status === "fulfilled") {
        const total = booksCountRes.value.data?.pagination?.total ?? booksCountRes.value.data?.data?.pagination?.total;
        if (typeof total === "number") booksCount = total;
      }

      if (authorsCountRes.status === "fulfilled") {
        const total = authorsCountRes.value.data?.pagination?.total ?? authorsCountRes.value.data?.data?.pagination?.total;
        if (typeof total === "number") authorsCount = total;
      }

      setLiveStats({ booksCount, authorsCount });
    } catch (error) {
      console.error("Failed to fetch home page data:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const filteredFaqs = activeFaqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="bg-[#F8F9F7] text-[#0F3D3E] overflow-hidden font-sans">
      
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
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-white leading-[1.1] whitespace-pre-line">
                {content?.homeTitle || "You write, we print.\nYou dream, we publish"}
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto lg:mx-0 font-light leading-relaxed">
                {content?.homeSubtitle ||
                  "Discover inspiring stories from extraordinary authors across multiple genres, or publish your own literary masterpiece with Harglim Publishers."}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Link href="/publish">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-14 px-8 rounded-full shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:shadow-[0_0_35px_rgba(212,175,55,0.6)] transition-all gap-2 text-base"
                  >
                    <span>{content?.homeCtaButtonText || "Start Your Publishing Journey"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/books">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border-2 border-white/40 text-white font-serif font-bold h-14 px-8 rounded-full text-base transition-all"
                  >
                    <span>{content?.homeHeroCtaText || "Explore Books Catalog"}</span>
                  </Button>
                </Link>
              </div>

              {/* Trust Badges */}
              <div className="pt-8 border-t border-white/10 grid grid-cols-2 gap-4 text-left">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-[#D4AF37]" />
                    <span className="font-serif font-bold text-sm text-white">{liveStats.booksCount}+</span>
                  </div>
                  <p className="text-[11px] text-white/60 hidden sm:block font-sans">Books Published</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-400" />
                    <span className="font-serif font-bold text-sm text-white">{liveStats.authorsCount}+</span>
                  </div>
                  <p className="text-[11px] text-white/60 hidden sm:block font-sans">Happy Authors</p>
                </div>
              </div>
            </motion.div>

            {/* Right Column: 3D Floating Book Mockup (5 Cols) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-5 flex justify-center"
            >
              <div className="relative w-full max-w-[340px] aspect-[2/3] group">
                {/* Aura Glow */}
                <div className="absolute -inset-4 bg-gradient-to-r from-[#D4AF37]/30 to-emerald-500/30 rounded-3xl blur-2xl opacity-60 group-hover:opacity-100 transition-opacity" />

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
                  // Only feature a book on the homepage hero if "Feature on Home" is explicitly enabled
                  const heroBook = featuredBooks.find((b: any) => b.isFeatured === true || b.featured === true) || null;
                  const heroAuthor = heroBook ? getBookAuthorInfo(heroBook).name : "Harglim Publishers Catalog";
                  const heroCover = heroBook?.coverImage && (heroBook.coverImage.startsWith("http") || heroBook.coverImage.startsWith("/"))
                    ? heroBook.coverImage
                    : "/logo.webp";
                  const heroTitle = heroBook?.title || "Discover Inspiring Books";
                  const heroTag = heroBook ? "Featured on Home" : "Harglim Publishers";

                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, y: [0, -10, 0] }}
                      transition={{ opacity: { duration: 0.5 }, y: { repeat: Infinity, duration: 4, ease: "easeInOut" } }}
                      className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/40 bg-[#0C3233] flex flex-col justify-end"
                    >
                      <Image
                        src={heroCover}
                        onError={(e: any) => {
                          if (e?.target) {
                            e.target.src = "/logo.webp";
                          }
                        }}
                        alt={heroTitle}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0F3D3E] via-[#0F3D3E]/40 to-transparent opacity-90" />
                      <div className="absolute bottom-6 left-6 right-6 space-y-1.5 text-white z-10">
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
            <div className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Nationwide Dispatch</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">Tracked India Post & Express</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">100% Verified UPI</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">Instant UTR confirmation</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Fine Print Quality</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">Premium paper & binding</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#F8F9F7] transition-colors">
              <div className="h-11 w-11 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-[#8A6D1E]" />
              </div>
              <div>
                <p className="font-serif font-bold text-xs sm:text-sm text-[#0F3D3E]">Direct Royalties</p>
                <p className="text-[11px] text-[#5C6E6E] font-sans">Transparent author payouts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. FEATURED BOOKS CAROUSEL (Smooth Landing with Zero Layout Jumps) */}
      {/* ------------------------------------------------------------------ */}
      {(loading || featuredBooks.length > 0) && (
        <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8A6D1E] mb-1">
                <TrendingUp className="h-4 w-4" />
                <span>Curated Selection</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
                Featured Releases
              </h2>
            </div>
            <Link href="/books" className="hidden sm:flex items-center gap-1 text-sm font-serif font-bold text-[#0F3D3E] hover:text-[#D4AF37] transition-colors">
              <span>View All Books</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white/80 rounded-2xl border border-[#E2E6DF] p-3 sm:p-4 space-y-3 shadow-xs animate-pulse">
                  <div className="aspect-[2/3] w-full bg-[#F0F2EE] rounded-xl relative overflow-hidden" />
                  <div className="space-y-2 pt-1">
                    <div className="h-4 bg-[#E2E6DF] rounded-md w-4/5" />
                    <div className="h-3 bg-[#E2E6DF]/60 rounded-md w-1/2" />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="h-4 bg-[#E2E6DF] rounded-md w-1/3" />
                    <div className="h-8 w-8 bg-[#E2E6DF] rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.08 }
                }
              }}
              className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {featuredBooks.slice(0, 4).map((book) => (
                <motion.div
                  key={book._id || (book as any).id}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
                  }}
                >
                  <BookCard book={book} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      )}

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
            <Link href="/categories" className="hidden sm:flex items-center gap-1 text-sm font-serif font-bold text-[#0F3D3E] hover:text-[#D4AF37]">
              <span>All Categories</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((cat: any) => (
              <Link
                key={cat._id || cat.id || cat.slug}
                href={`/categories/${cat.slug || cat._id}`}
                className="group p-5 bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl text-center shadow-xs hover:shadow-md transition-all space-y-2 block"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] group-hover:bg-[#0F3D3E] group-hover:text-[#D4AF37] flex items-center justify-center mx-auto transition-colors">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-serif font-bold text-sm text-[#0F3D3E] line-clamp-1 group-hover:text-[#D4AF37]">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-[#5C6E6E]">
                  {cat.bookCount || cat.booksCount || 0} Books
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 5. BESTSELLERS / TOP RATED THIS WEEK (/api/books API) */}
      {/* ------------------------------------------------------------------ */}
      {(loading || bestsellers.length > 0) && (
        <section className="py-16 sm:py-20 bg-white border-y border-[#E2E6DF]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#8A6D1E] mb-1">
                  <Star className="h-4 w-4 fill-[#D4AF37]" />
                  <span>Reader Favorites</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
                  Top Rated This Week
                </h2>
              </div>
              <Link href="/books" className="hidden sm:flex items-center gap-1 text-sm font-serif font-bold text-[#0F3D3E] hover:text-[#D4AF37] transition-colors">
                <span>Explore Catalog</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-white rounded-2xl border border-[#E2E6DF] p-3 sm:p-4 space-y-3 shadow-xs animate-pulse">
                    <div className="aspect-[2/3] w-full bg-[#F0F2EE] rounded-xl relative overflow-hidden" />
                    <div className="space-y-2 pt-1">
                      <div className="h-4 bg-[#E2E6DF] rounded-md w-4/5" />
                      <div className="h-3 bg-[#E2E6DF]/60 rounded-md w-1/2" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div className="h-4 bg-[#E2E6DF] rounded-md w-1/3" />
                      <div className="h-8 w-8 bg-[#E2E6DF] rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.08 }
                  }
                }}
                className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {bestsellers.map((book) => (
                  <motion.div
                    key={book._id || (book as any).id}
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
                    }}
                  >
                    <BookCard book={book} />
                  </motion.div>
                ))}
              </motion.div>
            )}
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
            {authors.slice(0, 6).map((author: any) => (
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
                    {author.bookCount || author.booksCount || 1} Published
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
      <section className="py-16 sm:py-20 bg-white border-t border-[#E2E6DF]">
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
              placeholder="Search questions (e.g. royalties, publishing, delivery)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="pl-10 h-11 bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm"
            />
          </div>

          {/* Accordion List */}
          <div className="space-y-4 pt-2">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-[#E2E6DF] rounded-2xl bg-[#F8F9F7] overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-serif font-bold text-base text-[#0F3D3E] hover:text-[#D4AF37]"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? <ChevronUp className="h-5 w-5 shrink-0 text-[#D4AF37]" /> : <ChevronDown className="h-5 w-5 shrink-0 text-[#5C6E6E]" />}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-5 pb-5 pt-0 text-xs sm:text-sm text-[#5C6E6E] leading-relaxed border-t border-[#E2E6DF]/60 font-sans"
                        >
                          {faq.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-[#5C6E6E] py-8">
                No questions found matching &ldquo;{faqSearch}&rdquo;. Try another search term.
              </p>
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
