"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { extractList } from "@/lib/tracking";

export default function LibraryPage() {
  const { user } = useAuthStore();
  const [libraryBooks, setLibraryBooks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLibrary = async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get(`/users/${userId}/library`, { params: { limit: 100 }, cache: "no-store" } as any);
      const booksData = extractList(data, "library").length ? extractList(data, "library") : extractList(data, "books");
      // Entries may be books or { book, purchasedAt, order } rows.
      setLibraryBooks(
        booksData
          .map((entry: any) =>
            entry?.book && typeof entry.book === "object"
              ? { ...entry.book, purchasedAt: entry.purchasedAt || entry.createdAt, orderNumber: entry.order?.orderNumber || entry.orderNumber }
              : entry
          )
          .filter((book: any) => book && (book._id || book.id || book.title))
      );
    } catch (err) {
      console.error("Failed to fetch library:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, [user]);

  const filteredBooks = libraryBooks.filter((book) => {
    const title = (book.title || "").toLowerCase();
    const author = ((book.author && typeof book.author === "object") ? book.author?.name : (typeof book.author === "string" ? book.author : ""))?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();

    const matchesSearch = title.includes(query) || author.includes(query);
    // Backend formats are lowercase enums (paperback / hardcover / ebook / audiobook).
    const matchesFormat = formatFilter === "all" || String(book.format || "").toLowerCase() === formatFilter.toLowerCase();
    return matchesSearch && matchesFormat;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
          My Personal Library
        </h1>
        <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
          Access your purchased digital editions and track your reading journey.
        </p>
      </div>

      {/* Filter & Search */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
              <Input
                placeholder="Search your library books by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-[#E2E6DF]"
              />
            </div>
            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="w-full sm:w-44 bg-white border-[#E2E6DF]">
                <Filter className="mr-2 h-4 w-4 text-[#5C6E6E]" />
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="eBook">eBook</SelectItem>
                <SelectItem value="Paperback">Paperback</SelectItem>
                <SelectItem value="Hardcover">Hardcover</SelectItem>
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
          onRetry={fetchLibrary}
        />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F3D3E]" />
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book, index) => (
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
                    alt={book.title}
                    fill
                    sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <Badge className="absolute top-3 right-3 bg-[#0F3D3E] text-white font-serif">
                    {book.format || "Edition"}
                  </Badge>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E] line-clamp-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-[#5C6E6E] mt-0.5">
                    {(book.author && typeof book.author === "object") ? book.author?.name : (typeof book.author === "string" ? book.author : "Harglim Press")}
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
              No books yet
            </h3>
            <p className="text-[#5C6E6E] text-sm max-w-sm mt-1.5 mb-6 leading-relaxed">
              Start exploring and build your library
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
    </div>
  );
}
