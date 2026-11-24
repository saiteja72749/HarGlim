"use client";

import type { AuthorBook } from "@/types/author-api";
import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError, record } from "@/lib/api-error";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { motion } from "framer-motion";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit2,
  Eye,
  Trash2,
  Search,
  Filter,
  Loader2,
  Send,
  Upload,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSafeExternalUrl } from "@/lib/utils";
import toast from "react-hot-toast";
import { ErrorState } from "@/components/ui/error-state";
import { getAuthorBookStage, type AuthorBookStage as Stage } from "@/lib/author-book-status";
import { fetchPublicPackages, type PackageCard } from "@/lib/publish-packages";
import { submitAuthorManuscript, uploadAuthorManuscript } from "@/lib/author-manuscript";
import { fetchAuthorBooks } from "@/lib/author-books";

/**
 * Publishing stages (handover §46): Book.status + PublishRequest.status
 *   draft (no request) -> SUBMITTED (PENDING) -> UNDER_REVIEW -> CHANGES_REQUESTED / REJECTED -> PUBLISHED
 */

const STAGES: Record<Stage, { label: string; tone: string; icon: typeof Clock }> = {
  draft: { label: "Draft", tone: "bg-muted text-muted-foreground", icon: Edit2 },
  submitted: { label: "Submitted", tone: "bg-blue-500/10 text-blue-700", icon: Clock },
  under_review: { label: "Under Review", tone: "bg-amber-500/10 text-amber-700", icon: Clock },
  changes_requested: { label: "Changes Requested", tone: "bg-orange-500/10 text-orange-700", icon: AlertCircle },
  rejected: { label: "Rejected", tone: "bg-red-500/10 text-red-700", icon: AlertCircle },
  published: { label: "Published", tone: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle },
  archived: { label: "Archived", tone: "bg-muted text-muted-foreground", icon: FileText },
};

const getRequest = (m: Record<string, unknown>) => record(m.publishRequest || m.latestPublishRequest || m.submission || m.review);

const text = (value: unknown) => {
  const name = record(value).name;
  return typeof value === "string" ? value : typeof name === "string" ? name : "";
};

const toItem = (book: AuthorBook) => {
  const m = record(book);
  const request = getRequest(m);
  return {
    id: String(m._id || m.id),
    slug: book.slug,
    title: book.title || "Untitled Manuscript",
    // category can be a populated object; never render it directly.
    category: text(request.genre) || text(m.genre) || text(m.category) || "Category unavailable",
    wordCount: Number(request.wordCount || m.wordCount || 0) || 0,
    fileUrl: getSafeExternalUrl(text(request.fileUrl || m.fileUrl || m.manuscriptUrl)),
    packageId: String(record(request.package)._id || request.package || request.packageId || ""),
    submittedAt: book.submittedAt || text(request.createdAt) || null,
    updatedAt: text(request.updatedAt) || book.updatedAt || null,
    stage: getAuthorBookStage(m),
    // Only plain text is rendered; a populated/object field here would crash React (error #31).
    feedback:
      [
        request.reason, request.adminNotes, request.editorialNotes, request.feedback,
        m.feedback, m.editorialNotes, m.rejectionReason,
      ].find((v): v is string => typeof v === "string" && Boolean(v.trim())) || null,
  };
};

type Item = ReturnType<typeof toItem>;

export default function ManuscriptsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Stage>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [listPage, setListPage] = useState(1);
  const [loadError, setLoadError] = useState(false);
  const [submitTarget, setSubmitTarget] = useState<Item | null>(null);

  const fetchManuscripts = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setItems((await fetchAuthorBooks()).map(toItem));
    } catch (err) {
      console.warn("Failed to fetch manuscripts from API:", describeApiError(err));
      setLoadError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => scheduleRequest(fetchManuscripts), [fetchManuscripts]);

  const filteredManuscripts = items.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.stage === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredManuscripts.length / pageSize));
  const visiblePage = Math.min(listPage, totalPages);
  const visibleManuscripts = filteredManuscripts.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const countOf = (...stages: Stage[]) => items.filter((m) => stages.includes(m.stage)).length;

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/authors/me/books/${id}`);
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast.success("Manuscript deleted.");
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      console.error("Failed to delete manuscript:", describeApiError(err));
      toast.error(err.response?.data?.message || "Failed to delete manuscript.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Manuscripts</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your manuscript submissions
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/author/manuscripts/new">
            <Plus className="h-4 w-4" />
            Submit New Manuscript
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <StatTile value={items.length} label="Total" icon={<FileText className="h-8 w-8 text-muted-foreground" />} />
        <StatTile value={countOf("submitted", "under_review")} label="In Review" icon={<Clock className="h-8 w-8 text-amber-500" />} />
        <StatTile value={countOf("published")} label="Published" icon={<CheckCircle className="h-8 w-8 text-emerald-500" />} />
        <StatTile value={countOf("changes_requested", "draft")} label="Needs Your Action" icon={<AlertCircle className="h-8 w-8 text-red-500" />} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search manuscripts..."
                value={searchQuery}
                onChange={(e) => { setListPage(1); setSearchQuery(e.target.value); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setListPage(1); setStatusFilter(v as "all" | Stage); }}>
              <SelectTrigger className="w-full sm:w-52">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {(Object.keys(STAGES) as Stage[]).map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {STAGES[stage].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Manuscripts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          visibleManuscripts.map((manuscript, index) => {
            const stage = STAGES[manuscript.stage];
            const StatusIcon = stage.icon;
            const canSubmit = manuscript.stage === "draft" || manuscript.stage === "changes_requested";
            const canDelete = manuscript.stage === "draft" || manuscript.stage === "changes_requested" || manuscript.stage === "rejected";
            return (
              <motion.div
                key={manuscript.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.05 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg [overflow-wrap:anywhere]">{manuscript.title}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline">{manuscript.category}</Badge>
                              {manuscript.wordCount > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  {manuscript.wordCount.toLocaleString()} words
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge className={stage.tone}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {stage.label}
                          </Badge>
                        </div>

                        {["changes_requested", "rejected"].includes(manuscript.stage) && (
                          <p className="text-sm font-medium text-amber-800">Action required</p>
                        )}

                        {manuscript.feedback && (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-sm font-medium mb-1">Editor Feedback</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{manuscript.feedback}</p>
                          </div>
                        )}

                        {manuscript.stage === "draft" && (
                          <p className="text-sm text-amber-700">
                            This draft has not been sent for review yet. Use “Submit for Review”.
                          </p>
                        )}

                        <dl className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          {manuscript.submittedAt && <div><dt className="inline font-medium">Submitted </dt><dd className="inline">{new Date(manuscript.submittedAt).toLocaleDateString("en-IN")}</dd></div>}
                          {manuscript.updatedAt && <div><dt className="inline font-medium">Last updated </dt><dd className="inline">{new Date(manuscript.updatedAt).toLocaleDateString("en-IN")}</dd></div>}
                        </dl>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 lg:flex-col flex-wrap">
                        {manuscript.stage === "published" && manuscript.slug ? (
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <Link href={`/books/${manuscript.slug}`} target="_blank">
                              <Eye className="h-4 w-4" />
                              View Listing
                            </Link>
                          </Button>
                        ) : manuscript.fileUrl ? (
                          <Button variant="outline" size="sm" className="gap-2" asChild>
                            <a href={manuscript.fileUrl} target="_blank" rel="noopener noreferrer">
                              <Eye className="h-4 w-4" />
                              View File
                            </a>
                          </Button>
                        ) : null}

                        {canSubmit && (
                          <Button size="sm" className="gap-2" onClick={() => setSubmitTarget(manuscript)}>
                            {manuscript.stage === "draft" ? <Send className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                            {manuscript.stage === "draft" ? "Submit for Review" : "Revise & Resubmit"}
                          </Button>
                        )}

                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Manuscript?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete your manuscript submission.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDelete(manuscript.id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}

        {!loading && loadError && <ErrorState title="Manuscripts could not load" onRetry={fetchManuscripts} />}
        {!loading && !loadError && filteredManuscripts.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No manuscripts found</h3>
              <p className="text-muted-foreground text-center">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Start by submitting your first manuscript"}
              </p>
              <Button asChild className="mt-4">
                <Link href="/author/manuscripts/new">Submit Manuscript</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 && <nav aria-label="Manuscript pages" className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" disabled={visiblePage <= 1} onClick={() => setListPage(visiblePage - 1)}>Previous</Button>
        <span className="text-sm">Page {visiblePage} of {totalPages}</span>
        <Button variant="outline" disabled={visiblePage >= totalPages} onClick={() => setListPage(visiblePage + 1)}>Next</Button>
      </nav>}

      {submitTarget && <SubmitForReviewDialog
        key={submitTarget.id}
        item={submitTarget}
        onClose={() => setSubmitTarget(null)}
        onSubmitted={() => {
          setSubmitTarget(null);
          fetchManuscripts();
        }}
      />}
    </div>
  );
}

function StatTile({ value, label, icon }: { value: number; label: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

/** POST /authors/me/books/{id}/submit — used for first submission of a draft and for resubmission after changes. */
function SubmitForReviewDialog({
  item,
  onClose,
  onSubmitted,
}: {
  item: Item;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [packages, setPackages] = useState<PackageCard[]>([]);
  const [packageId, setPackageId] = useState("");
  const [wordCount, setWordCount] = useState(() => item.wordCount ? String(item.wordCount) : "");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchPublicPackages()
      .then((list) => {
        if (!active) return;
        setPackages(list);
        setPackageId(list.some((p) => p._id === item.packageId) ? item.packageId : "");
      })
      .catch(() => { if (active) setPackages([]); });
    return () => { active = false; };
  }, [item]);

  const handleSubmit = async () => {
    if (!item) return;
    if (pending.current) return;
    const words = wordCount.trim() ? Number(wordCount) : undefined;
    if (words !== undefined && (!Number.isSafeInteger(words) || words < 1)) {
      toast.error("Please enter the word count.");
      return;
    }
    if (!packages.some((entry) => entry._id === packageId)) {
      toast.error("Please choose a publishing package.");
      return;
    }
    if (!file && !item.fileUrl) {
      toast.error("Please upload your manuscript file.");
      return;
    }

    pending.current = true;
    setSubmitting(true);
    setUploadPercent(null);
    try {
      const fileUrl = file ? await uploadAuthorManuscript(file, setUploadPercent) : item.fileUrl;
      await submitAuthorManuscript(item.id, {
        fileUrl,
        genre: item.category,
        wordCount: words,
        packageId,
      });
      toast.success("Sent for editorial review.");
      onSubmitted();
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(err?.response?.data?.message || err?.message || "Could not submit for review.");
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" aria-busy={submitting}>
        <DialogHeader>
          <DialogTitle>{item?.stage === "changes_requested" ? "Revise & Resubmit" : "Submit for Review"}</DialogTitle>
          <DialogDescription>
            {item?.title}
            {item?.stage === "changes_requested" ? " — upload the revised manuscript that addresses the editor feedback." : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resubmit-file">
              Manuscript file {item?.fileUrl ? "(optional, keeps current file if empty)" : ""}
            </Label>
            <label
              htmlFor="resubmit-file"
              className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm cursor-pointer hover:bg-muted/50"
            >
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{file ? file.name : "Choose PDF or Word document (max 25MB)"}</span>
            </label>
            <input
              id="resubmit-file"
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.size > 25 * 1024 * 1024) {
                  toast.error("File size must be less than 25MB");
                  return;
                }
                setFile(f || null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resubmit-words">Word count</Label>
            <Input
              id="resubmit-words"
              type="number"
              min={1}
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="resubmit-package">Publishing package</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger id="resubmit-package">
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => p._id && (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} — ₹{Number(p.price || 0).toLocaleString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {submitting && uploadPercent !== null && <p role="status" className="text-sm">File upload {uploadPercent}%</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
