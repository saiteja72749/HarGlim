'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, BookOpen } from 'lucide-react';
import { BookCard } from '@/components/books/book-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Book, Category } from '@/types';
import api from '@/lib/api';
export default function CategoryDetailPage() {
  const params = useParams();
  const [category, setCategory] = useState<(Category & { image: string }) | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        const slug = params.slug as string;
        
        let sortParam = "newest";
        if (sortBy === "price-low") sortParam = "price_asc";
        else if (sortBy === "price-high") sortParam = "price_desc";
        else if (sortBy === "rating") sortParam = "rating";
        else if (sortBy === "bestseller") sortParam = "bestseller";

        const [catRes, booksRes] = await Promise.all([
          api.get(`/categories/${slug}`).catch(() => null),
          api.get(`/categories/${slug}/books`, { params: { sort: sortParam } }).catch(() => null),
        ]);
        
        const catData = catRes?.data?.data || catRes?.data;
        
        const items = booksRes?.data?.data?.books || (Array.isArray(booksRes?.data?.data) ? booksRes?.data?.data : []) || booksRes?.data || [];
        const bookList = Array.isArray(items) ? items : [];
        setBooks(bookList);

        if (catData) {
          setCategory(catData);
        } else {
          // Construct graceful fallback if category object isn't returned separately
          const formattedName = slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Category";
          setCategory({
            _id: slug,
            name: formattedName,
            slug: slug,
            description: `Collection of ${formattedName} books`,
            active: true,
            featured: false,
            bookCount: bookList.length,
            image: "/logo.webp",
          } as any);
        }
      } catch (err) {
        console.error("Failed to fetch category data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategoryData();
  }, [params.slug, sortBy]);

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
        style={{ backgroundImage: `url(${category.image})` }}
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
            {category.bookCount} Books
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sort */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-muted-foreground">
            Showing {books.length} books in {category.name}
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="bestseller">Bestsellers</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Books Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          {books.map((book) => (
            <BookCard key={book._id} book={book} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
