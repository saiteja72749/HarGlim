"use client";

import { adminResponse, adminRows } from "@/lib/admin-account-api";
import { invalidateApiCache } from "@/lib/api";
import { notifyLiveChange } from "@/lib/live-sync";
import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError, record } from "@/lib/api-error";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && !describeApiError(err).response ? err.message : describeApiError(err).response?.data.message) || fallback;
const multipart = { headers: { "Content-Type": "multipart/form-data" } };

async function fetchAllSpotlights(): Promise<AdminSpotlight[]> {
  const all: AdminSpotlight[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data } = await api.get("/admin/spotlights", { params: { page, limit: 60 }, cache: "no-store" });
    const items = adminRows<AdminSpotlight>(data, "spotlights");
    all.push(...items);
    if (items.length === 0 || page >= (data?.pagination?.pages ?? data?.data?.pagination?.pages ?? 1)) break;
  }
  return all;
}

function checkImage(source: string) {
  return new Promise<void>((resolve, reject) => {
    if (!/^https:\/\//i.test(source)) {
      reject(new Error("The service did not return a public HTTPS image URL."));
      return;
    }
    const image = new window.Image();
    const timeout = window.setTimeout(() => finish(false), 12_000);
    const finish = (loaded: boolean) => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (loaded) resolve();
      else reject(new Error("The image was saved but could not be loaded. Refresh Spotlight before uploading it again."));
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = source;
  });
}

function SpotlightPreview({ item }: { item: AdminSpotlight }) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = [item.thumbnail, item.image].find(url => url && !failed.includes(url));
  return source ? (
    // eslint-disable-next-line @next/next/no-img-element -- the upload's real URL can use arbitrary CDN hosts
    <img src={source} alt={item.caption || `Spotlight: ${item.author_name}`} loading="lazy"
      onError={() => setFailed(values => [...values, source])}
      className={`h-full w-full object-cover ${item.isActive === false ? "opacity-50" : ""}`} />
  ) : <div className="grid h-full place-content-center gap-2 text-center text-sm text-muted-foreground"><Camera className="mx-auto size-6" />Image unavailable</div>;
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
  const [preview, setPreview] = useState<{ file: File; url: string }>();
  const [saving, setSaving] = useState(false);
  const pendingWrite = useRef(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      setItems(await fetchAllSpotlights());
    } catch (err) {
      console.error("Failed to load spotlights:", describeApiError(err));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => scheduleRequest(load), [load]);

  // Preview of the chosen file, released when it changes.
  useEffect(() => {
    if (!file) return;
    let url: string | undefined;
    const cancel = scheduleRequest(() => {
      url = URL.createObjectURL(file);
      setPreview({ file, url });
    });
    return () => {
      cancel();
      if (url) URL.revokeObjectURL(url);
    };
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

  const refreshSaved = async (id: string, active: boolean) => {
    const rows = await fetchAllSpotlights();
    setItems(rows);
    const saved = rows.find(row => row._id === id);
    if (!saved || saved.isActive !== active) {
      throw new Error("The saved spotlight status could not be confirmed. Refresh Spotlight before retrying.");
    }
    if (active) await checkImage(saved.image);
    invalidateApiCache("/spotlights");
    notifyLiveChange("spotlights");
    return saved;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingWrite.current) return;
    const problem = spotlightFormError(form, file, !editing);
    if (problem) { toast.error(problem); return; }

    pendingWrite.current = true;
    setSaving(true);
    try {
      const body = spotlightFormData(form, file);
      const { data } = editing
        ? await api.patch(`/admin/spotlights/${encodeURIComponent(editing._id)}`, body, multipart)
        : await api.post("/admin/spotlights", body, multipart);
      const result = record(adminResponse(data));
      const item = record(result.spotlight ?? result);
      const id = editing?._id ?? item._id ?? item.id;
      if (typeof id !== "string" || !id) throw new Error("The backend did not return a spotlight ID. Refresh Spotlight before retrying.");
      const saved = await refreshSaved(id, form.isActive);
      if (!form.isActive && file) await checkImage(saved.image);
      if (saved.author_name !== form.authorName.trim() || (saved.caption ?? "") !== form.caption.trim()
        || (form.sortOrder.trim() !== "" && saved.sortOrder !== Number(form.sortOrder))) {
        throw new Error("The saved spotlight details did not match the form. Refresh Spotlight before retrying.");
      }
      toast.success(editing ? "Spotlight updated." : "Spotlight added.");
      setIsModalOpen(false);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save the spotlight."));
    } finally {
      pendingWrite.current = false;
      setSaving(false);
    }
  };

  const setSpotlightActive = async (item: AdminSpotlight, active: boolean) => {
    if (pendingWrite.current || (!active && !window.confirm(`Archive the photo of ${item.author_name}?`))) return;
    pendingWrite.current = true;
    setBusyId(item._id);
    try {
      const path = `/admin/spotlights/${encodeURIComponent(item._id)}`;
      const body = new FormData();
      body.append("isActive", "true");
      const { data } = active ? await api.patch(path, body, multipart) : await api.delete(path);
      adminResponse(data);
      await refreshSaved(item._id, active);
      toast.success(active ? "Spotlight restored to the website." : "Spotlight archived.");
    } catch (err) {
      toast.error(errorMessage(err, "Could not update the spotlight."));
    } finally {
      pendingWrite.current = false;
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
  const shownImage = preview?.file === file ? preview.url : editing?.image || "";

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
          <Button variant="outline" className="font-bold gap-2" asChild><Link href="/spotlight" target="_blank">
              <ExternalLink className="h-4 w-4" />
              <span>View Spotlight page</span>
            </Link></Button>
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
                  <SpotlightPreview key={item.thumbnail || item.image} item={item} />
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
                        onClick={() => (live ? setSpotlightActive(item, false) : setSpotlightActive(item, true))}
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
