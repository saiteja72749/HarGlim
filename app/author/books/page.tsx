"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Eye, Star, TrendingUp, Search, Loader2, DollarSign, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";
import { getCategoryDisplayName } from "@/lib/categories";

export default function AuthorBooksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<any[]>([]);
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const authorUserId = user._id || user.id;
      const resMe = await api.get("/authors/me/books").catch(() => null);
      let fetchedBooks: any[] =
        resMe?.data?.data?.books ||
        resMe?.data?.books ||
        (Array.isArray(resMe?.data?.data) ? resMe.data.data : []) ||
        (Array.isArray(resMe?.data) ? resMe.data : []);

      if (!Array.isArray(fetchedBooks) || fetchedBooks.length === 0) {
        const resPublic = await api.get("/books", { params: { author: authorUserId, limit: 100 } }).catch(() => null);
        const publicList = resPublic?.data?.data?.books || resPublic?.data?.data || resPublic?.data || [];
        if (Array.isArray(publicList) && publicList.length > 0) {
          fetchedBooks = publicList;
        }
      }

      setBooks(Array.isArray(fetchedBooks) ? fetchedBooks : []);
    } catch (error) {
      console.error("Failed to fetch author books:", error);
      toast.error("Could not load author books list.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const filteredBooks = books.filter((book) =>
    book.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalSales = books.reduce((sum, book) => sum + (book.totalSales || 0), 0);
  const totalRevenue = books.reduce((sum, book) => sum + (book.totalSales || 0) * (book.mrp || book.price || 0), 0);
  const avgRating = books.length > 0 ? books.reduce((sum, book) => sum + (book.rating || 0), 0) / books.length : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold lg:text-3xl text-[#0F3D3E] flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-[#8A6D1E]" />
            <span>My Author Books</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            View your published catalog. Book edits are handled by the Harglim publishing team.
          </p>
        </div>
        <Button asChild className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white rounded-xl text-xs font-bold gap-2">
          <Link href="/author/manuscripts/new">
            <Upload className="h-4 w-4" />
            <span>Upload Manuscript</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-5 w-5 text-[#0F3D3E]" />} value={books.length} label="Total Published" />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} value={totalSales} label="Copies Sold" />
        <StatCard icon={<DollarSign className="h-5 w-5 text-amber-700" />} value={`Rs ${totalRevenue.toLocaleString()}`} label="Gross Book Revenue" />
        <StatCard icon={<Star className="h-5 w-5 text-purple-700 fill-purple-700/20" />} value={avgRating.toFixed(1)} label="Reader Rating" />
      </div>

      <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search your published books by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#F8F9F7] text-xs h-10 border-[#E2E6DF] rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-[#E2E6DF] bg-[#F8F9F7]/50">
          <CardTitle className="text-lg font-serif font-bold text-[#0F3D3E]">
            Catalog Books ({filteredBooks.length})
          </CardTitle>
          <CardDescription className="text-xs text-[#5C6E6E]">
            Use View Listing to inspect the live store page. Upload new manuscripts from the Manuscripts area.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8F9F7]">
                <TableRow className="border-[#E2E6DF]">
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Book Details</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Genre / Category</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Current MRP</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Royalty / Unit</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Sales</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Rating</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                      <p className="text-xs text-[#5C6E6E] mt-2">Loading author books...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <BookOpen className="h-10 w-10 mx-auto text-[#5C6E6E]/40 mb-2" />
                      <h3 className="font-serif font-bold text-[#0F3D3E] text-base">No books found</h3>
                      <p className="text-xs text-[#5C6E6E] mt-1 max-w-sm mx-auto">
                        Published titles will appear here after editorial approval.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBooks.map((book, index) => <BookRow key={book._id || book.id} book={book} index={index} />)
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3D3E]/10">{icon}</div>
          <div>
            <p className="text-2xl font-serif font-bold text-[#0F3D3E]">{value}</p>
            <p className="text-xs text-[#5C6E6E]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BookRow({ book, index }: { book: any; index: number }) {
  const priceVal = book.mrp || book.price || 0;
  const royaltyPerc = typeof book.royaltyPercentage === "number" ? book.royaltyPercentage : 30;
  const unitRoyalty = Math.round((priceVal * royaltyPerc) / 100);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-[#E2E6DF]/70 hover:bg-[#F8F9F7]/60 text-xs"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Image
            src={book.coverImage && (book.coverImage.startsWith("http") || book.coverImage.startsWith("/")) ? book.coverImage : "/logo.webp"}
            alt={book.title}
            width={40}
            height={56}
            className="h-14 w-10 rounded-lg object-cover border border-[#E2E6DF] shadow-2xs shrink-0"
          />
          <div className="space-y-0.5">
            <p className="font-serif font-bold text-sm text-[#0F3D3E] line-clamp-1">{book.title}</p>
            <p className="text-[11px] text-[#5C6E6E]">
              Format: <strong className="capitalize">{book.format || "Paperback"}</strong> - {book.pages || 200} pages
            </p>
            {book.isbn && <p className="text-[10px] font-mono text-[#5C6E6E]/80">ISBN: {book.isbn}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="bg-[#F8F9F7] text-[#0F3D3E] border-[#E2E6DF] text-[11px] font-medium">
          {getCategoryDisplayName(book.category)}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="font-mono font-bold text-sm text-[#0F3D3E]">Rs {priceVal}</span>
      </TableCell>
      <TableCell>
        <span className="font-mono font-bold text-emerald-700">Rs {unitRoyalty}</span>
        <span className="text-[10px] text-[#5C6E6E] block font-mono">({royaltyPerc}%)</span>
      </TableCell>
      <TableCell>
        <span className="font-bold text-[#0F3D3E]">{book.totalSales || 0}</span>
        <span className="text-[10px] text-[#5C6E6E] block">copies</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-bold text-[#0F3D3E]">{book.rating || 0}</span>
          <span className="text-[10px] text-[#5C6E6E]">({book.totalReviews || 0})</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" asChild className="h-8 text-xs font-bold text-[#0F3D3E] border-[#0F3D3E]/30 hover:bg-[#0F3D3E]/5 gap-1.5">
          <Link href={`/books/${book.slug || book._id || book.id}`} target="_blank" rel="noopener noreferrer">
            <Eye className="h-3.5 w-3.5 text-blue-600" />
            <span>View Listing</span>
          </Link>
        </Button>
      </TableCell>
    </motion.tr>
  );
}
