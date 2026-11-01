"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Camera, Edit2, ExternalLink, Loader2, Plus, Search, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { spotlightFormData, spotlightFormError, SPOTLIGHT_IMAGE_TYPES, type SpotlightForm } from "@/lib/spotlights";
import { ErrorState } from "@/components/ui/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Author Spotlight photos: GET/POST /admin/spotlights, PATCH/DELETE /admin/spotlights/{id}.
// Active ones show on the Publish page (first 6) and on /spotlight.

type AdminSpotlight = {
  _id: string;
  image: string;
  thumbnail?: string;
  author_name: string;
  caption?: string;
  sortOrder?: number;
  isActive: boolean;
};

type StatusFilter = "all" | "active" | "archived";

const emptyForm: SpotlightForm = { authorName: "", caption: "", sortOrder: "", isActive: true };
const errorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

async function fetchAllSpotlights(): Promise<AdminSpotlight[]> {
  const all: AdminSpotlight[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await api.get("/admin/spotlights", { params: { page, limit: 60 }, cache: "no-store" } as any);
    const items: AdminSpotlight[] = Array.isArray(data?.data) ? data.data : [];
    all.push(...items);
    if (items.length === 0 || page >= (data?.pagination?.pages ?? 1)) break;
  }
  return all;
}

export default function AdminSpotlightsPage() {
  const [items, setItems] = useState<AdminSpotlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSpotlight | null>(null);
  const [form, setForm] = useState<SpotlightForm>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setItems(await fetchAllSpotlights());
    } catch (err) {
      console.error("Failed to load spotlights:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Preview of the chosen file, released when it changes.
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const counts = useMemo(() => ({ active: items.filter((s) => s.isActive !== false).length, all: items.length }), [items]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (s) =>
        (statusFilter === "all" || (statusFilter === "active") === (s.isActive !== false)) &&
        (!q || `${s.author_name} ${s.caption || ""}`.toLowerCase().includes(q))
    );
  }, [items, search, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: AdminSpotlight) => {
    setEditing(item);
    setForm({
      authorName: item.author_name || "",
      caption: item.caption || "",
      sortOrder: item.sortOrder != null ? String(item.sortOrder) : "",
      isActive: item.isActive !== false,
    });
    setFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = spotlightFormError(form, file, !editing);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const body = spotlightFormData(form, file);
      if (editing) await api.patch(`/admin/spotlights/${editing._id}`, body, multipart);
      else await api.post("/admin/spotlights", body, multipart);
      toast.success(editing ? "Spotlight updated." : "Spotlight added.");
      setIsModalOpen(false);
      await load();
    } catch (err: any) {
      console.error("Failed to save spotlight:", err);
      toast.error(errorMessage(err, "Could not save the spotlight."));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (item: AdminSpotlight) => {
    if (!window.confirm(`Archive the photo of ${item.author_name}? It leaves the website; you can restore it later.`)) return;
    setBusyId(item._id);
    try {
      await api.delete(`/admin/spotlights/${item._id}`);
      toast.success("Spotlight archived.");
      await load();
    } catch (err: any) {
      toast.error(errorMessage(err, "Could not archive the spotlight."));
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (item: AdminSpotlight) => {
    setBusyId(item._id);
    try {
      const body = new FormData();
      body.append("isActive", "true");
      await api.patch(`/admin/spotlights/${item._id}`, body, multipart);
      toast.success("Spotlight restored to the website.");
      await load();
    } catch (err: any) {
      toast.error(errorMessage(err, "Could not restore the spotlight."));
    } finally {
      setBusyId(null);
    }
  };

  if (error && items.length === 0) {
    return (
      <ErrorState
        title="Could not load spotlights"
        message="GET /admin/spotlights failed. Check that you are signed in as admin."
        onRetry={load}
      />
    );
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "active", label: `Live (${counts.active})` },
    { key: "archived", label: `Archived (${counts.all - counts.active})` },
    { key: "all", label: `All (${counts.all})` },
  ];
  const shownImage = preview || editing?.image || "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">Author Spotlight</h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Author photos and messages. Live photos appear on the Publish page (first 6) and on the Spotlight page.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/spotlight" target="_blank">
            <Button variant="outline" className="font-bold gap-2">
              <ExternalLink className="h-4 w-4" />
              <span>View Spotlight page</span>
            </Button>
          </Link>
          <Button onClick={openCreate} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2 shadow-xs">
            <Plus className="h-4 w-4" />
            <span>Add Photo</span>
          </Button>
        </div>
      </div>

      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              id="spotlightSearch"
              placeholder="Search author or caption..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(({ key, label }) => (
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

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
          <p className="text-xs text-[#5C6E6E] mt-2">Loading spotlights...</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E6DF] bg-white py-14 text-center space-y-2">
          <Camera className="h-8 w-8 mx-auto text-[#8A6D1E]" />
          <p className="text-sm text-[#5C6E6E]">
            {search || statusFilter !== "active" ? "No photos match these filters." : "No photos yet. Add the first one."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map((item) => {
            const live = item.isActive !== false;
            const busy = busyId === item._id;
            return (
              <li key={item._id} className="rounded-2xl border border-[#E2E6DF] bg-white overflow-hidden shadow-2xs flex flex-col">
                <div className="relative aspect-square bg-[#E2E6DF]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnail || item.image}
                    alt={item.caption || `Spotlight: ${item.author_name}`}
                    loading="lazy"
                    className={`h-full w-full object-cover ${live ? "" : "opacity-50"}`}
                  />
                  <Badge
                    className={`absolute left-2 top-2 text-[10px] ${
                      live ? "bg-emerald-500/90 text-white border-emerald-600" : "bg-slate-600/90 text-white border-slate-700"
                    }`}
                  >
                    {live ? "Live" : "Archived"}
                  </Badge>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#0F3D3E] truncate">{item.author_name}</p>
                    {item.caption && <p className="text-[11px] text-[#5C6E6E] line-clamp-2 mt-0.5">{item.caption}</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#5C6E6E]">Order {item.sortOrder ?? 0}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                        className="h-8 w-8 text-[#0F3D3E] hover:bg-[#0F3D3E]/10"
                        title="Edit photo"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => (live ? handleArchive(item) : handleRestore(item))}
                        disabled={busy}
                        className={`h-8 w-8 ${live ? "text-rose-600 hover:bg-rose-50" : "text-emerald-700 hover:bg-emerald-50"}`}
                        title={live ? "Archive photo" : "Restore photo"}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : live ? (
                          <Archive className="h-3.5 w-3.5" />
                        ) : (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-[#E2E6DF]">
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <h3 className="font-serif font-bold text-base text-[#0F3D3E]">{editing ? "Edit Photo" : "Add Photo"}</h3>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8 text-[#5C6E6E]" aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label htmlFor="spotlightImage" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Photo {editing ? "(leave empty to keep the current one)" : "*"}
                </label>
                {shownImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownImage} alt="Selected photo" className="h-40 w-40 rounded-xl object-cover border border-[#E2E6DF]" />
                )}
                <label
                  htmlFor="spotlightImage"
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#E2E6DF] bg-[#F8F9F7] px-3 py-3 text-[#5C6E6E] hover:border-[#0F3D3E]"
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{file ? file.name : "Choose a JPG, PNG or WebP (max 10 MB)"}</span>
                </label>
                <input
                  id="spotlightImage"
                  type="file"
                  accept={SPOTLIGHT_IMAGE_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="spotlightAuthor" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Author name *
                </label>
                <Input
                  id="spotlightAuthor"
                  maxLength={120}
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                  className="bg-[#F8F9F7]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="spotlightCaption" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                  Caption
                </label>
                <Textarea
                  id="spotlightCaption"
                  maxLength={500}
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  className="bg-[#F8F9F7] h-20 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <label htmlFor="spotlightOrder" className="font-bold uppercase tracking-wider text-[#5C6E6E] block">
                    Display order
                  </label>
                  <Input
                    id="spotlightOrder"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={form.sortOrder}
                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                    className="bg-[#F8F9F7]"
                  />
                </div>
                <div className="flex items-center justify-between h-9">
                  <span className="font-bold text-[#0F3D3E]">Live on website</span>
                  <Switch checked={form.isActive} onCheckedChange={(val) => setForm({ ...form, isActive: val })} />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E2E6DF]">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add Photo"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
