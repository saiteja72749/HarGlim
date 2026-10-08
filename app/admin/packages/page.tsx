"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import { Package, Search, Plus, Edit2, Archive, ArchiveRestore, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import toast from "react-hot-toast";

// Real publishing package records (GET/POST/PATCH/DELETE /admin/publish-packages).
// These are what authors pick on manuscript submission (sent as packageId); the CMS
// packagesJson under Site Content is display copy only and is not managed here.

type PublishPackage = {
  _id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  isActive: boolean;
  updatedAt?: string;
};

type StatusFilter = "all" | "active" | "archived";
type SortOrder = "price_asc" | "price_desc";

const PAGE_SIZE = 20;
const emptyForm = { name: "", description: "", price: "", features: "", isActive: true };

const formatPrice = (price: number) => `₹${Number(price || 0).toLocaleString("en-IN")}`;
const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<PublishPackage[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortOrder>("price_asc");
  const [page, setPage] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PublishPackage | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string | number | boolean> = { page, limit: PAGE_SIZE, sort };
      if (search) params.search = search;
      if (statusFilter !== "all") params.isActive = statusFilter === "active";

      const { data } = await api.get("/admin/publish-packages", { params, cache: "no-store" } as any);
      const items = Array.isArray(data?.data) ? data.data : [];
      setPackages(items);
      setPagination({
        total: data?.pagination?.total ?? items.length,
        page: data?.pagination?.page ?? page,
        pages: Math.max(1, data?.pagination?.pages ?? 1),
      });
    } catch (err) {
      console.error("Failed to fetch publish packages:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sort]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const openCreateModal = () => {
    setEditing(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: PublishPackage) => {
    setEditing(pkg);
    setFormData({
      name: pkg.name || "",
      description: pkg.description || "",
      price: String(pkg.price ?? ""),
      features: (pkg.features || []).join("\n"),
      isActive: pkg.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const description = formData.description.trim();
    const price = Number(formData.price);

    if (!name || !description || formData.price.trim() === "") {
      toast.error("Name, description and price are required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Price must be a number of 0 or more.");
      return;
    }

    const payload = {
      name,
      description,
      price,
      features: formData.features
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      isActive: formData.isActive,
    };

    setSubmitting(true);
    try {
      if (editing) {
        await api.patch(`/admin/publish-packages/${editing._id}`, payload);
        toast.success(`Package "${name}" updated.`);
      } else {
        await api.post("/admin/publish-packages", payload);
        toast.success(`Package "${name}" created.`);
      }
      setIsModalOpen(false);
      fetchPackages();
    } catch (err: any) {
      console.error("Failed to save publish package:", err);
      toast.error(errorMessage(err, "Could not save the package."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (pkg: PublishPackage) => {
    if (!window.confirm(`Archive "${pkg.name}"? Authors will no longer see it. Manuscripts that already use it keep it, and you can restore it later.`)) {
      return;
    }
    setBusyId(pkg._id);
    try {
      await api.delete(`/admin/publish-packages/${pkg._id}`);
      toast.success(`Package "${pkg.name}" archived.`);
      fetchPackages();
    } catch (err: any) {
      console.error("Failed to archive publish package:", err);
      toast.error(errorMessage(err, "Could not archive the package."));
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (pkg: PublishPackage) => {
    setBusyId(pkg._id);
    try {
      await api.patch(`/admin/publish-packages/${pkg._id}`, { isActive: true });
      toast.success(`Package "${pkg.name}" restored.`);
      fetchPackages();
    } catch (err: any) {
      console.error("Failed to restore publish package:", err);
      toast.error(errorMessage(err, "Could not restore the package."));
    } finally {
      setBusyId(null);
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Could not load publishing packages"
        message="GET /admin/publish-packages failed. Check that the backend is deployed and you are signed in as admin."
        onRetry={fetchPackages}
      />
    );
  }

  const statusButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">Publishing Packages</h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            The packages authors choose when they submit a manuscript. Active packages also appear on the Publish page.
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2 shadow-xs">
          <Plus className="h-4 w-4" />
          <span>Add Package</span>
        </Button>
      </div>

      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              id="packageSearch"
              placeholder="Search name or description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusButtons.map(({ key, label }) => (
              <Button
                key={key}
                variant={statusFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setStatusFilter(key);
                  setPage(1);
                }}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
            <select
              id="packageSort"
              aria-label="Sort by price"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortOrder);
                setPage(1);
              }}
              className="h-8 rounded-md border border-[#E2E6DF] bg-white px-2 text-xs text-[#0F3D3E]"
            >
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Package</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Price</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Features</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading packages...</p>
                  </TableCell>
                </TableRow>
              ) : packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-xs text-[#5C6E6E]">
                    {search || statusFilter !== "all"
                      ? "No packages match these filters."
                      : "No packages yet. Add one so authors can submit manuscripts."}
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((pkg) => {
                  const active = pkg.isActive !== false;
                  return (
                    <TableRow key={pkg._id} className="hover:bg-[#F8F9F7]/60 text-xs align-top">
                      <TableCell className="max-w-xs">
                        <p className="font-bold text-sm text-[#0F3D3E]">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-[11px] text-[#5C6E6E] line-clamp-2 mt-0.5">{pkg.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-serif font-bold text-sm text-[#0F3D3E] tabular-nums whitespace-nowrap">
                        {formatPrice(pkg.price)}
                      </TableCell>
                      <TableCell className="max-w-sm">
                        {pkg.features?.length ? (
                          <p className="text-[11px] text-[#5C6E6E] line-clamp-2">
                            {pkg.features.length} features: {pkg.features.join(", ")}
                          </p>
                        ) : (
                          <span className="text-[11px] text-[#5C6E6E]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {active ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">Active</Badge>
                        ) : (
                          <Badge className="bg-slate-500/15 text-slate-700 border-slate-300 text-[11px]">Archived</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(pkg)}
                            className="h-8 w-8 text-[#0F3D3E] hover:bg-[#0F3D3E]/10"
                            title="Edit package"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(pkg)}
                              disabled={busyId === pkg._id}
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                              title="Archive package"
                            >
                              {busyId === pkg._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(pkg)}
                              disabled={busyId === pkg._id}
                              className="h-8 w-8 text-emerald-700 hover:bg-emerald-50"
                              title="Restore package"
                            >
                              {busyId === pkg._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ArchiveRestore className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-[#E2E6DF] px-4 py-3 text-xs text-[#5C6E6E]">
            <span>
              Page {pagination.page} of {pagination.pages} · {pagination.total} packages
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.pages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#E2E6DF]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E]">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                    {editing ? "Edit Package" : "New Package"}
                  </h3>
                  <p className="text-xs text-[#5C6E6E]">
                    {editing ? `Updating ${editing.name}` : "Authors can pick it once it is active"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-[#5C6E6E]">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="pkgName" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Name *
                </label>
                <Input
                  id="pkgName"
                  placeholder="e.g. Professional Publishing"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#F8F9F7]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pkgDescription" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Description *
                </label>
                <Textarea
                  id="pkgDescription"
                  placeholder="Editing, cover design and publishing support."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-[#F8F9F7] h-20 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pkgPrice" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Price (₹) *
                </label>
                <Input
                  id="pkgPrice"
                  type="number"
                  min={0}
                  step="1"
                  placeholder="15000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-[#F8F9F7]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="pkgFeatures" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Features (one per line)
                </label>
                <Textarea
                  id="pkgFeatures"
                  placeholder={"Editorial review\nCover design\nISBN support"}
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  className="bg-[#F8F9F7] h-32 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-[#0F3D3E]">Active (visible to authors)</span>
                <Switch checked={formData.isActive} onCheckedChange={(val) => setFormData({ ...formData, isActive: val })} />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editing ? "Save Changes" : "Create Package"}</span>
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
