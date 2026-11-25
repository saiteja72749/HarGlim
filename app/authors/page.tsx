"use client";
import { scheduleRequest } from "@/lib/schedule-request";
import { publishedNumber } from "@/lib/book-presentation";
import { onLiveChange } from '@/lib/live-sync';
import { describeApiError } from "@/lib/api-error";


import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from '@/components/ui/backend-image';
import { motion } from "framer-motion";
import {
  BookOpen,
  ArrowRight,
  Search,
  Sparkles,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import type { Author } from "@/types";
import { fetchPublicCollection } from "@/lib/public-collection";
import { invalidateApiCache } from "@/lib/api";

export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("books");

  const pending = useRef<AbortController | null>(null);
  const fetchAuthors = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError(false);
    try {
      const items = await fetchPublicCollection<Author>('/authors', 'authors', controller.signal);
      if (!controller.signal.aborted) setAuthors(items);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Failed to load authors:', describeApiError(error));
      setError(true); setAuthors([]);
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const cancelInitial = scheduleRequest(fetchAuthors);
    const unsubscribe = onLiveChange('author-data', (reason) => {
      if (reason === 'change') invalidateApiCache('/authors');
      void fetchAuthors();
    }, 60_000);
    return () => { cancelInitial(); unsubscribe(); pending.current?.abort(); };
  }, [fetchAuthors]);

  const filteredAuthors = authors
    .filter((author) => {
      const q = searchQuery.trim().toLowerCase();
      const name = (author.name || "").toLowerCase();
      const bio = (author.bio || "").toLowerCase();
      return name.includes(q) || bio.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "books") {
        return (publishedNumber(b.bookCount) ?? -1) - (publishedNumber(a.bookCount) ?? -1) || a.name.localeCompare(b.name);
      }
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

  const featuredAuthor = authors.length > 0
    ? [...authors].sort((a, b) => (b.bookCount || 0) - (a.bookCount || 0))[0]
    : null;

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E] font-sans">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO SECTION (Deep Green to Dark Teal Gradient) */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Voices Behind Our Stories</span>
          </div>

          <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-serif font-bold text-white tracking-tight">
            Our Authors
          </h1>

          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
            Meet the visionary writers and thinkers shaping literature across fiction, technology, business, and poetry.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. FEATURED AUTHOR BANNER (Top Highlight Section) */}
      {/* ------------------------------------------------------------------ */}
      {featuredAuthor && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <div className="bg-white border-2 border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#D4AF37]" />

            {/* Author Avatar / Initials */}
            <div className="md:col-span-3 flex justify-center">
              <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden border-4 border-[#0F3D3E] shadow-md bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center font-serif font-bold text-4xl">
                {featuredAuthor.profileImage ? (
                  <Image
                    src={featuredAuthor.profileImage}
                    alt={featuredAuthor.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span>{featuredAuthor.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            {/* Bio Content */}
            <div className="md:col-span-6 space-y-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs">
                  ⭐ Top Author Highlight
                </Badge>
                <span className="text-xs text-[#5C6E6E]">
                  {publishedNumber(featuredAuthor.bookCount) === null ? "Book count unavailable" : `${featuredAuthor.bookCount} Published Works`}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
                {featuredAuthor.name}
              </h2>
              {featuredAuthor.bio?.trim() && <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{featuredAuthor.bio}</p>}
            </div>

            {/* Action CTA */}
            <div className="md:col-span-3 text-center md:text-right">
              <Button
                asChild
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-sm h-12 px-6 rounded-xl shadow-xs"
              >
                <Link href={`/authors/${featuredAuthor._id}`}>
                  <span>Explore Works</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. TOOLBAR: SEARCH & SORTING */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E6DF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              type="text"
              placeholder="Search authors by name or biography..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-3 justify-end">
            <span className="text-xs text-[#5C6E6E] font-medium hidden sm:inline">Sort by:</span>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 h-11 bg-[#F8F9F7] border-[#E2E6DF] text-xs font-semibold">
                <SelectValue placeholder="Sort authors" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E2E6DF]">
                <SelectItem value="books" className="text-xs">Most Books Published</SelectItem>
                <SelectItem value="name" className="text-xs">Author Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. MAIN AUTHOR GRID (4 Desktop, 2 Tablet, 1 Mobile) */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white p-6 rounded-2xl border border-[#E2E6DF] text-center">
                <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="h-5 bg-gray-200 rounded w-2/3 mx-auto mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState
            title="Failed to load authors"
            message="We couldn't fetch the list of authors right now. Please try again."
            onRetry={fetchAuthors}
          />
        ) : filteredAuthors.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-[#E2E6DF] rounded-2xl p-8 space-y-3">
            <User className="h-10 w-10 text-[#5C6E6E]/40 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">No authors found</h3>
            <p className="text-xs text-[#5C6E6E]">No author profiles matched &ldquo;{searchQuery}&rdquo;.</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>Clear Search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAuthors.map((author) => {
              const count = publishedNumber(author.bookCount);

              return (
                <motion.div
                  key={author._id}
                  className="group relative bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-6 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col text-center justify-between cursor-pointer"
                >
                  <Link href={`/authors/${author._id}`} className="flex flex-col items-center h-full">
                    {/* Avatar / Styled Initials Fallback */}
                    <div className="relative w-24 h-24 mb-4 rounded-full overflow-hidden border-2 border-[#D4AF37]/50 shadow-sm bg-gradient-to-br from-[#0F3D3E] to-[#174C4D] text-[#D4AF37] flex items-center justify-center font-serif font-bold text-3xl group-hover:scale-105 transition-transform">
                      {author.profileImage ? (
                        <Image
                          src={author.profileImage}
                          alt={author.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span>{author.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Author Name */}
                    <h3 className="mb-1 font-serif text-lg font-bold [overflow-wrap:anywhere]">
                      {author.name}
                    </h3>

                    {/* Published Book Count Pill */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0F3D3E]/10 text-[#0F3D3E] text-xs font-bold mb-3">
                      <BookOpen className="h-3.5 w-3.5 text-[#D4AF37]" />
                      <span>{count === null ? "Book count unavailable" : `${count} Published Book${count === 1 ? "" : "s"}`}</span>
                    </div>

                    {/* Bio Snippet */}
                    {author.bio?.trim() && <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{author.bio}</p>}

                    {/* Bottom CTA Action */}
                    <div className="mt-auto pt-3 border-t border-[#E2E6DF]/60 w-full flex items-center justify-center gap-1 text-xs font-serif font-bold text-[#0F3D3E] group-hover:text-[#D4AF37] transition-colors">
                      <span>View Profile & Books</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
