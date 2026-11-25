"use client";

import { adminRows } from "@/lib/admin-account-api";
import { useBookCategories } from "@/hooks/use-book-categories";
import { resolveCategoryId } from "@/lib/category-data";
import type { AuthorBook } from "@/types/author-api";
import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError } from "@/lib/api-error";

import { useState, useEffect, useCallback } from "react";
import Image from '@/components/ui/backend-image';
import Link from "next/link";
import api from "@/lib/api";
import { getBookAuthorInfo } from "@/lib/utils";
import { ErrorState } from "@/components/ui/error-state";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Star,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";


const getStatusColor = (status: string | undefined, stock?: number) => {
  if (stock !== undefined && Number(stock) === 0) return "bg-red-500/10 text-red-600";
  if (stock !== undefined && Number(stock) > 0 && Number(stock) <= 5) return "bg-amber-500/10 text-amber-600";
  switch (status?.toLowerCase()) {
    case "published":
    case "active":
      return "bg-emerald-500/10 text-emerald-600";
    case "draft":
      return "bg-amber-500/10 text-amber-600";
    case "archived":
    case "out of stock":
      return "bg-red-500/10 text-red-600";
    case "low stock":
      return "bg-amber-500/10 text-amber-600";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusLabel = (status: string | undefined, stock?: number) => {
  if (stock !== undefined && Number(stock) === 0) return "Out of Stock";
  if (stock !== undefined && Number(stock) > 0 && Number(stock) <= 5) return "Low Stock";
  if (!status) return "Active";
  if (status.toLowerCase() === "published") return "Active";
  if (status.toLowerCase() === "draft") return "Draft";
  if (status.toLowerCase() === "archived") return "Archived";
  return status;
};

export default function AdminBooksPage() {
  const [books, setBooks] = useState<(AuthorBook & { cover?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { categories, error: categoryError, reload: reloadCategories } = useBookCategories();
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
        params.q = searchQuery.trim();
      }
      if (statusFilter === "Active") params.status = "published";
      if (categoryFilter !== "all") params.category = categoryFilter;

      const { data } = await api.get("/admin/books", { params, cache: "no-store" });
      setBooks(adminRows<AuthorBook & { cover?: string }>(data, "books"));
    } catch (err) {
      console.error("Failed to fetch books from API:", describeApiError(err));
      setError(true);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, searchQuery, statusFilter]);

  useEffect(() => scheduleRequest(fetchBooks), [fetchBooks]);

  const getCategoryName = (category: AuthorBook["category"]) =>
    typeof category === "object" && category !== null ? category.name : category;

  const getAuthorName = (book: AuthorBook) => {
    return getBookAuthorInfo(book).name;
  };

  const selectedCategory = categories.find(category => category._id === categoryFilter);

  const filteredBooks = books.filter((book: AuthorBook) => {
    const title = book.title || "";
    const author = getAuthorName(book);
    const matchesSearch =
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      author.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || (selectedCategory && resolveCategoryId(
        categories, typeof book.category === "object" && book.category !== null ? book.category._id || book.category.slug : book.category || ""
      ) === selectedCategory._id);
    
    let matchesStatus = true;
    if (statusFilter === "Active") {
      matchesStatus = ((book.status || "").toLowerCase() === "active" || (book.status || "").toLowerCase() === "published") && (book.stock === undefined || Number(book.stock) > 0);
    } else if (statusFilter === "Out of Stock") {
      matchesStatus = (book.stock !== undefined && Number(book.stock) <= 0) || (book.status || "").toLowerCase() === "out of stock";
    } else if (statusFilter === "Low Stock") {
      matchesStatus = (book.stock !== undefined && Number(book.stock) > 0 && Number(book.stock) <= 5) || (book.status || "").toLowerCase() === "low stock";
    } else if (statusFilter !== "all") {
      matchesStatus = (book.status || "").toLowerCase() === statusFilter.toLowerCase();
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/books/${id}`);
      await fetchBooks();
      toast.success("Book deleted successfully! 🗑️");
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      console.error("Failed to delete book:", describeApiError(err));
      toast.error(err.response?.data?.message || "Failed to delete book.");
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Could not load books"
        message="We encountered an issue fetching the books inventory. Please try again."
        onRetry={fetchBooks}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Books</h1>
          <p className="text-muted-foreground mt-1">
            Manage your book inventory
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/admin/books/new" prefetch={false}>
            <Plus className="h-4 w-4" />
            Add New Book
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{books.length}</p>
            <p className="text-sm text-muted-foreground">Total Books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {books.filter((b) => ((b.status || "").toLowerCase() === "active" || (b.status || "").toLowerCase() === "published") && (b.stock === undefined || Number(b.stock) > 0)).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Books</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {books.filter((b) => (b.stock !== undefined && Number(b.stock) <= 0) || (b.status || "").toLowerCase() === "out of stock").length}
            </p>
            <p className="text-sm text-muted-foreground">Out of Stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">
              {books.filter((b) => (b.stock !== undefined && Number(b.stock) > 0 && Number(b.stock) <= 5) || (b.status || "").toLowerCase() === "low stock").length}
            </p>
            <p className="text-sm text-muted-foreground">Low Stock</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}{category.active === false || category.isActive === false ? " (inactive)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                <SelectItem value="Low Stock">Low Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {categoryError && <p className="mt-3 text-sm" role="status">Categories could not load. <Button variant="link" onClick={() => void reloadCategories()}>Retry categories</Button></p>}
        </CardContent>
      </Card>

      {/* Books Table */}
      <Card>
        <CardContent className="p-0">
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBooks.map((book, index) => (
                  <motion.tr
                    key={book.id || book._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Image
                          src={book.coverImage || book.cover || "/placeholder-book.svg"}
                          alt={book.title}
                          width={36}
                          height={48}
                          className="h-12 w-9 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getAuthorName(book)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryName(book.category) || "Uncategorized"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">₹{book.price}</TableCell>
                    <TableCell className="text-right">{book.stock || 0}</TableCell>
                    <TableCell className="text-right">{book.sales || 0}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {book.rating || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className={getStatusColor(book.status, book.stock)}>
                          {getStatusLabel(book.status, book.stock)}
                        </Badge>
                        {book.isFeatured && (
                          <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] gap-1">
                            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                            Featured
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/books/${book.slug || book._id || book.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/books/${book.id || book._id}`} prefetch={false}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              const bId = book.id || book._id;
                              const targetFeatured = !book.isFeatured;
                              try {
                                await api
                                  .put(`/admin/books/${bId}`, { isFeatured: targetFeatured });
                                await fetchBooks();
                                toast.success(
                                  targetFeatured
                                    ? "Book added to Featured Releases! ⭐"
                                    : "Book removed from Featured Releases."
                                );
                              } catch {
                                toast.error("Failed to update featured status.");
                              }
                            }}
                          >
                            <Star className="mr-2 h-4 w-4 text-amber-500" />
                            {book.isFeatured ? "Unfeature from Home" : "Feature on Home"}
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Book?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the book from the catalog.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(book.id || book._id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
