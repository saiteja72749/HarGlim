"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Barcode,
  ShoppingCart,
  BookOpen,
  FileText,
  Globe,
  Truck,
  ShieldCheck,
  Copy,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Edit3,
  Trash2,
  ThumbsUp,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BookCard } from "@/components/books/book-card";
import { ErrorState } from "@/components/ui/error-state";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import type { Book } from "@/types";
import toast from "react-hot-toast";
import { cn, getBookAuthorInfo } from "@/lib/utils";
import api from "@/lib/api";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [book, setBook] = useState<Book | null>(null);
  const [existingOrder, setExistingOrder] = useState<any | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [copiedIsbn, setCopiedIsbn] = useState(false);

  const handleCopyIsbn = (text: string) => {
    if (!text || text === "N/A") return;
    navigator.clipboard.writeText(text);
    setCopiedIsbn(true);
    toast.success("ISBN copied to clipboard! 📋");
    setTimeout(() => setCopiedIsbn(false), 2000);
  };
  const [selectedImage, setSelectedImage] = useState(0);
  // format is read directly from book.format
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"synopsis" | "details" | "reviews">("synopsis");

  // Helpful count state per review
  const [helpfulMap, setHelpfulMap] = useState<Record<string, number>>({});
  const [votedHelpful, setVotedHelpful] = useState<Record<string, boolean>>({});

  // Review Form state
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [sortReviewsBy, setSortReviewsBy] = useState<"latest" | "highest">("latest");

  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((state) => state.addItem);

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/books/${params.slug}/reviews?page=1&limit=20`);
      const reviewsData = res.data.data || res.data;
      if (reviewsData) {
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      }
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
    }
  };

  const handleReviewSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) {
      toast.error("Please enter a review comment.");
      return;
    }
    setSubmittingReview(true);
    try {
      if (editingReviewId) {
        await api.put(`/books/${params.slug}/reviews/${editingReviewId}`, {
          rating: newRating,
          comment: newComment,
        });
        toast.success("Review updated successfully!");
      } else {
        await api.post(`/books/${params.slug}/reviews`, {
          rating: newRating,
          comment: newComment,
        });
        toast.success("Review posted successfully!");
      }
      setNewComment("");
      setNewRating(5);
      setEditingReviewId(null);
      setIsWriteReviewOpen(false);
      await fetchReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleEditClick = (review: any) => {
    setEditingReviewId(review._id || review.id);
    setNewRating(review.rating || 5);
    setNewComment(review.comment || "");
    setIsWriteReviewOpen(true);
    setActiveTab("reviews");
    scrollToReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;
    try {
      await api.delete(`/books/${params.slug}/reviews/${reviewId}`);
      toast.success("Review deleted!");
      await fetchReviews();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete review");
    }
  };

  const handleToggleHelpful = (reviewId: string) => {
    if (votedHelpful[reviewId]) return;
    setVotedHelpful((prev) => ({ ...prev, [reviewId]: true }));
    setHelpfulMap((prev) => ({ ...prev, [reviewId]: (prev[reviewId] || 0) + 1 }));
    toast.success("Marked review as helpful!");
  };

  const fetchBookData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [bookRes, relatedRes, reviewsRes] = await Promise.all([
        api.get(`/books/${params.slug}`),
        api.get(`/books/${params.slug}/related?limit=4`).catch(() => ({ data: { data: [] } })),
        api.get(`/books/${params.slug}/reviews?page=1&limit=20`).catch(() => ({ data: { data: [] } })),
      ]);

      const bookData = bookRes.data.data || bookRes.data;
      if (bookData) {
        setBook(bookData as Book);
        // format read from book.format
      } else {
        setBook(null);
      }

      const relatedData = relatedRes.data.data || relatedRes.data;
      if (relatedData) {
        setRelatedBooks(Array.isArray(relatedData) ? relatedData : []);
      }

      const reviewsData = reviewsRes.data.data || reviewsRes.data;
      if (reviewsData) {
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      }
    } catch (err: any) {
      console.error("Failed to fetch book data:", err?.message || err);
      setError(true);
      setBook(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookData();
  }, [params.slug]);

  useEffect(() => {
    if (!user?._id && !user?.id) {
      setExistingOrder(null);
      return;
    }

    async function checkUserOrder() {
      try {
        const { data } = await api.get("/users/me/orders");
        const ordersData = data?.data?.orders || data?.orders || data?.data || data || [];
        if (Array.isArray(ordersData) && book) {
          const matchingOrder = ordersData.find((ord: any) =>
            (ord.items || []).some((item: any) => {
              const b = item.book || {};
              return (
                b._id === book._id ||
                b.id === book._id ||
                b.slug === book.slug ||
                item.title === book.title
              );
            })
          );
          if (matchingOrder) {
            setExistingOrder(matchingOrder);
          }
        }
      } catch (err) {
        console.error("Failed to check user order for book:", err);
      }
    }

    if (book) {
      checkUserOrder();
    }
  }, [user, book]);

  const scrollToReviews = () => {
    setActiveTab("reviews");
    if (reviewsSectionRef.current) {
      reviewsSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F8F9F7] min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 h-96 bg-gray-200 rounded-2xl" />
              <div className="lg:col-span-5 space-y-4">
                <div className="h-10 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
              <div className="lg:col-span-3 h-80 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="bg-[#F8F9F7] min-h-screen flex items-center justify-center p-4">
        <ErrorState
          title="Could not load book"
          message="We couldn't fetch details for this book right now."
          onRetry={fetchBookData}
        />
      </div>
    );
  }

  const authorInfo = getBookAuthorInfo(book);
  const author = {
    _id: authorInfo.id || "",
    name: authorInfo.name,
    hasProfile: authorInfo.hasProfile,
  };
  const category = (book.category && typeof book.category === "object") ? book.category : null;
  const price = book.price || 0;

  // 100% dynamic rating calculation derived from backend reviews with fallback to book document
  const reviewCount = reviews.length > 0 ? reviews.length : (book.totalReviews || book.reviewCount || 0);
  const computedRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
    : Number(book.rating || book.ratings || 0);
  const ratingAvg = computedRating.toFixed(1);

  // Dynamic review star distribution breakdown based on actual reviews
  const starCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating) || 0) === star).length;
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { star, count, pct };
  });

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortReviewsBy === "highest") {
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    }
    return new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime();
  });

  const handleAddToCart = () => {
    addItem(book, quantity);
    toast.success(`Added ${quantity} ${quantity > 1 ? "copies" : "copy"} of "${book.title}" to cart! 🛒`);
  };

  const handleBuyNow = () => {
    addItem(book, quantity);
    router.push("/checkout/cart");
  };

  

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E]">
      {/* 1. Top Breadcrumb Bar */}
      <div className="bg-white border-b border-[#E2E6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs text-[#5C6E6E] font-sans">
            <Link href="/" className="hover:text-[#0F3D3E]">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/books" className="hover:text-[#0F3D3E]">Books Catalog</Link>
            {category && category.name && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                {category.slug ? (
                  <Link href={`/categories/${category.slug}`} className="hover:text-[#0F3D3E]">
                    {category.name}
                  </Link>
                ) : (
                  <span className="text-[#0F3D3E]">{category.name}</span>
                )}
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#0F3D3E] font-bold truncate max-w-[200px] sm:max-w-none">{book.title}</span>
          </nav>
        </div>
      </div>

      {/* Amazon-style Purchased & Order Tracking Banner */}
      {existingOrder && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 py-3.5 px-4 sm:px-8 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold shadow-xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-emerald-950">
                  You ordered this book on{" "}
                  {existingOrder.createdAt ? new Date(existingOrder.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }) : "recently"}
                </p>
                <p className="text-xs text-emerald-800 flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                    Status: {existingOrder.orderStatus || existingOrder.status || "PROCESSING"}
                  </span>
                  <span>• Order #{existingOrder.orderNumber || existingOrder._id || existingOrder.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard/orders">
                <Button size="sm" className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-1.5 text-xs font-bold shadow-xs">
                  <Truck className="h-4 w-4" />
                  <span>View Order & Tracking</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main 3-Column Layout Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* --- LEFT COLUMN: Book Cover Gallery & Preview (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-24">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-[2/3] w-full max-w-[360px] mx-auto rounded-2xl overflow-hidden bg-white border-2 border-[#E2E6DF] shadow-lg group hover:shadow-xl transition-all"
              >
                {/* Subtle Book Spine Effect */}
                <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent z-10 mix-blend-multiply pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 z-10 pointer-events-none" />

                <Image
                  src={book.galleryImages?.[selectedImage] || book.coverImage || "/placeholder-book.svg"}
                  alt={book.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />

                {book.isBestseller && (
                  <Badge className="absolute top-4 left-4 bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold shadow-sm border border-[#D4AF37]">
                    ⭐ Bestseller
                  </Badge>
                )}
              </motion.div>

              {/* Gallery Thumbnails */}
              {book.galleryImages && book.galleryImages.length > 1 && (
                <div className="flex justify-center gap-2.5 mt-4">
                  {book.galleryImages.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={cn(
                        "relative w-16 h-22 rounded-lg overflow-hidden border-2 transition-all",
                        selectedImage === idx ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                    >
                      <Image src={img} alt={`${book.title} cover ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* --- CENTER COLUMN: Book Editorial Info & Highlights (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              {/* Category Pill */}
              {category && (
                <span className="inline-block px-3 py-1 rounded-full bg-[#0F3D3E]/10 text-[#0F3D3E] text-xs font-bold uppercase tracking-wider mb-2">
                  {category.name}
                </span>
              )}
              {/* Title (Serif Editorial Upgrade) */}
              <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E] tracking-tight leading-tight">
                {book.title}
              </h1>

              {/* Author */}
              <div className="mt-2 flex items-center gap-2 text-sm font-sans">
                <span className="text-[#5C6E6E]">By</span>
                {author._id && author.hasProfile ? (
                  <Link
                    href={`/authors/${author._id}`}
                    className="font-bold text-[#0F3D3E] hover:text-[#D4AF37] underline decoration-[#D4AF37]/50 underline-offset-4 transition-colors"
                  >
                    {author.name}
                  </Link>
                ) : (
                  <span className="font-bold text-[#0F3D3E]">{author.name}</span>
                )}
                {book.publisher && (
                  <>
                    <span className="text-[#5C6E6E]">•</span>
                    <span className="text-[#5C6E6E]">{book.publisher}</span>
                  </>
                )}
              </div>
            </div>

            {/* Clickable Rating Summary Box */}
            <button
              type="button"
              onClick={scrollToReviews}
              aria-label={`${ratingAvg} out of 5 stars, ${reviewCount} customer reviews — jump to reviews`}
              className="inline-flex items-center gap-3 p-2.5 px-4 rounded-xl bg-white border border-[#E2E6DF] cursor-pointer hover:border-[#D4AF37] transition-all shadow-xs group"
            >
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-4 w-4",
                      i < Math.round(Number(ratingAvg))
                        ? "fill-[#D4AF37] text-[#D4AF37]"
                        : "text-gray-200"
                    )}
                  />
                ))}
              </div>
              <span className="font-bold text-sm text-[#0F3D3E] font-serif">{ratingAvg}</span>
              <span className="text-xs text-[#5C6E6E] group-hover:text-[#0F3D3E]">
                ({reviewCount} customer reviews)
              </span>
            </button>

            {/* Short Preview Synopsis */}
            {book.shortDescription && (
              <p className="text-sm text-[#5C6E6E] leading-relaxed font-sans border-l-2 border-[#D4AF37] pl-3.5 italic">
                &ldquo;{book.shortDescription}&rdquo;
              </p>
            )}

            {/* Structured Highlights Card */}
            <div className="bg-white border border-[#E2E6DF] rounded-2xl p-5 shadow-xs space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
                Book Specifications
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs font-sans">
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8F9F7]">
                  <BookOpen className="h-4 w-4 text-[#0F3D3E] shrink-0" />
                  <div>
                    <span className="text-[#5C6E6E] block text-[10px]">Format</span>
                    <span className="font-bold text-[#0F3D3E] capitalize">{book.format || "Paperback"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8F9F7]">
                  <FileText className="h-4 w-4 text-[#0F3D3E] shrink-0" />
                  <div>
                    <span className="text-[#5C6E6E] block text-[10px]">Pages</span>
                    <span className="font-bold text-[#0F3D3E]">{book.pages ? `${book.pages}` : "250"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F8F9F7]">
                  <Globe className="h-4 w-4 text-[#0F3D3E] shrink-0" />
                  <div>
                    <span className="text-[#5C6E6E] block text-[10px]">Language</span>
                    <span className="font-bold text-[#0F3D3E]">{book.language || "English"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F9F7]">
                  <div className="flex items-center gap-2.5">
                    <Barcode className="h-4 w-4 text-[#0F3D3E] shrink-0" />
                    <div>
                      <span className="text-[#5C6E6E] block text-[10px]">ISBN</span>
                      <span className="font-bold text-[#0F3D3E] font-mono select-all">
                        {book.isbn || "N/A"}
                      </span>
                    </div>
                  </div>
                  {book.isbn && book.isbn !== "N/A" && (
                    <button
                      type="button"
                      onClick={() => handleCopyIsbn(book.isbn || "")}
                      className="p-1.5 rounded-lg hover:bg-[#E2E6DF]/60 text-[#5C6E6E] hover:text-[#0F3D3E] transition-colors"
                      title="Copy ISBN"
                    >
                      {copiedIsbn ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN: High-Converting Buy Box (3 Cols Sticky) --- */}
          <div className="lg:col-span-3">
            <div className="sticky top-24 bg-white border-2 border-[#E2E6DF] rounded-2xl p-6 shadow-md space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-[#0F3D3E]" />

              {existingOrder && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-900 font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Previously Purchased</span>
                  </div>
                  <p className="text-[11px] opacity-90 font-normal">
                    You ordered this item on{" "}
                    {existingOrder.createdAt ? new Date(existingOrder.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }) : "recently"}.
                  </p>
                  <Link
                    href="/dashboard/orders"
                    className="inline-flex items-center gap-1 text-[11px] text-[#0F3D3E] underline font-bold hover:no-underline pt-0.5"
                  >
                    <span>View in My Orders</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Price Box */}
              <div className="space-y-1">
                <span className="text-xs text-[#5C6E6E] font-bold uppercase tracking-wider block">Price</span>
                <div className="flex items-baseline gap-2.5 flex-wrap">
                  <span className="text-3xl font-serif font-bold text-[#0F3D3E]">
                    ₹{price.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Quantity
                </label>
                <div className="flex items-center border border-[#E2E6DF] rounded-xl bg-[#F8F9F7] w-36">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="h-10 w-10 text-[#0F3D3E] rounded-l-xl"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="flex-1 text-center font-serif font-bold text-sm text-[#0F3D3E]">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(quantity + 1)}
                    className="h-10 w-10 text-[#0F3D3E] rounded-r-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Primary Purchase Buttons (Bigger, 12px Rounded) */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0F3D3E]/5 border border-[#0F3D3E]/10 text-xs text-[#0F3D3E]">
                <Truck className="h-4 w-4 text-[#8A6D1E] shrink-0" />
                <span className="font-sans">Usually dispatches in <strong className="font-semibold">24-48 hours</strong> via Blue Dart / India Post</span>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium h-12 rounded-xl shadow-xs gap-2 text-sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Add to Cart</span>
                </Button>

                <Button
                  onClick={handleBuyNow}
                  className="w-full bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-12 rounded-xl shadow-xs gap-2 text-sm"
                >
                  <span>Buy Now</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Trust Signal Badges */}
              <div className="border-t border-[#E2E6DF] pt-4 space-y-2.5 text-xs text-[#5C6E6E]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span><strong>100% Secure Payment</strong> (UPI, Cards, NetBanking)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#0F3D3E] shrink-0" />
                  <span><strong>Fast Dispatch</strong> (Free delivery on orders ₹499+)</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#D4AF37] shrink-0" />
                  <span><strong>Guaranteed Replacement</strong> on damaged copies</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. TABBED SECTION (Synopsis, Details, Reviews) --- */}
        <div className="mt-16 border-t border-[#E2E6DF] pt-10" ref={reviewsSectionRef}>
          {/* Tab Navigation Header with Gold Active Line */}
          <div className="flex border-b border-[#E2E6DF] gap-8">
            <button
              onClick={() => setActiveTab("synopsis")}
              className={cn(
                "pb-3.5 text-sm font-serif font-bold transition-all relative",
                activeTab === "synopsis" ? "text-[#0F3D3E]" : "text-[#5C6E6E] hover:text-[#0F3D3E]"
              )}
            >
              Book Synopsis
              {activeTab === "synopsis" && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#D4AF37] rounded-t" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "pb-3.5 text-sm font-serif font-bold transition-all relative",
                activeTab === "details" ? "text-[#0F3D3E]" : "text-[#5C6E6E] hover:text-[#0F3D3E]"
              )}
            >
              Product Details
              {activeTab === "details" && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#D4AF37] rounded-t" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={cn(
                "pb-3.5 text-sm font-serif font-bold transition-all relative flex items-center gap-2",
                activeTab === "reviews" ? "text-[#0F3D3E]" : "text-[#5C6E6E] hover:text-[#0F3D3E]"
              )}
            >
              <span>Customer Reviews</span>
              <Badge className="bg-[#0F3D3E] text-white text-[10px] px-1.5 py-0">
                {reviewCount}
              </Badge>
              {activeTab === "reviews" && (
                <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-[#D4AF37] rounded-t" />
              )}
            </button>
          </div>

          {/* TAB 1: SYNOPSIS */}
          {activeTab === "synopsis" && (
            <div className="py-6 max-w-4xl space-y-4">
              <div
                className={cn(
                  "prose prose-sm max-w-none text-[#5C6E6E] font-sans leading-relaxed transition-all overflow-hidden",
                  !isSynopsisExpanded && "line-clamp-6"
                )}
              >
                {book.description ? (
                  book.description.split("\n\n").map((para, idx) => (
                    <p key={idx} className="mb-4">{para}</p>
                  ))
                ) : (
                  <p>Synopsis details coming soon.</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
                className="text-[#0F3D3E] font-serif font-bold hover:text-[#D4AF37] gap-1 p-0 h-auto"
              >
                <span>{isSynopsisExpanded ? "Show Less" : "Read Full Synopsis"}</span>
                {isSynopsisExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* TAB 2: PRODUCT DETAILS */}
          {activeTab === "details" && (
            <div className="py-6 max-w-3xl">
              <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                  <div>
                    <dt className="text-xs text-[#5C6E6E] uppercase tracking-wider font-bold">Format</dt>
                    <dd className="font-semibold text-[#0F3D3E] mt-0.5 capitalize">{book.format || "Paperback"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#5C6E6E] uppercase tracking-wider font-bold">Pages</dt>
                    <dd className="font-semibold text-[#0F3D3E] mt-0.5">{book.pages ? `${book.pages}` : "250"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#5C6E6E] uppercase tracking-wider font-bold">Language</dt>
                    <dd className="font-semibold text-[#0F3D3E] mt-0.5">{book.language || "English"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#5C6E6E] uppercase tracking-wider font-bold">ISBN</dt>
                    <dd className="font-mono font-semibold text-[#0F3D3E] mt-0.5">{book.isbn || book.isbn13 || book.isbn10 || "N/A"}</dd>
                  </div>
                </dl>
              </Card>
            </div>
          )}

          {/* TAB 3: CUSTOMER REVIEWS */}
          {activeTab === "reviews" && (
            <div className="py-6 space-y-8 max-w-4xl">
              
              {/* Rating Summary Breakdown Card */}
              <Card className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                  
                  {/* Rating Overall Score */}
                  <div className="md:col-span-4 text-center border-b md:border-b-0 md:border-r border-[#E2E6DF] pb-6 md:pb-0 md:pr-6 space-y-2">
                    <span className="text-5xl font-serif font-bold text-[#0F3D3E] block">{ratingAvg}</span>
                    <div className="flex justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-5 w-5",
                            i < Math.round(Number(ratingAvg))
                              ? "fill-[#D4AF37] text-[#D4AF37]"
                              : "text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[#5C6E6E] font-sans">
                      Based on {reviewCount} verified reader review{reviewCount === 1 ? "" : "s"}
                    </p>
                  </div>

                  {/* Star Distribution Bars */}
                  <div className="md:col-span-5 space-y-2">
                    {starCounts.map(({ star, pct }) => (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-bold text-[#0F3D3E]">{star} ★</span>
                        <div className="flex-1 h-2 rounded-full bg-[#F8F9F7] border border-[#E2E6DF] overflow-hidden">
                          <div className="h-full bg-[#D4AF37] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-[#5C6E6E] font-mono">{pct}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Write Review Action Button */}
                  <div className="md:col-span-3 text-center md:text-right space-y-2">
                    <p className="text-xs text-[#5C6E6E] font-sans">Have you read this book?</p>
                    <Button
                      onClick={() => {
                        if (!user) {
                          toast.error("Please log in to write a review.");
                          router.push("/login");
                          return;
                        }
                        setIsWriteReviewOpen(!isWriteReviewOpen);
                      }}
                      className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold text-xs h-10 px-4 rounded-xl shadow-xs w-full sm:w-auto"
                    >
                      Write a Review
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Expandable Write Review Form */}
              <AnimatePresence>
                {isWriteReviewOpen && user && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Card className="bg-white border-2 border-[#D4AF37]/50 rounded-2xl p-6 shadow-sm space-y-4">
                      <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">
                        {editingReviewId ? "Edit Your Review" : "Write a Customer Review"}
                      </h3>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">Your Rating:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(star)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={cn(
                                  "h-6 w-6 cursor-pointer",
                                  star <= newRating ? "fill-[#D4AF37] text-[#D4AF37]" : "text-gray-200"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your detailed thoughts about the writing, story, and binding quality..."
                        className="w-full min-h-[100px] p-3.5 rounded-xl border border-[#E2E6DF] bg-white text-sm focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#0F3D3E]"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsWriteReviewOpen(false);
                            setEditingReviewId(null);
                            setNewComment("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleReviewSubmit}
                          disabled={submittingReview}
                          size="sm"
                          className="bg-[#0F3D3E] text-white hover:bg-[#174C4D]"
                        >
                          {submittingReview ? "Submitting..." : editingReviewId ? "Update Review" : "Publish Review"}
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reviews List Toolbar */}
              <div className="flex items-center justify-between border-b border-[#E2E6DF] pb-3">
                <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                  Customer Reviews ({reviews.length})
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#5C6E6E]">Sort by:</span>
                  <select
                    value={sortReviewsBy}
                    onChange={(e) => setSortReviewsBy(e.target.value as any)}
                    className="bg-white border border-[#E2E6DF] rounded-lg px-2.5 py-1 text-xs font-semibold text-[#0F3D3E]"
                  >
                    <option value="latest">Most Recent</option>
                    <option value="highest">Highest Rating</option>
                  </select>
                </div>
              </div>

              {/* Reviews Cards List */}
              {sortedReviews.length === 0 ? (
                <div className="text-center py-10 space-y-3 bg-white border border-dashed border-[#E2E6DF] rounded-2xl">
                  <Star className="h-8 w-8 text-[#5C6E6E]/30 mx-auto" />
                  <p className="text-sm font-medium text-[#0F3D3E]">No customer reviews written yet</p>
                  <p className="text-xs text-[#5C6E6E]">Be the first reader to share feedback for this book.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedReviews.map((review: any) => {
                    const reviewUser = review.user || {};
                    const reviewUserId = reviewUser._id || reviewUser.id || review.userId;
                    const isMyReview = user && (user._id === reviewUserId || user.id === reviewUserId);
                    const reviewId = review._id || review.id;
                    const helpfulCount = helpfulMap[reviewId] || 0;

                    return (
                      <Card
                        key={reviewId}
                        className="bg-white border border-[#E2E6DF] hover:border-[#0F3D3E]/30 transition-all rounded-2xl p-5 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[#0F3D3E] text-[#D4AF37] font-serif font-bold text-sm flex items-center justify-center">
                              {(reviewUser.name || review.userName || "R").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-sm text-[#0F3D3E]">
                                  {reviewUser.name || review.userName || "Verified Reader"}
                                </span>
                                {(review.isVerified || review.verifiedPurchase || review.isBuyer || review.purchased) && (
                                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-semibold">
                                    Verified Purchase
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={cn(
                                      "h-3.5 w-3.5",
                                      i < (review.rating || 5) ? "fill-[#D4AF37] text-[#D4AF37]" : "text-gray-200"
                                    )}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#5C6E6E]">
                            <span>
                              {review.createdAt || review.date
                                ? new Date(review.createdAt || review.date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Recent"}
                            </span>

                            {isMyReview && (
                              <div className="flex items-center gap-1.5 ml-2 border-l border-[#E2E6DF] pl-2">
                                <button
                                  onClick={() => handleEditClick(review)}
                                  className="text-[#5C6E6E] hover:text-[#0F3D3E] transition-colors p-1"
                                  title="Edit Review"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(reviewId)}
                                  className="text-[#5C6E6E] hover:text-red-600 transition-colors p-1"
                                  title="Delete Review"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-[#5C6E6E] leading-relaxed font-sans mt-2">
                          {review.comment}
                        </p>

                        <div className="mt-4 pt-3 border-t border-[#E2E6DF]/60 flex items-center justify-between text-xs">
                          <button
                            onClick={() => handleToggleHelpful(reviewId)}
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all",
                              votedHelpful[reviewId]
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-[#F8F9F7] text-[#5C6E6E] border-[#E2E6DF] hover:text-[#0F3D3E]"
                            )}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            <span>Helpful {helpfulCount > 0 ? `(${helpfulCount})` : ""}</span>
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- 4. YOU MAY ALSO LIKE (Related Books Section) --- */}
        {relatedBooks.length > 0 && (
          <section className="mt-16 border-t border-[#E2E6DF] pt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                  You May Also Like
                </h2>
                <p className="text-xs text-[#5C6E6E] font-sans mt-0.5">
                  Curated titles from similar authors and genres
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-[#0F3D3E]">
                <Link href="/books">Explore Catalog →</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedBooks.map((relatedBook) => (
                <BookCard key={relatedBook._id || (relatedBook as any).id} book={relatedBook} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Bottom Add to Cart Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E6DF] p-3 px-4 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif font-bold text-xs text-[#0F3D3E] truncate">{book.title}</p>
          <p className="font-serif font-bold text-sm text-[#0F3D3E]">₹{book.price}</p>
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={(book.stock ?? 1) <= 0}
          className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold text-xs h-10 px-5 rounded-xl shadow-xs shrink-0"
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          <span>{(book.stock ?? 1) <= 0 ? "Out of Stock" : "Add to Cart"}</span>
        </Button>
      </div>
    </div>
  );
}
