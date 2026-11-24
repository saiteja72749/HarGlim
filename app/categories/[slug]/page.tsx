'use client';
import { describeApiError } from "@/lib/api-error";


import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen } from 'lucide-react';
import { CompactBookCard } from '@/components/books/book-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Book, Category } from '@/types';
import api from '@/lib/api';
import { onLiveChange } from '@/lib/live-sync';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
export default function CategoryDetailPage() {
  const params = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(false);
        const slug = params.slug as string;
        
        let sortParam = "newest";
        if (sortBy === "price-low") sortParam = "price_asc";
        else if (sortBy === "price-high") sortParam = "price_desc";
        else if (sortBy === "bestseller") sortParam = "bestseller";

        const [catRes, booksRes] = await Promise.all([
          api.get(`/categories/${encodeURIComponent(slug)}`, { cache: "no-store" }),
          api.get(`/categories/${encodeURIComponent(slug)}/books`, { params: { sort: sortParam, page, limit: 24 }, cache: "no-store" }),
        ]);
        
        const catData = catRes?.data?.data || catRes?.data;
        
        const items = booksRes?.data?.data?.books || (Array.isArray(booksRes?.data?.data) ? booksRes?.data?.data : []) || booksRes?.data || [];
        const bookList = Array.isArray(items) ? items : [];
        setBooks(bookList);

        if (!catData?._id || !catData?.name) throw new Error("Invalid category response.");
        setCategory(catData);
        const pagination = booksRes.data?.pagination ?? booksRes.data?.data?.pagination;
        setPages(pagination?.pages || 1);
      } catch (err) {
        console.error("Failed to fetch category data:", describeApiError(err));
        setBooks([]);
        setCategory(null);
        if (describeApiError(err).response?.status !== 404) setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchCategoryData();
  }, [params.slug, sortBy, page, retry]);

  useEffect(() => onLiveChange("categories", () => setRetry((value) => value + 1)), []);

  if (error && !loading) return <ErrorState title="Could not load category" message="Check your connection and try again." onRetry={() => setRetry((value) => value + 1)} />;

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <div className="h-64 bg-muted animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Category not found</h1>
          <Link href="/categories">
            <button className="text-primary hover:underline">Browse Categories</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <div
        className="relative h-64 md:h-80 bg-cover bg-center"
        style={{ backgroundImage: `url(${category.image || "/logo.png"})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-8">
          <nav className="flex items-center gap-2 text-sm text-white/70 mb-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href="/categories" className="hover:text-white">Categories</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{category.name}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
            {category.name}
          </h1>
          <p className="text-white/80 max-w-2xl">{category.description}</p>
          <div className="flex items-center gap-2 text-white/70 mt-3">
            <BookOpen className="h-4 w-4" />
            {category.bookCount !== undefined ? `${category.bookCount} Books` : ""}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing {books.length} books in {category.name}
          </p>
          <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="bestseller">Bestsellers</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {books.length === 0 && <p role="status" className="py-12 text-center text-muted-foreground">No books are available in this category yet.</p>}
        {/* Books Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {books.map((book) => (
            <CompactBookCard key={book._id} book={book} />
          ))}
        </motion.div>
        {pages > 1 && <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span>Page {page} of {pages}</span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>}
      </div>
    </div>
  );
}
