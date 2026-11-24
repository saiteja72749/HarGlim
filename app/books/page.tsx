"use client";
import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError, publicApiMessage, publicRetryAt } from "@/lib/api-error";


import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import Image from '@/components/ui/backend-image';
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Grid,
  List,
  SlidersHorizontal,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompactBookCard } from "@/components/books/book-card";
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
import { fetchBackendCategories } from "@/lib/categories";
import { onLiveChange } from "@/lib/live-sync";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { useSearchParams } from 'next/navigation';
import { fetchCatalogPage } from "@/lib/catalog";
import { publishedNumber } from "@/lib/book-presentation";

const priceRanges = [
  { label: "Under ₹300", min: 0, max: 300 },
  { label: "₹300 - ₹500", min: 300, max: 500 },
  { label: "₹500 - ₹800", min: 500, max: 800 },
  { label: "Above ₹800", min: 800 },
];

function BooksContent({ initialQuery = '', initialCategory = '', initialTag = 'all', initialSort = 'newest' }: { initialQuery?: string; initialCategory?: string; initialTag?: 'all' | 'featured' | 'bestseller' | 'newRelease'; initialSort?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const queryInput = searchQuery.trim();
  const debouncedQuery = useDebouncedValue(queryInput);
  const [reloadVersion, setReloadVersion] = useState(0);
  const params = useSearchParams();
  const sortBy = initialSort;
  
  // Filter States
  const quickTagFilter = initialTag;
  const format = params.get("format") || "";
  const minPrice = publishedNumber(params.get("minPrice")) ?? undefined;
  const maxPrice = publishedNumber(params.get("maxPrice")) ?? undefined;
  const selectedPriceRange = priceRanges.find((range) => range.min === minPrice && range.max === maxPrice)?.label;
  const hasPriceFilter = minPrice !== undefined || maxPrice !== undefined;
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [categoryError, setCategoryError] = useState<unknown>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Accordion Section Collapse State
  const [openSections, setOpenSections] = useState({
    categories: true,
    price: true,
  });

  // Instant Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchCategories = useCallback(async (fresh = false) => {
    setCategoryError(null);
    try {
      const items = (await fetchBackendCategories(fresh)) as Category[];
      setCategories(items);
      setCategoriesLoaded(true);
    } catch (err) {
      console.error("Failed to fetch categories:", describeApiError(err));
      setCategoryError(err);
    }
  }, []);

  useEffect(() => scheduleRequest(fetchCategories), [fetchCategories]);

  useEffect(() => {
    const stopCategories = onLiveChange("categories", (reason) => void fetchCategories(reason === "change"), 60_000);
    const stopBooks = onLiveChange("books", () => {
      setReloadVersion((version) => version + 1);
    }, 20_000);
    return () => { stopCategories(); stopBooks(); };
  }, [fetchCategories]);

  const selectedCategory = categories.find((category) => category._id === initialCategory || category.slug === initialCategory);
  const unknownCategory = Boolean(initialCategory && categoriesLoaded && !selectedCategory);
  const selectedCategoryId = selectedCategory?._id || initialCategory;
  const selectedCategorySlug = selectedCategory?.slug || initialCategory;
  const waitForCategory = Boolean(initialCategory && !categoriesLoaded && !categoryError);
  const resultsPending = loading || waitForCategory || searchQuery.trim() !== debouncedQuery;

  const [result, setResult] = useState<{ books: BookType[]; pages: number }>({ books: [], pages: 1 });
  const { books, pages: totalPages } = result;
  const visiblePage = Math.min(currentPage, totalPages);
  useEffect(() => {
    if (waitForCategory || unknownCategory || queryInput !== debouncedQuery) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCatalogPage({
          q: debouncedQuery, category: selectedCategorySlug, page: currentPage, limit: 12,
          format: format || undefined, minPrice, maxPrice,
          tag: quickTagFilter, sort: sortBy,
        }, controller.signal);
        if (!controller.signal.aborted) {
          if (currentPage > result.pages) setCurrentPage(result.pages);
          else setResult(result);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load catalog:", describeApiError(error));
        setError(error);
        setResult({ books: [], pages: 1 });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [queryInput, debouncedQuery, selectedCategorySlug, currentPage, format, minPrice, maxPrice, quickTagFilter, sortBy, reloadVersion, waitForCategory, unknownCategory]);

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

  const updateURL = (changes: Record<string, string>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    const query = next.toString();
    if (query !== params.toString()) window.history.pushState(null, "", `/books${query ? `?${query}` : ""}`);
    setCurrentPage(1);
  };

  const handleCategoryToggle = (categoryId: string) => {
    const slug = categories.find((category) => category._id === categoryId)?.slug;
    updateURL({ category: categoryId === selectedCategoryId ? "" : slug || categoryId });
  };

  const clearFilters = () => {
    updateURL({ category: "", sort: "", tag: "", featured: "", bestseller: "", newRelease: "", q: "", search: "", format: "", minPrice: "", maxPrice: "", minRating: "" });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(initialCategory) || quickTagFilter !== "all" || sortBy !== "newest" ||
    Boolean(format) || hasPriceFilter ||
    searchQuery.trim() !== "";

  // Suggestions matches
  const suggestions = !resultsPending && searchQuery.trim()
    ? books.slice(0, 4)
    : [];

  // Filter Panel Component
  const renderFilters = (idPrefix: string) => (
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
            {Boolean(categoryError) && <p role="alert" className="text-xs text-rose-700">{publicApiMessage(categoryError, "Could not load categories.")} <button type="button" className="underline" onClick={() => void fetchCategories()}>Retry</button></p>}
            {categories.map((category) => {
              const isChecked = selectedCategoryId === category._id;
              return (
                <div key={category._id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id={`${idPrefix}-cat-${category._id}`}
                      checked={isChecked}
                      onCheckedChange={() => handleCategoryToggle(category._id)}
                      className="border-[#E2E6DF] data-[state=checked]:bg-[#0F3D3E]"
                    />
                    <Label
                      htmlFor={`${idPrefix}-cat-${category._id}`}
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



      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-format`}>Format</Label>
        <select id={`${idPrefix}-format`} value={format} onChange={(event) => updateURL({ format: event.target.value })} className="min-h-11 w-full rounded-md border bg-card px-2 text-sm">
          <option value="">All formats</option>
          <option value="paperback">Paperback</option>
          <option value="hardcover">Hardcover</option>
          <option value="ebook">E-book</option>
          <option value="audiobook">Audiobook</option>
        </select>
      </div>

      {/* Price range */}
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
                    id={`${idPrefix}-price-${range.label}`}
                    checked={isSelected}
                    onCheckedChange={() =>
                      updateURL({ minPrice: isSelected ? "" : String(range.min), maxPrice: !isSelected && range.max !== undefined ? String(range.max) : "" })
                    }
                    className="border-[#E2E6DF] data-[state=checked]:bg-[#0F3D3E]"
                  />
                  <Label
                    htmlFor={`${idPrefix}-price-${range.label}`}
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

          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout (Sidebar + Grid) */}
      <div id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT: Desktop Sticky Filter Panel */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-[calc(var(--site-header-height,4rem)+1rem)] max-h-[calc(100dvh-var(--site-header-height,4rem)-2rem)] overflow-y-auto bg-white p-6 rounded-2xl border border-[#E2E6DF] shadow-xs">
              {renderFilters("desktop")}
            </div>
          </aside>

          {/* RIGHT: Search & Toolbar & Books Grid */}
          <div className="min-w-0 flex-1 space-y-6">
            
            {/* Top Toolbar (Search, Mobile Drawer, Sort, View Mode) */}
            <div className="bg-white p-4 rounded-2xl border border-[#E2E6DF] shadow-xs space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
              
              {/* Instant Search Bar */}
              <div ref={searchContainerRef} className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                <Input
                  type="text"
                  placeholder="Search by title, author, category..."
                  aria-label="Search catalog"
                  aria-busy={resultsPending}
                  value={searchQuery}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setShowSuggestions(false);
                    if (event.key === "Enter") {
                      updateURL({ q: searchQuery.trim(), search: "" });
                      setShowSuggestions(false);
                    }
                  }}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  className="min-h-11 rounded-xl border-border bg-background pl-10 pr-11 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); updateURL({ q: "", search: "" }); }}
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
                          key={b._id || b.id}
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
              <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
                
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
                  <SheetContent side="left" aria-describedby={undefined} className="w-[min(20rem,calc(100vw-1rem))] overflow-y-auto bg-white border-[#E2E6DF]">
                    <SheetHeader>
                      <SheetTitle className="font-serif font-bold text-[#0F3D3E]">Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      {renderFilters("mobile")}
                    </div>
                  </SheetContent>
                </Sheet>

                {/* Sort Selector */}
                <Select value={sortBy} onValueChange={(sort) => updateURL({ sort, tag: quickTagFilter })}>
                  <SelectTrigger aria-label="Sort books" className="w-40 h-10 bg-[#F8F9F7] border-[#E2E6DF] text-xs font-semibold">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF]">
                    <SelectItem value="newest" className="text-xs">Newest Arrivals</SelectItem>
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
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    className="h-10 w-10 rounded-none text-[#0F3D3E]"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    className="h-10 w-10 rounded-none text-[#0F3D3E]"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Browse categories" role="group">
                {categories.slice(0, 6).map((category) => (
                  <Button key={category._id} type="button" variant={selectedCategoryId === category._id ? "default" : "outline"}
                    aria-pressed={selectedCategoryId === category._id} className="min-h-11 max-w-full whitespace-normal text-left"
                    onClick={() => handleCategoryToggle(category._id)}>
                    {category.name}
                  </Button>
                ))}
              </div>
            )}

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
                    updateURL({ tag: tab.id, featured: "", bestseller: "", newRelease: "" });
                  }}
                  aria-pressed={quickTagFilter === tab.id}
                  className={cn(
                    "min-h-11 px-3.5 py-1.5 rounded-full font-bold transition-all whitespace-nowrap",
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
                {initialCategory && (
                  <Badge variant="secondary" className="gap-2">
                    {selectedCategory ? `Category: ${selectedCategory.name}` : "Selected category"}
                    <button type="button" className="inline-flex min-h-7 min-w-7 items-center justify-center" onClick={() => updateURL({ category: "" })} aria-label="Remove category filter">
                      <X className="size-4" />
                    </button>
                  </Badge>
                )}

                {hasPriceFilter && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0F3D3E]/10 text-[#0F3D3E] font-bold rounded-full">
                    <span>Price: {selectedPriceRange || [minPrice !== undefined ? `from ₹${minPrice}` : "", maxPrice !== undefined ? `up to ₹${maxPrice}` : ""].filter(Boolean).join(" ")}</span>
                    <button onClick={() => updateURL({ minPrice: "", maxPrice: "" })} aria-label="Remove price filter" className="hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {format && <Button type="button" size="sm" variant="outline" onClick={() => updateURL({ format: "" })} aria-label="Remove format filter">{format} <X aria-hidden="true" /></Button>}

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
            {unknownCategory ? (
              <div className="space-y-3 rounded-xl border bg-card p-6">
                <h2 className="font-serif text-xl font-semibold">Category not found</h2>
                <Button variant="outline" onClick={() => updateURL({ category: "" })}>Browse all categories</Button>
              </div>
            ) : resultsPending ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5"
                    : "space-y-4"
                }
              >
                {[...Array(6)].map((_, i) => (
                  <BookCardSkeleton key={i} horizontal={viewMode === "list"} />
                ))}
              </div>
            ) : error ? (
              <ErrorState
                title="Unable to load catalog"
                message={publicApiMessage(error, "The book list could not load. Please try again.")}
                retryAt={publicRetryAt(error)}
                onRetry={() => setReloadVersion((version) => version + 1)}
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
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5"
                      : "space-y-4"
                  }
                >
                  {books.map((book) => (
                    <CompactBookCard
                      key={book._id || book.id || book.slug}
                      book={book}
                      horizontal={viewMode === "list"}
                    />
                  ))}
                </motion.div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-8">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={visiblePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="border-[#E2E6DF] text-[#0F3D3E] font-semibold text-xs h-9 px-4 rounded-xl"
                    >
                      Previous
                    </Button>
                    <span className="text-xs font-bold text-[#0F3D3E] font-mono px-3">
                      Page {visiblePage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={visiblePage >= totalPages}
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

function CatalogFromURL() {
  const params = useSearchParams();
  const sort = params.get('sort');
  const explicitTag = params.get("tag");
  const tag = explicitTag === "all" || explicitTag === "bestseller" || explicitTag === "featured" || explicitTag === "newRelease" ? explicitTag : sort === 'bestseller' || params.get('bestseller') === 'true' ? 'bestseller' : sort === 'new' || params.get('newRelease') === 'true' ? 'newRelease' : params.get('featured') === 'true' ? 'featured' : 'all';
  return <BooksContent key={params.get("q") || params.get("search") || ""} initialQuery={params.get('q') || params.get('search') || ''} initialCategory={params.get('category') || ''} initialTag={tag} initialSort={sort && ['newest', 'price-low', 'price-high', 'featured'].includes(sort) ? sort : 'newest'} />;
}

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center font-serif text-[#0F3D3E]">Loading catalog...</div>}>
      <CatalogFromURL />
    </Suspense>
  );
}
