"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Star, ShoppingCart, Heart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Book } from "@/types";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { cn, getBookAuthorInfo } from "@/lib/utils";
import { useState, useEffect } from "react";

interface BookCardProps {
  book: Book;
  variant?: "default" | "compact" | "horizontal";
  showActions?: boolean;
}

export function BookCard({
  book,
  variant = "default",
  showActions = true,
}: BookCardProps) {
  const addItem = useCartStore((state) => state.addItem);

  const initialImage = book.coverImage && (book.coverImage.startsWith("http") || book.coverImage.startsWith("/"))
    ? book.coverImage
    : "/logo.webp";
  const [imgSrc, setImgSrc] = useState<string>(initialImage);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [canHover, setCanHover] = useState<boolean>(false);

  useEffect(() => {
    const validSrc = book.coverImage && (book.coverImage.startsWith("http") || book.coverImage.startsWith("/"))
      ? book.coverImage
      : "/logo.webp";
    setImgSrc(validSrc);
  }, [book.coverImage]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
      setCanHover(mediaQuery.matches);
      const handler = (e: MediaQueryListEvent) => setCanHover(e.matches);
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, []);

  // 3D Tilt & Glare hooks (active only on desktop fine pointer devices)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 240, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 240, damping: 25 });
  
  // Refined, subtle luxury tilt (8deg max instead of 15deg)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["100%", "0%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["100%", "0%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    if (!canHover) return;
    x.set(0);
    y.set(0);
  };

  const [addingToWishlist, setAddingToWishlist] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(book);
    toast.success(`"${book.title}" added to cart!`);
  };

  const handleAddToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { user, isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated || !user) {
      toast.error("Please log in to save books to your wishlist.");
      return;
    }
    setAddingToWishlist(true);
    try {
      await api.post(`/users/${user._id || user.id}/wishlist`, { bookId: book._id });
      toast.success(`"${book.title}" added to your wishlist!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Could not add to wishlist.");
    } finally {
      setAddingToWishlist(false);
    }
  };

  const authorInfo = getBookAuthorInfo(book);
  const authorName = authorInfo.name;
  const price = book.price ?? book.mrp ?? 0;
  const rating = book.rating ?? (book as any).ratings ?? 0;
  const totalReviews = book.totalReviews ?? (book as any).reviewCount ?? 0;

  if (variant === "horizontal") {
    return (
      <Link href={`/books/${book.slug || book._id}`}>
        <motion.div
          whileHover={canHover ? { y: -2 } : undefined}
          whileTap={{ scale: 0.98 }}
          className="flex gap-4 p-4 bg-card rounded-lg border border-border hover:shadow-md transition-shadow"
        >
          <div className="relative w-24 h-36 flex-shrink-0 rounded-r-md rounded-l-sm overflow-hidden shadow-md ring-1 ring-border/20 group-hover:shadow-lg transition-all">
            {/* Book Spine Effect */}
            <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/20 to-transparent z-10 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 z-10 pointer-events-none" />
            
            {/* Shimmer skeleton loader */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-muted/60 via-muted/20 to-muted/60 animate-pulse z-0" />
            )}
            
            <Image
              src={imgSrc}
              onError={() => setImgSrc("/logo.webp")}
              alt={book.title}
              fill
              className={cn(
                "object-cover transition-transform duration-500 group-hover:scale-105",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              sizes="96px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground line-clamp-2 mb-1">
              {book.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">{authorName}</p>
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-3 w-3",
                    i < Math.round(rating || 0)
                      ? "fill-secondary text-secondary"
                      : "text-muted",
                  )}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                ({totalReviews})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-primary">
                ₹{price.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={`/books/${book.slug || book._id}`}>
        <motion.div
          whileHover={canHover ? { y: -4 } : undefined}
          whileTap={{ scale: 0.98 }}
          className="group"
        >
          <div className="relative aspect-[2/3] rounded-r-md rounded-l-sm overflow-hidden mb-2 shadow-md ring-1 ring-border/20 group-hover:shadow-lg transition-all">
            {/* Book Spine Effect */}
            <div className="absolute inset-y-0 left-0 w-[4%] bg-gradient-to-r from-black/20 to-transparent z-10 mix-blend-multiply pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 z-10 pointer-events-none" />
            
            {/* Shimmer skeleton loader */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-muted/60 via-muted/20 to-muted/60 animate-pulse z-0" />
            )}

            <Image
              src={imgSrc}
              onError={() => setImgSrc("/logo.webp")}
              alt={book.title}
              fill
              className={cn(
                "object-cover group-hover:scale-105 transition-transform duration-500",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          </div>
          <h3 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">{authorName}</p>
          <p className="text-xs sm:text-sm font-semibold text-primary mt-1">
            ₹{price.toLocaleString()}
          </p>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link
      href={`/books/${book.slug || book._id}`}
      className="block h-full"
      style={canHover ? { perspective: 1200 } : undefined}
    >
      <motion.div
        onMouseMove={canHover ? handleMouseMove : undefined}
        onMouseLeave={canHover ? handleMouseLeave : undefined}
        style={canHover ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        whileHover={canHover ? { y: -6, scale: 1.015 } : undefined}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="group bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 shadow-xs hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:shadow-primary/10 transition-all duration-300 flex flex-col h-full active:scale-[0.98]"
      >
        {/* Cover Image */}
        <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border/50">
          {/* Book Spine Effect */}
          <div className="absolute inset-y-0 left-0 w-[4%] bg-gradient-to-r from-black/30 to-transparent z-10 mix-blend-multiply pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 via-transparent to-white/10 z-10 pointer-events-none" />
          
          {/* Shimmer skeleton loader */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-muted/60 via-muted/20 to-muted/60 animate-pulse z-0" />
          )}

          <Image
            src={imgSrc}
            onError={() => setImgSrc("/logo.webp")}
            alt={book.title}
            fill
            className={cn(
              "object-cover transition-all duration-500 ease-out",
              canHover && "group-hover:scale-105",
              imageLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImageLoaded(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Dynamic Glare Overlay (only on desktop fine pointer devices) */}
          {canHover && (
            <motion.div
              className="absolute inset-0 z-20 pointer-events-none mix-blend-overlay opacity-0 group-hover:opacity-35 transition-opacity duration-300"
              style={{
                background: "radial-gradient(circle at center, rgba(255,255,255,0.8) 0%, transparent 60%)",
                left: glareX,
                top: glareY,
                transform: "translate(-50%, -50%)",
                width: "200%",
                height: "200%"
              }}
            />
          )}

          {/* Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
            {book.isBestseller && (
              <Badge
                variant="default"
                className="bg-secondary text-secondary-foreground text-[10px] sm:text-xs font-semibold shadow-md px-2 py-0.5"
              >
                ⭐ Bestseller
              </Badge>
            )}
            {book.isNewRelease && (
              <Badge
                variant="default"
                className="bg-primary text-[10px] sm:text-xs font-semibold shadow-md px-2 py-0.5"
              >
                ✨ New
              </Badge>
            )}
          </div>

          {/* Quick Actions on desktop hover */}
          {showActions && canHover && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 z-20">
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-sm transition-transform hover:scale-110"
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="sr-only">Add to cart</span>
              </Button>
              <Button
                size="icon"
                disabled={addingToWishlist}
                className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground text-primary shadow-lg transition-transform hover:scale-110"
                onClick={handleAddToWishlist}
              >
                <Heart className="h-4 w-4" />
                <span className="sr-only">Add to wishlist</span>
              </Button>
              <Button
                size="icon"
                className="h-10 w-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground text-primary shadow-lg transition-transform hover:scale-110"
              >
                <Eye className="h-4 w-4" />
                <span className="sr-only">Quick view</span>
              </Button>
            </div>
          )}
        </div>

        {/* Content: Balanced typography for mobile 2-col & desktop */}
        <div className="p-3 sm:p-5 bg-gradient-to-b from-card to-card/50 flex flex-col flex-grow">
          <h3 className="font-serif font-bold text-sm sm:text-base md:text-lg text-foreground line-clamp-2 mb-1 sm:mb-2 group-hover:text-primary transition-colors duration-300 leading-snug">
            {book.title}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 font-medium line-clamp-1">
            {authorName}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2 sm:mb-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3 sm:h-3.5 w-3 sm:w-3.5",
                  i < Math.round(rating || 0)
                    ? "fill-primary text-primary"
                    : "text-muted",
                )}
              />
            ))}
            <span className="text-[11px] sm:text-xs text-muted-foreground ml-1 font-medium">
              ({totalReviews})
            </span>
          </div>

          {/* Price & Format */}
          <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-border/30 mt-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-xl md:text-2xl font-bold text-primary">
                ₹{price.toLocaleString()}
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5">
              {book.format || "Paperback"}
            </Badge>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
