"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  DollarSign,
  Loader2,
  Eye,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { EXACT_CATEGORIES } from "@/config/categories";
import { resolveCategoryObjectId, getCategoryDisplayName } from "@/lib/categories";

export default function AuthorBookEditDetailPage() {
  const router = useRouter();
  const routeParams = useParams();
  const bookId = (routeParams?.id as string) || "";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [originalCatId, setOriginalCatId] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    price: "",
    mrp: "",
    category: "Fiction",
    description: "",
    format: "paperback",
    pages: "200",
    isbn: "",
    stock: "50",
    coverImage: "",
    royaltyPercentage: 30,
    status: "published",
  });

  useEffect(() => {
    if (!bookId) return;

    const fetchBook = async () => {
      setFetching(true);
      try {
        let bookData: any = null;

        // 1. Try author detail
        const resMe = await api.get(`/authors/me/books/${bookId}`).catch(() => null);
        if (resMe?.data) {
          bookData = resMe.data.data || resMe.data;
        }

        // 2. Try /books/:id
        if (!bookData) {
          const resPublic = await api.get(`/books/${bookId}`).catch(() => null);
          if (resPublic?.data) {
            bookData = resPublic.data.data || resPublic.data;
          }
        }

        // 3. Try /admin/books/:id
        if (!bookData) {
          const resAdmin = await api.get(`/admin/books/${bookId}`).catch(() => null);
          if (resAdmin?.data) {
            bookData = resAdmin.data.data || resAdmin.data;
          }
        }

        if (bookData) {
          let catName = "";
          let catId = "";
          if (typeof bookData.category === "object" && bookData.category !== null) {
            catId = bookData.category._id || bookData.category.id || "";
            catName = bookData.category.name || bookData.category.slug || "";
          } else if (typeof bookData.category === "string") {
            if (/^[0-9a-fA-F]{24}$/.test(bookData.category)) {
              catId = bookData.category;
              catName = getCategoryDisplayName(bookData.category);
            } else {
              catName = bookData.category;
            }
          }
          setOriginalCatId(catId);

          const bookPrice = (bookData.mrp || bookData.price || 0).toString();
          const bookRoyalty = typeof bookData.royaltyPercentage === "number" ? bookData.royaltyPercentage : 30;

          setFormData({
            title: bookData.title || "",
            price: bookPrice,
            mrp: bookPrice,
            category: catName || "Fiction",
            description: bookData.description || "",
            format: bookData.format || "paperback",
            pages: (bookData.pages || 200).toString(),
            isbn: bookData.isbn || "",
            stock: (bookData.stock ?? 50).toString(),
            coverImage: bookData.coverImage || "",
            royaltyPercentage: bookRoyalty,
            status: bookData.status || "published",
          });
        } else {
          toast.error("Book not found in database.");
        }
      } catch (err) {
        console.error("Failed to load book for editing:", err);
        toast.error("Could not fetch book details.");
      } finally {
        setFetching(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;

    const numericPrice = Number(formData.price) || 0;
    if (numericPrice <= 0) {
      toast.error("Price must be greater than ₹0.");
      return;
    }

    setLoading(true);
    try {
      // Resolve category to 24-character ObjectId to avoid CastError
      const resolvedCatId = await resolveCategoryObjectId(formData.category, originalCatId);

      const updatePayload: Record<string, any> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        mrp: numericPrice,
        price: numericPrice, // Synchronized compatibility alias
        format: formData.format || "paperback",
        pages: Number(formData.pages) || 200,
        isbn: formData.isbn.trim() || undefined,
        stock: Number(formData.stock) || 0,
      };

      if (resolvedCatId) {
        updatePayload.category = resolvedCatId;
      }

      if (formData.coverImage.trim()) {
        updatePayload.coverImage = formData.coverImage.trim();
      }

      let success = false;
      try {
        await api.put(`/authors/me/books/${bookId}`, updatePayload);
        success = true;
      } catch (authorErr: any) {
        console.warn("Author PUT /authors/me/books/:id failed, attempting fallbacks:", authorErr?.response?.data?.message);
        try {
          await api.put(`/admin/books/${bookId}`, updatePayload);
          success = true;
        } catch (adminErr: any) {
          try {
            await api.put(`/books/${bookId}`, updatePayload);
            success = true;
          } catch (fallbackErr: any) {
            throw authorErr?.response?.data?.message
              ? authorErr
              : adminErr?.response?.data?.message
              ? adminErr
              : fallbackErr;
          }
        }
      }

      if (success) {
        toast.success(`"${formData.title}" updated successfully with price ₹${numericPrice}! 📚`);
        router.push("/author/books");
      }
    } catch (err: any) {
      console.error("Failed to update book:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to update book.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const currentPriceNum = Number(formData.price) || 0;
  const estimatedRoyaltyPerCopy = Math.round((currentPriceNum * (formData.royaltyPercentage || 30)) / 100);

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F3D3E]" />
        <p className="text-xs text-[#5C6E6E]">Loading book details for author editing...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/author/books"
            className="text-xs text-[#5C6E6E] hover:text-[#0F3D3E] flex items-center gap-1 font-semibold mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to My Books</span>
          </Link>
          <h1 className="text-2xl font-serif font-bold text-[#0F3D3E] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#8A6D1E]" />
            <span>Edit Book Details & Pricing</span>
          </h1>
        </div>

        <Link
          href={`/books/${bookId}`}
          target="_blank"
          className="text-xs text-[#0F3D3E] hover:underline flex items-center gap-1.5 font-bold"
        >
          <Eye className="h-4 w-4" />
          <span>View Public Store Page</span>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PRICING & ROYALTY HIGHLIGHT SECTION */}
        <Card className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-2xl shadow-2xs">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-serif font-bold text-emerald-950 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <span>Retail Price & Author Royalty</span>
              </CardTitle>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                {formData.royaltyPercentage}% Royalty Tier
              </span>
            </div>
            <CardDescription className="text-xs text-emerald-800/80">
              Adjust your book's store retail price (MRP). Any price change reflects immediately on the storefront.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <Label htmlFor="bookPrice" className="text-xs font-bold text-[#0F3D3E]">
                  Retail Price / MRP (₹) *
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-[#0F3D3E]">
                    ₹
                  </span>
                  <Input
                    id="bookPrice"
                    type="number"
                    min={1}
                    max={99999}
                    value={formData.price}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        price: e.target.value,
                        mrp: e.target.value,
                      }))
                    }
                    className="pl-8 font-mono text-lg font-bold text-[#0F3D3E] bg-white border-emerald-300 h-12 rounded-xl"
                    placeholder="e.g. 270"
                    required
                  />
                </div>
                <p className="text-[11px] text-[#5C6E6E]">
                  Customer retail selling price in Indian Rupees (INR).
                </p>
              </div>

              <div className="p-4 bg-white/95 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-[11px] font-medium text-emerald-900 block">
                  Projected Author Payout / Copy:
                </span>
                <p className="text-3xl font-serif font-bold text-emerald-700">
                  ₹{estimatedRoyaltyPerCopy} <span className="text-xs font-normal text-[#5C6E6E]">/ unit</span>
                </p>
                <p className="text-[10px] text-[#5C6E6E]">
                  Calculated dynamically from your {formData.royaltyPercentage}% author royalty agreement.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* METADATA & SPECS */}
        <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
          <CardHeader className="p-5 pb-3 border-b border-[#E2E6DF]/80">
            <CardTitle className="text-base font-serif font-bold text-[#0F3D3E]">
              Book Information
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Book Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-[#F8F9F7] font-serif font-bold text-base h-11 border-[#E2E6DF] rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Genre / Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl h-11 text-xs font-semibold">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF] max-h-72">
                    {EXACT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="format" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Format *
                </Label>
                <Select
                  value={formData.format}
                  onValueChange={(val) => setFormData({ ...formData, format: val })}
                >
                  <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl h-11 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF]">
                    <SelectItem value="paperback">Paperback</SelectItem>
                    <SelectItem value="hardcover">Hardcover</SelectItem>
                    <SelectItem value="ebook">eBook / Digital Edition</SelectItem>
                    <SelectItem value="audiobook">Audiobook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Book Synopsis & Description *
              </Label>
              <Textarea
                id="description"
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs leading-relaxed"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pages" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Page Count
                </Label>
                <Input
                  id="pages"
                  type="number"
                  min={1}
                  value={formData.pages}
                  onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                  className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="isbn" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  ISBN
                </Label>
                <Input
                  id="isbn"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                  placeholder="978-93-..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Stock Units
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="coverImage" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Cover Image URL
              </Label>
              <Input
                id="coverImage"
                value={formData.coverImage}
                onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                placeholder="https://res.cloudinary.com/..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/author/books")}
            disabled={loading}
            className="border-[#E2E6DF] rounded-xl text-xs"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={loading}
            className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white rounded-xl text-xs font-bold gap-2 px-6 h-11 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Book & Price Updates</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
