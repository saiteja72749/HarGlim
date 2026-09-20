"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import {
  Tags,
  Search,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    featured: false,
    sortOrder: 1,
    active: true,
  });

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: any = { limit: 100 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter === "active") params.active = true;
      if (statusFilter === "inactive") params.active = false;

      const { data } = await api.get("/admin/categories", { params }).catch(() =>
        api.get("/categories", { params })
      );
      const items =
        data?.data?.categories ||
        (Array.isArray(data?.data) ? data.data : []) ||
        (Array.isArray(data) ? data : []);
      setCategories(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to fetch admin categories:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      featured: false,
      sortOrder: categories.length + 1,
      active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name || "",
      description: cat.description || "",
      featured: Boolean(cat.featured),
      sortOrder: cat.sortOrder ?? 1,
      active: cat.active !== false && cat.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        featured: formData.featured,
        sortOrder: Number(formData.sortOrder) || 1,
        active: formData.active,
      };

      if (editingCategory) {
        const catId = editingCategory._id || editingCategory.id;
        await api.put(`/admin/categories/${catId}`, payload);
        toast.success(`Category "${formData.name}" updated successfully!`);
      } else {
        await api.post("/admin/categories", payload);
        toast.success(`Category "${formData.name}" created successfully! 🎉`);
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      console.error("Failed to save category:", err);
      toast.error(err.response?.data?.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (cat: any) => {
    const catId = cat._id || cat.id;
    const currentActive = cat.active !== false && cat.isActive !== false;
    const newActive = !currentActive;

    try {
      await api.patch(`/admin/categories/${catId}/status`, { active: newActive }).catch(() =>
        api.put(`/admin/categories/${catId}`, { active: newActive })
      );
      setCategories((prev) =>
        prev.map((c) =>
          (c._id || c.id) === catId ? { ...c, active: newActive, isActive: newActive } : c
        )
      );
      toast.success(`Category set to ${newActive ? "Active" : "Inactive"}.`);
    } catch (err: any) {
      console.error("Failed to toggle category status:", err);
      toast.error(err.response?.data?.message || "Failed to update category status.");
    }
  };

  const handleDelete = async (cat: any) => {
    const catId = cat._id || cat.id;
    if (!window.confirm(`Are you sure you want to deactivate/delete "${cat.name}"?`)) {
      return;
    }

    setDeletingId(catId);
    try {
      await api.delete(`/admin/categories/${catId}`);
      toast.success(`Category "${cat.name}" soft deleted successfully.`);
      fetchCategories();
    } catch (err: any) {
      console.error("Failed to delete category:", err);
      if (err.response?.status === 409) {
        toast.error(err.response?.data?.message || "Cannot delete category: active books are still assigned to it.");
      } else {
        toast.error(err.response?.data?.message || "Failed to delete category.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter((c) => {
    const nameMatches = (c.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = c.active !== false && c.isActive !== false;
    if (statusFilter === "active" && !isActive) return false;
    if (statusFilter === "inactive" && isActive) return false;
    return nameMatches;
  });

  if (error) {
    return (
      <ErrorState
        title="Could not load categories"
        message="We encountered an issue fetching categories. Please check backend connectivity."
        onRetry={fetchCategories}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Categories Management
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Create, order, and curate book categories for the storefront and catalog navigation.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Category</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search category by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className="text-xs"
            >
              All ({categories.length})
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className="text-xs"
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("inactive")}
              className="text-xs"
            >
              Inactive
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="w-16 text-center font-bold text-xs uppercase text-[#0F3D3E]">Order</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Category Name</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Slug</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Books</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Featured</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading categories...</p>
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-[#5C6E6E]">
                    No categories found matching your query.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((cat) => {
                  const catId = cat._id || cat.id;
                  const isActive = cat.active !== false && cat.isActive !== false;
                  return (
                    <TableRow key={catId} className="hover:bg-[#F8F9F7]/60 text-xs">
                      <TableCell className="text-center font-mono font-semibold text-[#5C6E6E]">
                        {cat.sortOrder ?? 1}
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-sm text-[#0F3D3E]">{cat.name}</p>
                        {cat.description && (
                          <p className="text-[11px] text-[#5C6E6E] line-clamp-1 max-w-sm font-sans mt-0.5">
                            {cat.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-[#5C6E6E]">
                        {cat.slug}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-[#0F3D3E]/5 text-[#0F3D3E] font-semibold text-xs gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{cat.bookCount ?? cat.booksCount ?? 0}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {cat.featured ? (
                          <Badge className="bg-[#D4AF37]/20 text-[#8A6D1E] border border-[#D4AF37]/40 text-[10px] font-bold">
                            Featured
                          </Badge>
                        ) : (
                          <span className="text-[#5C6E6E] text-[11px]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cat)}
                          className="cursor-pointer"
                          title="Click to toggle status"
                        >
                          {isActive ? (
                            <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/15 text-rose-800 border-rose-300 text-[11px]">
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(cat)}
                            className="h-8 w-8 text-[#0F3D3E] hover:bg-[#0F3D3E]/10"
                            title="Edit Category"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cat)}
                            disabled={deletingId === catId}
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                            title="Soft Delete Category"
                          >
                            {deletingId === catId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E]">
                  <Tags className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                    {editingCategory ? "Edit Category" : "Create New Category"}
                  </h3>
                  <p className="text-xs text-[#5C6E6E]">
                    {editingCategory ? `Updating ${editingCategory.name}` : "Add a category to the catalog"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Category Name *
                </label>
                <Input
                  placeholder="e.g. Science Fiction, Poetry, Self-Help"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#F8F9F7]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Description
                </label>
                <Textarea
                  placeholder="Brief synopsis of this book collection..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#F8F9F7] h-20 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="bg-[#F8F9F7]"
                    min={1}
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F3D3E]">Featured Category</span>
                    <Switch
                      checked={formData.featured}
                      onCheckedChange={(val) => setFormData({ ...formData, featured: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F3D3E]">Active Status</span>
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(val) => setFormData({ ...formData, active: val })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingCategory ? "Save Changes" : "Create Category"}</span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
