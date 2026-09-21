"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Eye,
  Star,
  TrendingUp,
  Edit,
  MoreVertical,
  Search,
  Loader2,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";
import { EXACT_CATEGORIES } from "@/config/categories";
import { resolveCategoryObjectId, getCategoryDisplayName } from "@/lib/categories";

export default function AuthorBooksPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<any[]>([]);
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [originalCatId, setOriginalCatId] = useState<string>("");

  const [editForm, setEditForm] = useState({
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
  });

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const authorUserId = user._id || user.id;

      // Tier 1: Try /authors/me/books
      const resMe = await api.get("/authors/me/books").catch(() => null);
      let fetchedBooks: any[] =
        resMe?.data?.data?.books ||
        resMe?.data?.books ||
        (Array.isArray(resMe?.data?.data) ? resMe.data.data : []) ||
        (Array.isArray(resMe?.data) ? resMe.data : []);

      // Tier 2: Try /books?author=...
      if (!Array.isArray(fetchedBooks) || fetchedBooks.length === 0) {
        const resPublic = await api.get("/books", { params: { author: authorUserId, limit: 100 } }).catch(() => null);
        const publicList =
          resPublic?.data?.data?.books ||
          resPublic?.data?.data ||
          resPublic?.data ||
          [];
        if (Array.isArray(publicList) && publicList.length > 0) {
          fetchedBooks = publicList;
        }
      }

      setBooks(Array.isArray(fetchedBooks) ? fetchedBooks : []);
    } catch (error) {
      console.error("Failed to fetch author books:", error);
      toast.error("Could not load author books list.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Open Edit Modal for a book
  const openEditModal = (book: any) => {
    setEditingBook(book);

    let catName = "";
    let catId = "";
    if (typeof book.category === "object" && book.category !== null) {
      catId = book.category._id || book.category.id || "";
      catName = book.category.name || book.category.slug || "";
    } else if (typeof book.category === "string") {
      if (/^[0-9a-fA-F]{24}$/.test(book.category)) {
        catId = book.category;
        catName = getCategoryDisplayName(book.category);
      } else {
        catName = book.category;
      }
    }
    setOriginalCatId(catId);

    const bookPrice = (book.mrp || book.price || 0).toString();
    const bookRoyalty = typeof book.royaltyPercentage === "number" ? book.royaltyPercentage : 30;

    setEditForm({
      title: book.title || "",
      price: bookPrice,
      mrp: bookPrice,
      category: catName || "Fiction",
      description: book.description || "",
      format: book.format || "paperback",
      pages: (book.pages || 200).toString(),
      isbn: book.isbn || "",
      stock: (book.stock ?? 50).toString(),
      coverImage: book.coverImage || "",
      royaltyPercentage: bookRoyalty,
    });

    setIsEditModalOpen(true);
  };

  // Submit Book Edit
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    const bookId = editingBook._id || editingBook.id;
    if (!bookId) {
      toast.error("Invalid book ID.");
      return;
    }

    const numericPrice = Number(editForm.price) || 0;
    if (numericPrice <= 0) {
      toast.error("Price must be greater than ₹0.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Resolve category to 24-character ObjectId to avoid CastError
      const resolvedCatId = await resolveCategoryObjectId(editForm.category, originalCatId);

      const updatePayload: Record<string, any> = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        mrp: numericPrice,
        price: numericPrice, // Synchronized price alias
        format: editForm.format || "paperback",
        pages: Number(editForm.pages) || 200,
        isbn: editForm.isbn.trim() || undefined,
        stock: Number(editForm.stock) || 0,
      };

      if (resolvedCatId) {
        updatePayload.category = resolvedCatId;
      }

      if (editForm.coverImage.trim()) {
        updatePayload.coverImage = editForm.coverImage.trim();
      }

      // 1. Try author update route
      let success = false;
      try {
        await api.put(`/authors/me/books/${bookId}`, updatePayload);
        success = true;
      } catch (authorErr: any) {
        console.warn("Author PUT /authors/me/books/:id failed, attempting admin/public fallback:", authorErr?.response?.data?.message);
        // 2. Try admin books endpoint if author has permission or fallback
        try {
          await api.put(`/admin/books/${bookId}`, updatePayload);
          success = true;
        } catch (adminErr: any) {
          // 3. Try /books/:id endpoint
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
        toast.success(`"${editForm.title}" updated successfully with price ₹${numericPrice}! 📚`);
        setIsEditModalOpen(false);
        fetchBooks();
      }
    } catch (err: any) {
      console.error("Failed to update author book:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to update book.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBooks = books.filter((book) =>
    book.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSales = books.reduce((sum, book) => sum + (book.totalSales || 0), 0);
  const totalRevenue = books.reduce(
    (sum, book) => sum + (book.totalSales || 0) * (book.mrp || book.price || 0),
    0
  );
  const avgRating =
    books.length > 0
      ? books.reduce((sum, book) => sum + (book.rating || 0), 0) / books.length
      : 0;

  // Calculate estimated royalty preview in edit modal
  const currentPriceNum = Number(editForm.price) || 0;
  const estimatedRoyaltyPerCopy = Math.round((currentPriceNum * (editForm.royaltyPercentage || 30)) / 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold lg:text-3xl text-[#0F3D3E] flex items-center gap-2.5">
            <BookOpen className="h-7 w-7 text-[#8A6D1E]" />
            <span>My Author Books</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Manage your published catalog, modify retail pricing (MRP), and track sales & royalties.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F3D3E]/10">
                <BookOpen className="h-5 w-5 text-[#0F3D3E]" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#0F3D3E]">{books.length}</p>
                <p className="text-xs text-[#5C6E6E]">Total Published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-emerald-700">{totalSales}</p>
                <p className="text-xs text-[#5C6E6E]">Copies Sold</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#0F3D3E]">
                  ₹{totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-[#5C6E6E]">Gross Book Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
                <Star className="h-5 w-5 text-purple-700 fill-purple-700/20" />
              </div>
              <div>
                <p className="text-2xl font-serif font-bold text-[#0F3D3E]">{avgRating.toFixed(1)}</p>
                <p className="text-xs text-[#5C6E6E]">Reader Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search your published books by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-[#F8F9F7] text-xs h-10 border-[#E2E6DF] rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card className="bg-white border-[#E2E6DF] rounded-2xl shadow-2xs overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-[#E2E6DF] bg-[#F8F9F7]/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-serif font-bold text-[#0F3D3E]">
                Catalog Books ({filteredBooks.length})
              </CardTitle>
              <CardDescription className="text-xs text-[#5C6E6E]">
                Click "Edit Book & Price" on any title to change pricing, metadata, or inventory.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-[#F8F9F7]">
                <TableRow className="border-[#E2E6DF]">
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Book Details</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Genre / Category</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Current Price (MRP)</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Royalty / Unit</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Sales</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Rating</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-36 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                      <p className="text-xs text-[#5C6E6E] mt-2">Loading author books...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredBooks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-44 text-center">
                      <BookOpen className="h-10 w-10 mx-auto text-[#5C6E6E]/40 mb-2" />
                      <h3 className="font-serif font-bold text-[#0F3D3E] text-base">No books found</h3>
                      <p className="text-xs text-[#5C6E6E] mt-1 max-w-sm mx-auto">
                        Your published titles will appear here once approved and published by the editorial team.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBooks.map((book, index) => {
                    const priceVal = book.mrp || book.price || 0;
                    const royaltyPerc = typeof book.royaltyPercentage === "number" ? book.royaltyPercentage : 30;
                    const unitRoyalty = Math.round((priceVal * royaltyPerc) / 100);

                    return (
                      <motion.tr
                        key={book._id || book.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-[#E2E6DF]/70 hover:bg-[#F8F9F7]/60 text-xs"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Image
                              src={
                                book.coverImage &&
                                (book.coverImage.startsWith("http") || book.coverImage.startsWith("/"))
                                  ? book.coverImage
                                  : "/logo.webp"
                              }
                              onError={(e: any) => {
                                if (e?.target) e.target.src = "/logo.webp";
                              }}
                              alt={book.title}
                              width={40}
                              height={56}
                              className="h-14 w-10 rounded-lg object-cover border border-[#E2E6DF] shadow-2xs shrink-0"
                            />
                            <div className="space-y-0.5">
                              <p className="font-serif font-bold text-sm text-[#0F3D3E] line-clamp-1">
                                {book.title}
                              </p>
                              <p className="text-[11px] text-[#5C6E6E]">
                                Format: <strong className="capitalize">{book.format || "Paperback"}</strong> • {book.pages || 200} pages
                              </p>
                              {book.isbn && (
                                <p className="text-[10px] font-mono text-[#5C6E6E]/80">
                                  ISBN: {book.isbn}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="bg-[#F8F9F7] text-[#0F3D3E] border-[#E2E6DF] text-[11px] font-medium">
                            {getCategoryDisplayName(book.category)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-sm text-[#0F3D3E]">
                              ₹{priceVal}
                            </span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded block w-fit border border-emerald-200">
                              Active MRP
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-mono font-bold text-emerald-700">
                            ₹{unitRoyalty}
                          </span>
                          <span className="text-[10px] text-[#5C6E6E] block font-mono">
                            ({royaltyPerc}% margin)
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-bold text-[#0F3D3E]">{book.totalSales || 0}</span>
                          <span className="text-[10px] text-[#5C6E6E] block">copies</span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-[#0F3D3E]">{book.rating || 0}</span>
                            <span className="text-[10px] text-[#5C6E6E]">
                              ({book.totalReviews || 0})
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(book)}
                              className="h-8 text-xs font-bold text-[#0F3D3E] border-[#0F3D3E]/30 hover:bg-[#0F3D3E]/5 gap-1.5 cursor-pointer"
                            >
                              <Edit className="h-3.5 w-3.5 text-[#8A6D1E]" />
                              <span>Edit Book & Price</span>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#5C6E6E]">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white border-[#E2E6DF]">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/books/${book.slug || book._id || book.id}`}
                                    target="_blank"
                                    className="text-xs cursor-pointer flex items-center gap-2"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                                    <span>View Store Listing</span>
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openEditModal(book)}
                                  className="text-xs cursor-pointer flex items-center gap-2 font-bold text-[#0F3D3E]"
                                >
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Update Pricing & Details</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link
                                    href="/author/royalties"
                                    className="text-xs cursor-pointer flex items-center gap-2"
                                  >
                                    <TrendingUp className="h-3.5 w-3.5 text-purple-600" />
                                    <span>View Royalty Report</span>
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Author Edit Book & Price Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl bg-white border-[#E2E6DF] rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-[#E2E6DF] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#0F3D3E]/10 flex items-center justify-center">
                <Edit className="h-5 w-5 text-[#0F3D3E]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-serif font-bold text-[#0F3D3E]">
                  Edit Book Details & Pricing
                </DialogTitle>
                <DialogDescription className="text-xs text-[#5C6E6E] mt-0.5">
                  Update your book's retail price (MRP), genre category, synopsis, and publication details.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveBook} className="space-y-5 pt-2 text-xs">
            {/* PRICE & ROYALTY HIGHLIGHT BANNER */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-2xl border border-emerald-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  <span>Retail Pricing & Author Royalty</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  {editForm.royaltyPercentage}% Royalty Tier
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  <Label htmlFor="authorBookPrice" className="text-xs font-bold text-[#0F3D3E]">
                    Retail Price / MRP (₹) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#0F3D3E]">
                      ₹
                    </span>
                    <Input
                      id="authorBookPrice"
                      type="number"
                      min={1}
                      max={99999}
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                          mrp: e.target.value,
                        }))
                      }
                      className="pl-7 font-mono text-base font-bold text-[#0F3D3E] bg-white border-emerald-300 h-11 rounded-xl"
                      placeholder="e.g. 270"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-[#5C6E6E]">
                    This sets the customer purchase price on the Harglim Books store.
                  </p>
                </div>

                <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/80 space-y-1">
                  <span className="text-[11px] text-emerald-800 font-medium block">
                    Your Projected Unit Earnings:
                  </span>
                  <p className="text-2xl font-serif font-bold text-emerald-700">
                    ₹{estimatedRoyaltyPerCopy} <span className="text-xs font-normal text-[#5C6E6E]">/ copy</span>
                  </p>
                  <p className="text-[10px] text-[#5C6E6E]">
                    Calculated automatically from {editForm.royaltyPercentage}% author royalty agreement.
                  </p>
                </div>
              </div>
            </div>

            {/* General Metadata */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="authorBookTitle" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Book Title *
                </Label>
                <Input
                  id="authorBookTitle"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="bg-[#F8F9F7] font-serif font-bold text-sm h-11 border-[#E2E6DF] rounded-xl"
                  placeholder="Enter book title"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="authorBookCategory" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    Genre / Category *
                  </Label>
                  <Select
                    value={editForm.category}
                    onValueChange={(val) => setEditForm({ ...editForm, category: val })}
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
                  <Label htmlFor="authorBookFormat" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    Format *
                  </Label>
                  <Select
                    value={editForm.format}
                    onValueChange={(val) => setEditForm({ ...editForm, format: val })}
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
                <Label htmlFor="authorBookDescription" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Book Synopsis / Description *
                </Label>
                <Textarea
                  id="authorBookDescription"
                  rows={5}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs leading-relaxed"
                  placeholder="Describe your book, themes, plot hooks..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="authorBookPages" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    Page Count
                  </Label>
                  <Input
                    id="authorBookPages"
                    type="number"
                    min={1}
                    value={editForm.pages}
                    onChange={(e) => setEditForm({ ...editForm, pages: e.target.value })}
                    className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="authorBookIsbn" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    ISBN
                  </Label>
                  <Input
                    id="authorBookIsbn"
                    value={editForm.isbn}
                    onChange={(e) => setEditForm({ ...editForm, isbn: e.target.value })}
                    className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                    placeholder="978-93-..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="authorBookStock" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    Available Stock
                  </Label>
                  <Input
                    id="authorBookStock"
                    type="number"
                    min={0}
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="authorBookCover" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Cover Image URL
                </Label>
                <Input
                  id="authorBookCover"
                  value={editForm.coverImage}
                  onChange={(e) => setEditForm({ ...editForm, coverImage: e.target.value })}
                  className="bg-[#F8F9F7] font-mono text-xs h-10 border-[#E2E6DF] rounded-xl"
                  placeholder="https://res.cloudinary.com/..."
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-[#E2E6DF] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
                className="border-[#E2E6DF] rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white rounded-xl text-xs font-bold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Book & Price Changes</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
