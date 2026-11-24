"use client";

import type { OrderRecord } from "@/types/commerce-api";
import { describeApiError, publicApiMessage, publicRetryAt } from "@/lib/api-error";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from '@/components/ui/backend-image';
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Barcode,
  ShoppingCart,
  Heart,
  ArrowRight,
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
  RefreshCw,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CompactBookCard } from "@/components/books/book-card";
import { ErrorState } from "@/components/ui/error-state";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import type { Book } from "@/types";
import toast from "react-hot-toast";
import { cn, getBookAuthorInfo } from "@/lib/utils";
import api, { getPublic } from "@/lib/api";
import { uniqueBooks } from "@/lib/catalog";
import { onLiveChange } from "@/lib/live-sync";
import { publishedNumber } from "@/lib/book-presentation";
import { BookDescription } from "@/components/books/book-description";

export function BookDetailView({ initialBook }: { initialBook: Book | null }) {
  const params = useParams();
  const router = useRouter();
  const userId = useAuthStore((state) => state.contextVerified ? state.user?._id || state.user?.id : undefined);
  const slug = encodeURIComponent(String(params.slug));
  const bookPath = `/books/${slug}`;

  const [book, setBook] = useState<Book | null>(initialBook);
  const [orderMatch, setOrderMatch] = useState<{ userId: string; bookId: string; order: OrderRecord }>();
  const [loading, setLoading] = useState(!initialBook);
  const bookLoaded = useRef(Boolean(initialBook));
  const [error, setError] = useState<unknown>(null);
  const [purchaseChecked, setPurchaseChecked] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [copiedIsbn, setCopiedIsbn] = useState(false);

  const handleCopyIsbn = async (text: string) => {
    if (!text || text === "N/A") return;
    try {
    await navigator.clipboard.writeText(text);
    setCopiedIsbn(true);
    toast.success("ISBN copied to clipboard!");
    setTimeout(() => setCopiedIsbn(false), 2000);
    } catch {
      toast.error("Could not copy the ISBN. Please select and copy it manually.");
    }
  };
  const [selectedImage, setSelectedImage] = useState(0);
  // format is read directly from book.format
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"synopsis" | "details">("synopsis");

  const addItem = useCartStore((state) => state.addItem);

  const fetchBookData = useCallback(async (signal?: AbortSignal) => {
    if (!bookLoaded.current) setLoading(true);
    setError(null);
    try {
      const response = await getPublic(bookPath, { signal });
      if (signal?.aborted) return;
      const bookData = response.data?.data ?? response.data;
      if (!bookData || typeof bookData.title !== 'string') throw new Error('The book detail response was incomplete.');
      setBook(bookData as Book);
      setPurchaseChecked(true);
      bookLoaded.current = true;
    } catch (error) {
      if (!signal?.aborted) setError(error);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [bookPath]);

  useEffect(() => {
    let controller: AbortController;
    const reload = () => {
      controller?.abort();
      controller = new AbortController();
      void fetchBookData(controller.signal);
    };
    reload();
    const stop = onLiveChange("books", reload, 60_000);
    return () => { stop(); controller.abort(); };
  }, [fetchBookData]);

  const bookId = book?._id || book?.id;
  const bookSlug = book?.slug;
  const existingOrder = orderMatch?.userId === userId && orderMatch?.bookId === bookId ? orderMatch?.order : undefined;
  useEffect(() => {
    if (!userId || !bookId) return;
    const controller = new AbortController();
    api.get(`/users/${userId}/orders`, { params: { limit: 100 }, signal: controller.signal, cache: 'no-store' })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const orders = data?.data?.orders || data?.orders || data?.data || data;
        if (Array.isArray(orders)) {
          const match = (orders as OrderRecord[]).find((order) => order.items?.some(({ book: item }) =>
            typeof item === "string" ? item === bookId : item?._id === bookId || item?.id === bookId || (bookSlug && item?.slug === bookSlug)
          ));
          setOrderMatch(match ? { userId, bookId, order: match } : undefined);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error("Failed to check user order for book:", describeApiError(error));
      });
    return () => controller.abort();
  }, [userId, bookId, bookSlug]);

  const saveToWishlist = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }
    if (!bookId || savingWishlist) return;
    setSavingWishlist(true);
    try {
      await api.post(`/users/${userId}/wishlist`, { bookId });
      toast.success("Book saved to your wishlist.");
    } catch (error) {
      toast.error(describeApiError(error).response?.data?.message || "Could not save this book. Please retry.");
    } finally {
      setSavingWishlist(false);
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
          message={publicApiMessage(error, "We couldn't fetch details for this book right now.")}
          retryAt={publicRetryAt(error)}
          onRetry={() => void fetchBookData()}
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
  const price = publishedNumber(book.price);

  const availableStock = Math.max(0, (publishedNumber(book.stock) ?? 0) - (publishedNumber(book.reservedStock) ?? 0));
  const isOutOfStock = availableStock <= 0;
  const purchaseUnavailable = !purchaseChecked || isOutOfStock || price === null;

  const handleAddToCart = () => {
    if (purchaseUnavailable) {
      toast.error(price === null ? "The book price is unavailable. Please retry later." : "This book is out of stock right now.");
      return;
    }
    const qty = Math.min(quantity, availableStock);
    addItem(book, qty);
    toast.success(`Added ${qty} ${qty > 1 ? "copies" : "copy"} of "${book.title}" to cart! 🛒`);
  };

  const handleBuyNow = () => {
    if (purchaseUnavailable) {
      toast.error(price === null ? "The book price is unavailable. Please retry later." : "This book is out of stock right now.");
      return;
    }
    addItem(book, Math.min(quantity, availableStock));
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
                  <Link href={`/books?category=${encodeURIComponent(category.slug)}`} className="hover:text-[#0F3D3E]">
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
                    Status: {existingOrder.orderStatus || existingOrder.status || "Unavailable"}
                  </span>
                  <span>• Order #{existingOrder.orderNumber || existingOrder._id || existingOrder.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-1.5 text-xs font-bold shadow-xs" asChild><Link href="/dashboard/orders">
                  <Truck className="h-4 w-4" />
                  <span>View Order & Tracking</span>
                </Link></Button>
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
                className="relative aspect-[2/3] w-full max-w-[220px] sm:max-w-[300px] lg:max-w-[360px] mx-auto rounded-2xl overflow-hidden bg-white border-2 border-[#E2E6DF] shadow-lg group hover:shadow-xl transition-all"
              >
                {/* Subtle Book Spine Effect */}
                <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent z-10 mix-blend-multiply pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 z-10 pointer-events-none" />

                <Image
                  src={book.galleryImages?.[selectedImage] || book.coverImage || "/placeholder-book.svg"}
                  alt={book.title}
                  fill
                  sizes="(max-width: 639px) 220px, (max-width: 1023px) 300px, 360px"
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
                    <span className="font-bold text-[#0F3D3E] capitalize">{book.format || "Not provided"}</span>
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
                    <span className="font-bold text-[#0F3D3E]">{book.language || "Not provided"}</span>
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
                    {price === null ? "Price unavailable" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(price)}
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
                    onClick={() => setQuantity(Math.min(quantity + 1, availableStock))}
                    disabled={quantity >= availableStock}
                    className="h-10 w-10 text-[#0F3D3E] rounded-r-xl"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Primary Purchase Buttons (Bigger, 12px Rounded) */}
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0F3D3E]/5 border border-[#0F3D3E]/10 text-xs text-[#0F3D3E]">
                <Truck className="h-4 w-4 text-[#8A6D1E] shrink-0" />
                <Link href="/track-order" className="font-sans underline underline-offset-4">Track an existing order</Link>
              </div>
              <div className="space-y-3 pt-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={purchaseUnavailable}
                  className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium h-12 rounded-xl shadow-xs gap-2 text-sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
                </Button>
                {bookId && (
                  <Button type="button" variant="outline" className="min-h-11 w-full gap-2" disabled={savingWishlist} onClick={saveToWishlist}>
                    <Heart className="size-4" aria-hidden="true" />
                    {savingWishlist ? "Saving to wishlist..." : "Save to wishlist"}
                  </Button>
                )}

                <Button
                  onClick={handleBuyNow}
                  disabled={purchaseUnavailable}
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
                  <span><strong>Secure UPI Payment</strong> (Google Pay, PhonePe, Paytm and any UPI app)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#0F3D3E] shrink-0" />
                  <span><strong>Delivery details</strong> are confirmed with your order</span>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-[#D4AF37] shrink-0" />
                  <Link href="/returns" className="underline underline-offset-4">Read the published returns policy</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. TABBED SECTION (Synopsis and Details) --- */}
        <div className="mt-16 border-t border-[#E2E6DF] pt-10">
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
                  <BookDescription text={book.description} />
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
                    <dd className="font-semibold text-[#0F3D3E] mt-0.5 capitalize">{book.format || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#5C6E6E] uppercase tracking-wider font-bold">Pages</dt>
                    <dd className="font-semibold text-[#0F3D3E] mt-0.5">{book.pages ? `${book.pages}` : "250"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#5C6E6E] uppercase tracking-wider font-bold">Language</dt>
                    <dd className="font-semibold text-[#0F3D3E] mt-0.5">{book.language || "Not provided"}</dd>
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
        </div>

        {/* Related books */}
        <RelatedBooks bookPath={bookPath} />
      </div>

      {/* Mobile Sticky Bottom Add to Cart Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E2E6DF] p-3 px-4 shadow-lg flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-serif font-bold text-xs text-[#0F3D3E] truncate">{book.title}</p>
          <p className="font-serif font-bold text-sm text-[#0F3D3E]">₹{book.price}</p>
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={purchaseUnavailable}
          className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold text-xs h-10 px-5 rounded-xl shadow-xs shrink-0"
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          <span>{isOutOfStock ? "Out of Stock" : "Add to Cart"}</span>
        </Button>
      </div>
    </div>
  );
}

function RelatedBooks({ bookPath }: { bookPath: string }) {
  const section = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [failure, setFailure] = useState<{ path: string; attempt: number; error: unknown }>();
  const [attempt, setAttempt] = useState(0);
  const error = failure?.path === bookPath && failure.attempt === attempt ? failure.error : null;

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: '240px' });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport) return;
    const controller = new AbortController();
    getPublic(`${bookPath}/related`, { params: { limit: 4 }, signal: controller.signal })
      .then(({ data }) => {
        const items = data?.data?.books ?? data?.data ?? data?.books ?? data;
        if (!Array.isArray(items)) throw new Error('The related book list was incomplete.');
        if (!controller.signal.aborted) setBooks(uniqueBooks(items));
      })
      .catch((error) => { if (!controller.signal.aborted) setFailure({ path: bookPath, attempt, error }); });
    const stop = onLiveChange('books', (reason) => {
      if (reason === 'change') {
        setAttempt((previous) => previous + 1);
      }
    });
    return () => { stop(); controller.abort(); };
  }, [bookPath, nearViewport, attempt]);

  return (
    <section ref={section} className={books.length || error ? 'mt-12' : undefined} aria-label="Related books">
      {error ? (
        <ErrorState title="Related books could not load" message={publicApiMessage(error, 'Please retry to load related books.')}
          retryAt={publicRetryAt(error)} onRetry={() => setAttempt((previous) => previous + 1)} />
      ) : books.length > 0 && (
        <>
          <h2 className="mb-5 font-serif text-2xl font-semibold">Related books</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {books.map((book) => <CompactBookCard key={book._id || book.id || book.slug} book={book} />)}
          </div>
        </>
      )}
    </section>
  );
}
