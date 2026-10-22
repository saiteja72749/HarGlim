"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Search,
  Sparkles,
  Brain,
  Briefcase,
  Code,
  Feather,
  Baby,
  Compass,
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
import type { Category } from "@/types";
import api from "@/lib/api";

// Category Icons Mapping
const categoryIconMap: Record<string, any> = {
  fiction: Feather,
  literature: Feather,
  business: Briefcase,
  economics: Briefcase,
  technology: Code,
  tech: Code,
  "self-help": Brain,
  mindset: Brain,
  children: Baby,
  kids: Baby,
  arts: Compass,
  general: BookOpen,
};

const getCategoryIcon = (slugOrName: string) => {
  const key = (slugOrName || "").toLowerCase();
  for (const pattern in categoryIconMap) {
    if (key.includes(pattern)) return categoryIconMap[pattern];
  }
  return BookOpen;
};

const getCategoryImage = (cat: any) => {
  if (cat.image && (cat.image.startsWith("http") || cat.image.startsWith("/")) && !cat.image.includes("placeholder")) {
    return cat.image;
  }
  return "/logo.png";
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<(Category & { image?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(false);
        const { data } = await api.get("/categories", {
          params: { active: true }
        });
        const items = data.data?.categories || (Array.isArray(data.data) ? data.data : []) || (Array.isArray(data) ? data : []);
        setCategories(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        setError(true);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const filteredCategories = categories
    .filter((cat) => {
      const q = searchQuery.toLowerCase();
      return (
        (cat.name || "").toLowerCase().includes(q) ||
        (cat.description || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return (b.bookCount || 0) - (a.bookCount || 0);
      }
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      return 0;
    });

  const featuredCategory = categories.find((c) => (c.bookCount || 0) > 0) || categories[0];

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
            <span>Curated Literary Collections</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white tracking-tight">
            Browse Categories
          </h1>

          <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
            Explore our diverse collection of books across various genres and find your next favorite read.
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. FEATURED CATEGORY BANNER (If available) */}
      {/* ------------------------------------------------------------------ */}
      {featuredCategory && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
          <div className="bg-white border-2 border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#D4AF37]" />
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs">
                  ⭐ Featured Genre
                </Badge>
                <span className="text-xs text-[#5C6E6E]">
                  {featuredCategory.bookCount || 0} Books Available
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
                {featuredCategory.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#5C6E6E] line-clamp-2">
                {featuredCategory.description || "Discover groundbreaking titles in this genre."}
              </p>
            </div>
            <div className="lg:col-span-4 text-right">
              <Button
                asChild
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-sm h-12 px-6 rounded-xl shadow-xs"
              >
                <Link href={`/categories/${featuredCategory.slug || featuredCategory._id}`}>
                  <span>Explore Collection</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. TOOLBAR: SEARCH & SORT BAR */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E6DF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              type="text"
              placeholder="Search categories..."
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
                <SelectValue placeholder="Sort categories" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#E2E6DF]">
                <SelectItem value="popular" className="text-xs">Most Popular (Books Count)</SelectItem>
                <SelectItem value="name" className="text-xs">Category Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. MAIN CATEGORY GRID (3 Desktop, 2 Tablet, 1 Mobile) */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white p-4 rounded-2xl border border-[#E2E6DF]">
                <div className="aspect-[3/2] bg-gray-200 rounded-xl mb-4" />
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white border border-[#E2E6DF] rounded-2xl p-8">
            <p className="text-sm text-red-600 font-semibold mb-4">Failed to load categories.</p>
            <Button onClick={() => window.location.reload()}>Retry Loading</Button>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-[#E2E6DF] rounded-2xl p-8 space-y-3">
            <BookOpen className="h-10 w-10 text-[#5C6E6E]/40 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">No categories found</h3>
            <p className="text-xs text-[#5C6E6E]">No category titles matched &ldquo;{searchQuery}&rdquo;.</p>
            <Button variant="outline" onClick={() => setSearchQuery("")}>Clear Search</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const bookCount = category.bookCount || 0;
              const hasBooks = bookCount > 0;
              const IconComponent = getCategoryIcon(category.slug || category.name);
              const bgImg = getCategoryImage(category);

              return (
                <motion.div
                  key={category._id}
                  whileHover={hasBooks ? { y: -8, scale: 1.02 } : {}}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-[#E2E6DF] hover:border-[#D4AF37] shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full cursor-pointer"
                >
                  {hasBooks ? (
                    <Link href={`/categories/${category.slug || category._id}`} className="flex flex-col h-full">
                      {/* Image & Dark Overlay */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-[#0F3D3E]">
                        <Image
                          src={bgImg}
                          onError={(e: any) => { if (e?.target) e.target.src = "/logo.png"; }}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-500 opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                          <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-[#D4AF37] flex items-center justify-center shadow-sm">
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs shadow-sm">
                            {bookCount} Book{bookCount === 1 ? "" : "s"}
                          </Badge>
                        </div>

                        {/* Bottom Title on Image */}
                        <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1 text-white">
                          <h2 className="text-2xl font-serif font-bold tracking-tight text-white group-hover:text-[#D4AF37] transition-colors">
                            {category.name}
                          </h2>
                          {category.description && (
                            <p className="text-xs text-white/80 line-clamp-1 font-sans">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer Action */}
                      <div className="p-4 bg-white border-t border-[#E2E6DF] flex items-center justify-between mt-auto">
                        <span className="text-xs font-bold text-[#0F3D3E] font-serif group-hover:text-[#D4AF37] transition-colors">
                          Explore Collection
                        </span>
                        <div className="h-8 w-8 rounded-full bg-[#F8F9F7] text-[#0F3D3E] group-hover:bg-[#0F3D3E] group-hover:text-[#D4AF37] transition-all flex items-center justify-center">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>
                  ) : (
                    /* Disabled State for Empty Category */
                    <div className="flex flex-col h-full opacity-60 pointer-events-none">
                      <div className="relative aspect-[16/10] overflow-hidden bg-gray-200">
                        <Image
                          src={bgImg}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover grayscale"
                        />
                        <div className="absolute inset-0 bg-black/60" />
                        <div className="absolute top-4 right-4">
                          <Badge variant="secondary" className="bg-gray-800 text-gray-200 text-xs">
                            Coming Soon
                          </Badge>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h2 className="text-2xl font-serif font-bold">{category.name}</h2>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 text-xs text-gray-500 font-semibold">
                        0 Books Available
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
