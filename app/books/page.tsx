"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Grid,
  List,
  SlidersHorizontal,
  X,
  Star,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookCard } from "@/components/books/book-card";
import { BookCardSkeleton } from "@/components/books/book-card-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Book as BookType, Category } from "@/types";
import api, { getCachedCategories } from "@/lib/api";
import { cn } from "@/lib/utils";

const priceRanges = [
  { label: "Under ₹300", min: 0, max: 300 },
  { label: "₹300 - ₹500", min: 300, max: 500 },
  { label: "₹500 - ₹800", min: 500, max: 800 },
  { label: "Above ₹800", min: 800, max: 10000 },
];

function BooksContent() {
  const [books, setBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  
  // Filter States
  const [quickTagFilter, setQuickTagFilter] = useState<"all" | "featured" | "bestseller" | "newRelease">("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState<string | null>(null);
  const [minRatingFilter, setMinRatingFilter] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Accordion Section Collapse State
  const [openSections, setOpenSections] = useState({
    categories: true,
    formats: true,
    price: true,
    rating: true,
  });

  // Instant Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchCategories = async () => {
    try {
      const items = await getCachedCategories();
      setCategories(items);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    setError(false);
    try {
      const params: any = {
        page: currentPage,
        limit: 12,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
        params.q = searchQuery.trim();
      }
      if (selectedCategories.length > 0) {
        params.category = selectedCategories[0];
      }

      if (selectedPriceRange) {
        const range = priceRanges.find((r) => r.label === selectedPriceRange);
        if (range) {
          params.minPrice = range.min;
          params.maxPrice = range.max;
        }
      }

      if (quickTagFilter === "featured") params.featured = true;
      if (quickTagFilter === "bestseller") params.bestseller = true;
      if (quickTagFilter === "newRelease") params.newRelease = true;

      if (sortBy === "price-low") params.sort = "price_asc";
      else if (sortBy === "price-high") params.sort = "price_desc";
      else if (sortBy === "rating") params.sort = "rating";
      else if (sortBy === "newest") params.sort = "newest";
      else if (sortBy === "featured") params.sort = "featured";

      const { data } = await api.get("/books", { params });

      const items = data.data?.books || (Array.isArray(data.data) ? data.data : []) || (Array.isArray(data) ? data : []);
      const pagination = data.pagination || data.data?.pagination || {};

      let result = Array.isArray(items) ? items : [];

      // Filter by selected format
      if (selectedFormats.length > 0) {
        result = result.filter((b) =>
          selectedFormats.some((fmt) =>
            (b.format || "").toLowerCase().includes(fmt.toLowerCase())
          )
        );
      }

      // Filter by min rating
      if (minRatingFilter) {
        result = result.filter((b) => (b.rating || 0) >= minRatingFilter);
      }

      setBooks(result);
      setTotalPages(pagination.pages || Math.ceil((pagination.total || result.length) / 12) || 1);
    } catch (err) {
      console.error("Failed to fetch books:", err);
      setError(true);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [searchQuery, sortBy, selectedCategories, selectedFormats, selectedPriceRange, minRatingFilter, quickTagFilter, currentPage]);

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [categoryId]
    );
  };

  const clearFilters = () => {
    setQuickTagFilter("all");
    setSelectedCategories([]);
    setSelectedFormats([]);
    setSelectedPriceRange(null);
    setMinRatingFilter(null);
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedFormats.length > 0 ||
    selectedPriceRange !== null ||
    minRatingFilter !== null ||
    searchQuery.trim() !== "";

  // Suggestions matches
  const suggestions = searchQuery.trim()
    ? books.slice(0, 4)
    : [];

  // Filter Panel Component
  const FilterContent = () => (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E2E6DF]">
        <h2 className="font-serif font-bold text-base text-[#0F3D3E] flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#D4AF37]" />
          Filter Books
        </h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 h-8 px-2"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Accordion Section 1: Categories */}
      <div className="border-b border-[#E2E6DF]/60 pb-4">
        <button
          type="button"
          onClick={() => setOpenSections((prev) => ({ ...prev, categories: !prev.categories }))}
          className="w-full flex items-center justify-between font-serif font-bold text-sm text-[#0F3D3E] py-1"
        >
          <span>Categories</span>
          {openSections.categories ? <ChevronUp className="h-4 w-4 text-[#5C6E6E]" /> : <ChevronDown className="h-4 w-4 text-[#5C6E6E]" />}
        </button>

        {openSections.categories && (
          <div className="mt-3 space-y-2.5">
            {categories.map((category) => {
              const isChecked = selectedCategories.includes(category._id);
              return (
                <div key={category._id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id={`cat-${category._id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleCategoryToggle(category._id)}
                      className="border-[#E2E6DF] data-[state=checked]:bg-[#0F3D3E]"
                    />
                    <Label
                      htmlFor={`cat-${category._id}`}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isChecked ? "font-bold text-[#0F3D3E]" : "text-[#5C6E6E] hover:text-[#0F3D3E]"
                      )}
                    >
                      {category.name}
                    </Label>
                  </div>
                  {category.bookCount !== undefined && (
                    <span className="text-[10px] text-[#5C6E6E] font-mono bg-[#F8F9F7] px-1.5 py-0.5 rounded border border-[#E2E6DF]">
                      {category.bookCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>



      {/* Accordion Section 3: Price Range */}
      <div className="border-b border-[#E2E6DF]/60 pb-4">
        <button
          type="button"
          onClick={() => setOpenSections((prev) => ({ ...prev, price: !prev.price }))}
          className="w-full flex items-center justify-between font-serif font-bold text-sm text-[#0F3D3E] py-1"
        >
          <span>Price Filter</span>
          {openSections.price ? <ChevronUp className="h-4 w-4 text-[#5C6E6E]" /> : <ChevronDown className="h-4 w-4 text-[#5C6E6E]" />}
        </button>

        {openSections.price && (
          <div className="mt-3 space-y-2">
            {priceRanges.map((range) => {
              const isSelected = selectedPriceRange === range.label;
              return (
                <div key={range.label} className="flex items-center gap-2.5 text-xs">
                  <Checkbox
                    id={`price-${range.label}`}
                    checked={isSelected}
                    onCheckedChange={() =>
                      setSelectedPriceRange(isSelected ? null : range.label)
                    }
                    className="border-[#E2E6DF] data-[state=checked]:bg-[#0F3D3E]"
                  />
                  <Label
                    htmlFor={`price-${range.label}`}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected ? "font-bold text-[#0F3D3E]" : "text-[#5C6E6E] hover:text-[#0F3D3E]"
                    )}
                  >
                    {range.label}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accordion Section 4: Minimum Rating */}
      <div>
        <button
          type="button"
          onClick={() => setOpenSections((prev) => ({ ...prev, rating: !prev.rating }))}
          className="w-full flex items-center justify-between font-serif font-bold text-sm text-[#0F3D3E] py-1"
        >
          <span>Customer Rating</span>
          {openSections.rating ? <ChevronUp className="h-4 w-4 text-[#5C6E6E]" /> : <ChevronDown className="h-4 w-4 text-[#5C6E6E]" />}
        </button>

        {openSections.rating && (
          <div className="mt-3 space-y-2">
            {[4, 3, 2].map((stars) => {
              const isSelected = minRatingFilter === stars;
              return (
                <button
                  key={stars}
                  type="button"
                  onClick={() => setMinRatingFilter(isSelected ? null : stars)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all",
                    isSelected
                      ? "bg-[#0F3D3E]/10 border-[#0F3D3E] text-[#0F3D3E]"
                      : "bg-[#F8F9F7] border-[#E2E6DF] text-[#5C6E6E] hover:border-[#0F3D3E]"
                  )}
                >
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3.5 w-3.5",
                          i < stars ? "fill-[#D4AF37] text-[#D4AF37]" : "text-gray-200"
                        )}
                      />
                    ))}
                  </div>
                  <span>& Up</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E]">
      {/* 1. Page Banner */}
      <div className="bg-white border-b border-[#E2E6DF] py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block mb-1">
                Editorial Books Marketplace
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
                Explore Books Catalog
              </h1>
              <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
                Discover inspiring reads from talented authors across fiction, technology, business, and literature.
              </p>
            </div>

            {/* Micro Trust Signals */}
            <div className="flex items-center gap-4 text-xs font-sans text-[#5C6E6E] border-t md:border-t-0 md:border-l border-[#E2E6DF] pt-3 md:pt-0 md:pl-6">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>100% Verified Copies</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-[#0F3D3E]" />
                <span>Fast India Shipping</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout (Sidebar + Grid) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT: Desktop Sticky Filter Panel */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24 bg-white p-6 rounded-2xl border border-[#E2E6DF] shadow-xs">
              <FilterContent />
            </div>
          </aside>

          {/* RIGHT: Search & Toolbar & Books Grid */}
          <div className="flex-1 space-y-6">
            
            {/* Top Toolbar (Search, Mobile Drawer, Sort, View Mode) */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2E6DF] shadow-xs space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              
              {/* Instant Search Bar */}
              <div ref={searchContainerRef} className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                <Input
                  type="text"
                  placeholder="Search by title, author, category..."
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className="pl-10 h-10 bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6E6E] hover:text-[#0F3D3E]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Instant Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-0 right-0 top-12 bg-white border border-[#E2E6DF] rounded-2xl shadow-xl z-30 overflow-hidden p-2 space-y-1"
                    >
                      <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                        Instant Book Matches
                      </p>
                      {suggestions.map((b) => (
                        <Link
                          key={b._id || (b as any).id}
                          href={`/books/${b.slug || b._id}`}
                          onClick={() => setShowSuggestions(false)}
                          className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#F8F9F7] transition-colors"
                        >
                          <Image
                            src={b.coverImage || "/placeholder-book.svg"}
                            alt={b.title}
                            width={28}
                            height={40}
                            className="h-10 w-7 rounded object-cover border border-[#E2E6DF]"
                          />
                          <div>
                            <p className="font-serif font-bold text-xs text-[#0F3D3E] line-clamp-1">{b.title}</p>
                            <p className="text-[11px] text-[#5C6E6E]">₹{(b.price || 0).toLocaleString()}</p>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-3 justify-between sm:justify-end">
                
                {/* Mobile Filter Sheet Trigger */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden h-10 border-[#E2E6DF] text-xs font-bold gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span>Filters</span>
                      {hasActiveFilters && (
                        <Badge className="bg-[#0F3D3E] text-white text-[10px] h-4 px-1.5">
                          Active
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="bg-white border-[#E2E6DF] w-80">
                    <SheetHeader>
                      <SheetTitle className="font-serif font-bold text-[#0F3D3E]">Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <FilterContent />
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort Selector */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-10 bg-[#F8F9F7] border-[#E2E6DF] text-xs font-semibold">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF]">
                    <SelectItem value="newest" className="text-xs">Newest Arrivals</SelectItem>
                    <SelectItem value="rating" className="text-xs">Top Rated</SelectItem>
                    <SelectItem value="price-low" className="text-xs">Price: Low to High</SelectItem>
                    <SelectItem value="price-high" className="text-xs">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grid / List View Switcher */}
                <div className="flex items-center border border-[#E2E6DF] rounded-xl overflow-hidden bg-[#F8F9F7]">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className="h-10 w-10 rounded-none text-[#0F3D3E]"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className="h-10 w-10 rounded-none text-[#0F3D3E]"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Tag Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 font-sans text-xs">
              {[
                { id: "all", label: "All Books" },
                { id: "featured", label: "🔥 Featured" },
                { id: "bestseller", label: "⭐ Bestsellers" },
                { id: "newRelease", label: "✨ New Releases" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setQuickTagFilter(tab.id as any);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap",
                    quickTagFilter === tab.id
                      ? "bg-[#0F3D3E] text-[#D4AF37] shadow-xs"
                      : "bg-white text-[#5C6E6E] hover:text-[#0F3D3E] border border-[#E2E6DF]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Filter Pills Bar */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-[#E2E6DF] text-xs">
                <span className="font-bold text-[#5C6E6E] text-[11px] uppercase tracking-wider">Active Filters:</span>
                {selectedCategories.map((catId) => {
                  const cat = categories.find((c) => c._id === catId);
                  return cat ? (
                    <span
                      key={catId}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0F3D3E]/10 text-[#0F3D3E] font-bold rounded-full"
                    >
                      <span>Category: {cat.name}</span>
                      <button onClick={() => handleCategoryToggle(catId)} aria-label={`Remove category filter: ${cat.name}`} className="hover:text-rose-600">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null;
                })}


                {selectedPriceRange && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0F3D3E]/10 text-[#0F3D3E] font-bold rounded-full">
                    <span>Price: {selectedPriceRange}</span>
                    <button onClick={() => setSelectedPriceRange(null)} aria-label="Remove price filter" className="hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {minRatingFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0F3D3E]/10 text-[#0F3D3E] font-bold rounded-full">
                    <span>Rating: {minRatingFilter}★ & Up</span>
                    <button onClick={() => setMinRatingFilter(null)} aria-label="Remove rating filter" className="hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold h-7 px-2 ml-auto"
                >
                  Reset All
                </Button>
              </div>
            )}

            {/* Results Count Bar */}
            <div className="flex items-center justify-between text-xs text-[#5C6E6E] font-sans px-1">
              <span>
                Showing <strong className="text-[#0F3D3E] font-serif">{books.length}</strong> book{books.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Main Books Grid / List Rendering */}
            {loading ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                    : "space-y-4"
                }
              >
                {[...Array(6)].map((_, i) => (
                  <BookCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <ErrorState
                title="Unable to load catalog"
                message="We encountered an issue fetching the books list. Please try again."
                onRetry={fetchBooks}
              />
            ) : books.length === 0 ? (
              <div className="text-center py-16 bg-white border border-dashed border-[#E2E6DF] rounded-2xl space-y-4">
                <BookOpen className="h-12 w-12 text-[#5C6E6E]/40 mx-auto" />
                <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">
                  No books found matching your criteria
                </h3>
                <p className="text-xs text-[#5C6E6E] max-w-sm mx-auto">
                  Try clearing some filters or searching for another book title or author.
                </p>
                <Button onClick={clearFilters} className="bg-[#0F3D3E] text-white hover:bg-[#174C4D]">
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5"
                      : "space-y-4"
                  }
                >
                  {books.map((book) => (
                    <BookCard
                      key={book._id || (book as any).id}
                      book={book}
                      variant={viewMode === "list" ? "horizontal" : "default"}
                    />
                  ))}
                </motion.div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="border-[#E2E6DF] text-[#0F3D3E] font-semibold text-xs h-9 px-4 rounded-xl"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold text-[#0F3D3E] font-mono px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="border-[#E2E6DF] text-[#0F3D3E] font-semibold text-xs h-9 px-4 rounded-xl"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-serif text-[#0F3D3E]">Loading catalog...</div>}>
      <BooksContent />
    </Suspense>
  );
}
