"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ShoppingCart, Trash2, Star, Grid, List } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { ErrorState } from "@/components/ui/error-state";
import type { Book } from "@/types";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useEffect } from "react";
export default function WishlistPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { addItem } = useCartStore();

  const fetchWishlist = async () => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get(`/users/${userId}/wishlist`);
      const wishlistData = data.data || data;
      setItems(Array.isArray(wishlistData) ? wishlistData : []);
    } catch (err) {
      console.error("Failed to fetch wishlist:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, [user]);

  const removeFromWishlist = async (id: string) => {
    if (!user?._id && !user?.id) return;
    const userId = user._id || user.id;
    try {
      await api.delete(`/users/${userId}/wishlist/${id}`);
      setItems(items.filter((item) => (item._id || item.id) !== id));
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Failed to remove from wishlist");
    }
  };

  const handleAddToCart = (item: any) => {
    if (!item.inStock && item.stock !== undefined && item.stock <= 0) {
      toast.error("Item is out of stock");
      return;
    }
    const bookToAdd = {
      _id: (item._id || item.id).toString(),
      title: item.title,
      author: typeof item.author === 'object' ? item.author : { name: item.author },
      price: item.price,
      coverImage: item.coverImage || item.cover,
      format: item.format || (item.formats && item.formats[0]) || "Paperback",
    } as unknown as Book;
    addItem(bookToAdd, 1);
    toast.success("Added to cart");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">My Wishlist</h1>
          <p className="text-muted-foreground mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} saved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState
          title="Could not load wishlist"
          message="We encountered an error loading your wishlist."
          onRetry={fetchWishlist}
        />
      ) : loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : items.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "space-y-4"
          }
        >
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {viewMode === "grid" ? (
                <Card className="overflow-hidden group">
                  <div className="relative aspect-[2/3]">
                    <Image
                      src={item.coverImage || item.cover}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 90vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    {item.stock <= 0 && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <Badge variant="secondary">Out of Stock</Badge>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/80 hover:bg-background text-destructive"
                      onClick={() => removeFromWishlist(item._id || item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <Badge variant="outline" className="mb-2">
                      {typeof item.category === 'object' ? item.category?.name : item.category}
                    </Badge>
                    <Link href={`/books/${item.slug || item.id}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors line-clamp-1">
                        {item.title}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground">{typeof item.author === 'object' ? item.author?.name : item.author}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-medium">{item.rating || 0}</span>
                      <span className="text-sm text-muted-foreground">
                        ({item.totalReviews ?? item.reviews ?? 0})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-lg font-bold">₹{item.price || 0}</span>
                    </div>
                    <Button
                      className="w-full mt-3 gap-2"
                      disabled={item.stock <= 0}
                      onClick={() => handleAddToCart(item)}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex gap-4 p-4">
                    <div className="relative w-20 h-28 flex-shrink-0">
                      <Image
                        src={item.coverImage || item.cover}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover rounded"
                      />
                      {item.stock <= 0 && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded">
                          <span className="text-xs font-medium">Out of Stock</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {typeof item.category === 'object' ? item.category?.name : item.category}
                          </Badge>
                          <Link href={`/books/${item.slug || item.id}`}>
                            <h3 className="font-semibold hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground">{typeof item.author === 'object' ? item.author?.name : item.author}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeFromWishlist(item._id || item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium">{item.rating || 0}</span>
                        <span className="text-sm text-muted-foreground">
                          ({item.totalReviews ?? item.reviews ?? 0} reviews)
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">₹{item.price || 0}</span>
                        </div>
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={item.stock <= 0}
                          onClick={() => handleAddToCart(item)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Your wishlist is empty</h3>
            <p className="text-muted-foreground text-center">
              Save books you&apos;re interested in for later
            </p>
            <Button asChild className="mt-4">
              <Link href="/books">Browse Books</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
