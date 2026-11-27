"use client";
import type { Book } from "@/types";
import { describeApiError } from "@/lib/api-error";


import { useState, useEffect, useCallback } from "react";
import Image from '@/components/ui/backend-image';
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Search, Filter, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/ui/error-state";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import { parseReaderCollection } from "@/lib/reader-collections";

type LibraryBook = Partial<Book> & { cover?: string; purchasedAt?: string; orderNumber?: string };

export default function LibraryPage() {
  const userId = useAuthStore((state) => state.user?._id || state.user?.id);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [revision, setRevision] = useState(0);
  const fetchLibrary = useCallback(async (signal: AbortSignal) => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get(`/users/${userId}/library`, {
        params: { page, limit: 24, q: searchQuery.trim() || undefined, format: formatFilter === "all" ? "digital" : formatFilter },
        signal, cache: "no-store",
      });
      if (signal?.aborted) return;
      const result = parseReaderCollection<LibraryBook>(data, "library");
      setPages(result.pages);
      if (page > result.pages) setPage(result.pages);
      else setLibraryBooks(result.books);
    } catch (err) {
      if (signal?.aborted) return;
      console.error("Failed to fetch library:", describeApiError(err));
      setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId, page, searchQuery, formatFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void fetchLibrary(controller.signal), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [fetchLibrary, revision]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
          My Library
        </h1>
        <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
          View digital editions available in your account.
        </p>
      </div>

      {/* Filter & Search */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
              <Input
                aria-label="Search library"
                placeholder="Search by title"
                maxLength={100}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 bg-white border-[#E2E6DF]"
              />
            </div>
            <Select value={formatFilter} onValueChange={(value) => { setFormatFilter(value); setPage(1); }}>
              <SelectTrigger aria-label="Filter library by format" className="w-full sm:w-44 bg-white border-[#E2E6DF]">
                <Filter className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="ebook">E-books</SelectItem>
                <SelectItem value="audiobook">Audiobooks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Books Display */}
      {error ? (
        <ErrorState
          title="Unable to load library"
          message="We couldn't fetch your library books right now. Please try again."
          onRetry={() => setRevision((value) => value + 1)}
        />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F3D3E]" />
        </div>
      ) : libraryBooks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {libraryBooks.map((book, index) => (
            <motion.div
              key={book.id || book._id || index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E]/40 hover:shadow-md transition-all rounded-2xl overflow-hidden group">
                <div className="relative aspect-[2/3] bg-[#F8F9F7]">
                  <Image
                    src={book.coverImage || book.cover || "/placeholder-book.svg"}
                    alt={book.title || "Book cover"}
                    fill
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <Badge className="absolute top-3 right-3 bg-[#0F3D3E] text-white font-serif">
                    {book.format || "Edition"}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E] [overflow-wrap:anywhere]">
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#5C6E6E] mt-0.5">
                    {typeof book.author === "object" ? book.author?.name : book.author}
                  </p>
                  <Button asChild size="sm" className="w-full mt-4 bg-[#0F3D3E] text-white hover:bg-[#174C4D] gap-1.5 text-xs font-medium">
                    <Link href={`/books/${book.slug || book._id || book.id}`}>View Book Details</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Empty State (Clean + Guided strictly matching prompt) */
        <Card className="bg-white border border-dashed border-[#E2E6DF] shadow-xs rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F3D3E]/10 text-[#0F3D3E] mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="font-serif font-bold text-xl text-[#0F3D3E]">
              {searchQuery || formatFilter !== "all" ? "No matching editions" : "No digital editions yet"}
            </h3>
            <p className="text-[#5C6E6E] text-sm max-w-sm mt-1.5 mb-6 leading-relaxed">
              {searchQuery || formatFilter !== "all" ? "Clear your filters to see more editions." : "Browse the catalog for available digital formats."}
            </p>
            <Button asChild className="bg-[#0F3D3E] text-white hover:bg-[#174C4D] font-medium px-6 shadow-sm gap-2">
              <Link href="/books">
                <Compass className="h-4 w-4 text-[#D4AF37]" />
                <span>Browse Books</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {!loading && !error && pages > 1 && (
        <nav aria-label="Collection pages" className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
        </nav>
      )}
    </div>
  );
}
