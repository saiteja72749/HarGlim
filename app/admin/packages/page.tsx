"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Loader2,
  X,
  Download,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Star,
} from "lucide-react";
import { useSiteContent } from "@/context/site-content-context";
import {
  emptyPackageForm,
  formToCard,
  notifyPackagesChanged,
  packagePayload,
  packagesToImport,
  parsePackagesJson,
  sortPackages,
  type PackageForm,
} from "@/lib/publish-packages";
import { PackageCard } from "@/components/packages/package-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import toast from "react-hot-toast";

// Publishing packages live only in the backend (GET/POST/PATCH/DELETE /admin/publish-packages).
// Active ones are exactly what the Publish page and the author's manuscript form show, in the
// order listed here, and a package's _id is the packageId sent on submission.

type PublishPackage = {
  _id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  isActive: boolean;
  tagline?: string;
  highlighted?: boolean;
  badge?: string;
  sortOrder?: number;
  updatedAt?: string;
};

type StatusFilter = "all" | "active" | "archived";

const formatPrice = (price: number) => `₹${Number(price || 0).toLocaleString("en-IN")}`;
const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;

/** Every package (active and archived); the admin list endpoint is paged, so all pages are read. */
async function fetchAllPackages(): Promise<PublishPackage[]> {
  const all: PublishPackage[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data } = await api.get("/admin/publish-packages", { params: { page, limit: 100 }, cache: "no-store" } as any);
    const items: PublishPackage[] = Array.isArray(data?.data) ? data.data : [];
    all.push(...items);
    if (items.length === 0 || page >= (data?.pagination?.pages ?? 1)) break;
  }
  return all;
}

/** Fields of the saved record that differ from what was sent (the backend dropped or changed them). */
function mismatchedFields(sent: Record<string, unknown>, saved: PublishPackage | undefined): string[] {
  if (!saved) return ["the whole package"];
  return Object.entries(sent).filter(([key, value]) => {
    const stored = (saved as Record<string, unknown>)[key];
    if (Array.isArray(value)) return JSON.stringify(value) !== JSON.stringify(stored ?? []);
    if (value === "" || value === false || value === 0) return Boolean(stored);
    return value !== stored;
  }).map(([key]) => key);
}

export default function AdminPackagesPage() {
  const { content: siteContent } = useSiteContent();
  const [packages, setPackages] = useState<PublishPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<PublishPackage | null>(null);
  const [formData, setFormData] = useState<PackageForm>(emptyPackageForm);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchPackages = useCallback(async () => {
    setError(false);
    try {
      const all = await fetchAllPackages();
      setPackages(all);
      return all;
    } catch (err) {
      console.error("Failed to fetch publish packages:", err);
      setError(true);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Active packages in Publish page order, then archived ones.
  const active = useMemo(() => sortPackages(packages.filter((p) => p.isActive !== false)), [packages]);
  const archived = useMemo(() => sortPackages(packages.filter((p) => p.isActive === false)), [packages]);
  const visible = useMemo(() => {
    const base = statusFilter === "active" ? active : statusFilter === "archived" ? archived : [...active, ...archived];
    const q = search.trim().toLowerCase();
    return q ? base.filter((p) => `${p.name} ${p.description} ${p.tagline || ""}`.toLowerCase().includes(q)) : base;
  }, [active, archived, statusFilter, search]);

  /** Reload, tell open Publish pages to refresh, and return the fresh list. */
  const afterChange = async () => {
    const fresh = await fetchPackages();
    notifyPackagesChanged();
    return fresh;
  };

  const openCreateModal = () => {
    setEditing(null);
    const nextOrder = active.reduce((max, p) => Math.max(max, p.sortOrder || 0), 0) + 1;
    setFormData({ ...emptyPackageForm, sortOrder: String(nextOrder) });
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
      tagline: pkg.tagline || "",
      highlighted: Boolean(pkg.highlighted),
      badge: pkg.badge || "",
      sortOrder: pkg.sortOrder ? String(pkg.sortOrder) : "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = packagePayload(formData, packages.filter((p) => p._id !== editing?._id));
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const { payload } = result;

    setSubmitting(true);
    try {
      let savedId = editing?._id;
      if (editing) {
        await api.patch(`/admin/publish-packages/${editing._id}`, payload);
      } else {
        const { data } = await api.post("/admin/publish-packages", payload);
        savedId = data?.data?._id || data?._id;
      }

      // Only one card is highlighted on the Publish page.
      if (payload.highlighted) {
        const others = packages.filter((p) => p.highlighted && p._id !== savedId);
        await Promise.all(
          others.map((p) => api.patch(`/admin/publish-packages/${p._id}`, { highlighted: false, badge: "" }))
        );
      }

      // Read it back: the list now shows what the backend stored, and anything it did not keep is named.
      const fresh = await afterChange();
      const saved = fresh?.find((p) => p._id === savedId) || fresh?.find((p) => p.name === payload.name);
      const missing = fresh ? mismatchedFields(payload, saved) : [];
      if (missing.length > 0) {
        toast.error(`Saved, but the server did not keep: ${missing.join(", ")}.`, { duration: 10000 });
      } else {
        toast.success(`"${payload.name}" saved. It is live on the Publish page${payload.isActive ? "" : " once activated"}.`);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Failed to save publish package:", err);
      toast.error(errorMessage(err, "Could not save the package."));
    } finally {
      setSubmitting(false);
    }
  };

  /** Moves a package one place up or down: active packages are renumbered 1, 2, 3 … */
  const move = async (pkg: PublishPackage, direction: -1 | 1) => {
    const order = [...active];
    const from = order.findIndex((p) => p._id === pkg._id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];

    setBusyId(pkg._id);
    try {
      await Promise.all(
        order
          .map((p, idx) => ({ p, sortOrder: idx + 1 }))
          .filter(({ p, sortOrder }) => p.sortOrder !== sortOrder)
          .map(({ p, sortOrder }) => api.patch(`/admin/publish-packages/${p._id}`, { sortOrder }))
      );
      await afterChange();
    } catch (err: any) {
      toast.error(errorMessage(err, "Could not change the order."));
      fetchPackages();
    } finally {
      setBusyId(null);
    }
  };

  const handleArchive = async (pkg: PublishPackage) => {
    if (!window.confirm(`Archive "${pkg.name}"? Authors will no longer see it. Manuscripts that already use it keep it, and you can restore it later.`)) {
      return;
    }
    setBusyId(pkg._id);
    try {
      await api.delete(`/admin/publish-packages/${pkg._id}`);
      toast.success(`"${pkg.name}" archived and removed from the Publish page.`);
      await afterChange();
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
      toast.success(`"${pkg.name}" restored to the Publish page.`);
      await afterChange();
    } catch (err: any) {
      console.error("Failed to restore publish package:", err);
      toast.error(errorMessage(err, "Could not restore the package."));
    } finally {
      setBusyId(null);
    }
  };

  // One-time migration: turns the old Site Content package cards into real packages, in order.
  const handleImportFromSiteContent = async () => {
    const cards = parsePackagesJson(siteContent.packagesJson);
    if (cards.length === 0) {
      toast.error("Site Content has no package cards to import.");
      return;
    }

    setImporting(true);
    try {
      const existing = await fetchAllPackages();
      const toCreate = packagesToImport(cards, existing);
      const notOnSite = existing.filter(
        (pkg) => pkg.isActive && !cards.some((card) => card.name.trim().toLowerCase() === pkg.name.trim().toLowerCase())
      );

      if (toCreate.length === 0) {
        toast.success("Every Site Content card already has a package with the same name.");
      } else if (
        window.confirm(
          `Create ${toCreate.length} package(s)?\n\n${toCreate
            .map((p) => `${p.sortOrder}. ${p.name} — ${formatPrice(p.price)}`)
            .join("\n")}\n\nThey appear on the Publish page in this order. You can edit each one afterwards.`
        )
      ) {
        let created = 0;
        for (const payload of toCreate) {
          try {
            await api.post("/admin/publish-packages", payload);
            created++;
          } catch (err: any) {
            toast.error(`${payload.name}: ${errorMessage(err, "could not be created.")}`);
          }
        }
        if (created > 0) toast.success(`${created} package(s) created.`);
      }

      // Packages not in that list (e.g. demo data) would still be offered to authors.
      if (
        notOnSite.length > 0 &&
        window.confirm(
          `These active packages are not in the Site Content list:\n\n${notOnSite
            .map((p) => `• ${p.name} — ${formatPrice(p.price)}`)
            .join("\n")}\n\nArchive them so authors can no longer pick them?`
        )
      ) {
        for (const pkg of notOnSite) {
          await api.delete(`/admin/publish-packages/${pkg._id}`).catch((err) => {
            toast.error(`${pkg.name}: ${errorMessage(err, "could not be archived.")}`);
          });
        }
      }
      await afterChange();
    } catch (err: any) {
      console.error("Failed to import publish packages:", err);
      toast.error(errorMessage(err, "Could not import the packages."));
    } finally {
      setImporting(false);
    }
  };

  if (error && packages.length === 0) {
    return (
      <ErrorState
        title="Could not load publishing packages"
        message="GET /admin/publish-packages failed. Check that the backend is deployed and you are signed in as admin."
        onRetry={fetchPackages}
      />
    );
  }

  const statusButtons: { key: StatusFilter; label: string }[] = [
    { key: "all", label: `All (${packages.length})` },
    { key: "active", label: `Active (${active.length})` },
    { key: "archived", label: `Archived (${archived.length})` },
  ];
  const canReorder = statusFilter !== "archived" && !search.trim();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">Publishing Packages</h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Active packages appear on the Publish page and in the author&apos;s manuscript form, in the order below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/publish#packages" target="_blank">
            <Button variant="outline" className="font-bold gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>View Publish page</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleImportFromSiteContent}
            disabled={importing}
            className="font-bold gap-2"
            title="One-time: create a package for each old Site Content package card"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>Import from Site Content</span>
          </Button>
          <Button onClick={openCreateModal} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Package</span>
          </Button>
        </div>
      </div>

      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              id="packageSearch"
              placeholder="Search name, tagline or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusButtons.map(({ key, label }) => (
              <Button
                key={key}
                variant={statusFilter === key ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(key)}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="w-24 font-bold text-xs uppercase text-[#0F3D3E]">Order</TableHead>
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
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading packages...</p>
                  </TableCell>
                </TableRow>
              ) : visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6E6E]">
                    {search || statusFilter !== "all"
                      ? "No packages match these filters."
                      : "No packages yet. Add one, or import the Site Content cards, so authors can submit manuscripts."}
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((pkg) => {
                  const isActive = pkg.isActive !== false;
                  const position = active.findIndex((p) => p._id === pkg._id);
                  const busy = busyId === pkg._id;
                  return (
                    <TableRow key={pkg._id} className="hover:bg-[#F8F9F7]/60 text-xs align-top">
                      <TableCell>
                        {isActive ? (
                          <div className="flex items-center gap-1">
                            <span className="w-5 font-bold text-sm text-[#0F3D3E] tabular-nums">{position + 1}</span>
                            {canReorder && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={busy || position === 0}
                                  onClick={() => move(pkg, -1)}
                                  title="Move up"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={busy || position === active.length - 1}
                                  onClick={() => move(pkg, 1)}
                                  title="Move down"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#5C6E6E]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-sm text-[#0F3D3E]">{pkg.name}</p>
                          {pkg.highlighted && (
                            <Badge className="bg-[#D4AF37]/20 text-[#8A6D1E] border-[#D4AF37]/40 text-[10px] gap-1">
                              <Star className="h-3 w-3" />
                              {pkg.badge || "Highlighted"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[#5C6E6E] line-clamp-2 mt-0.5">{pkg.tagline || pkg.description}</p>
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
                        {isActive ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">Live</Badge>
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
                          {isActive ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleArchive(pkg)}
                              disabled={busy}
                              className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                              title="Archive package"
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRestore(pkg)}
                              disabled={busy}
                              className="h-8 w-8 text-emerald-700 hover:bg-emerald-50"
                              title="Restore package"
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
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
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#E2E6DF]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E]">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E]">{editing ? "Edit Package" : "New Package"}</h3>
                  <p className="text-xs text-[#5C6E6E]">
                    {editing ? `Updating ${editing.name}` : "Authors can pick it as soon as it is saved as active"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-[#5C6E6E]">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
              <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="pkgName" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                      Name *
                    </label>
                    <Input
                      id="pkgName"
                      placeholder="e.g. Professional"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-[#F8F9F7]"
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
                      placeholder="4999"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="bg-[#F8F9F7]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pkgTagline" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Tagline (under the name on the card)
                  </label>
                  <Input
                    id="pkgTagline"
                    placeholder="Full global distribution with 100% royalty"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="bg-[#F8F9F7]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pkgDescription" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Description * (shown in the author&apos;s package dropdown)
                  </label>
                  <Textarea
                    id="pkgDescription"
                    placeholder="Editing, cover design, ISBN and distribution on Amazon, Kindle and 12+ platforms."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-[#F8F9F7] h-16 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="pkgFeatures" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Features (one per line)
                  </label>
                  <Textarea
                    id="pkgFeatures"
                    placeholder={"ISBN & barcode allocation\nCover design\n2 author copies"}
                    value={formData.features}
                    onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                    className="bg-[#F8F9F7] h-36 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="pkgSortOrder" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                      Display order
                    </label>
                    <Input
                      id="pkgSortOrder"
                      type="number"
                      min={0}
                      step="1"
                      placeholder="1"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                      className="bg-[#F8F9F7]"
                    />
                  </div>
                  {formData.highlighted && (
                    <div className="space-y-1.5">
                      <label htmlFor="pkgBadge" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                        Badge text
                      </label>
                      <Input
                        id="pkgBadge"
                        placeholder="Most Popular Choice"
                        value={formData.badge}
                        onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                        className="bg-[#F8F9F7]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-bold text-[#0F3D3E] block">Highlight on Publish page</span>
                    <span className="text-[11px] text-[#5C6E6E]">Only one package is highlighted; others lose the highlight.</span>
                  </div>
                  <Switch checked={formData.highlighted} onCheckedChange={(val) => setFormData({ ...formData, highlighted: val })} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="font-bold text-[#0F3D3E] block">Active</span>
                    <span className="text-[11px] text-[#5C6E6E]">Shown on the Publish page and to authors.</span>
                  </div>
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

              <div className="border-t lg:border-t-0 lg:border-l border-[#E2E6DF] bg-[#F8F9F7] p-6 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E]">Live preview (Publish page)</p>
                <div className="pt-3">
                  <PackageCard pkg={formToCard(formData)} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
