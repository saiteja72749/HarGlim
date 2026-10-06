"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { extractList } from "@/lib/tracking";
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
import { Progress } from "@/components/ui/progress";
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

/**
 * Publishing stages (handover §46): Book.status + PublishRequest.status
 *   draft (no request) -> SUBMITTED (PENDING) -> UNDER_REVIEW -> CHANGES_REQUESTED / REJECTED -> PUBLISHED
 */
type Stage = "draft" | "submitted" | "under_review" | "changes_requested" | "rejected" | "published" | "archived";

const STAGES: Record<Stage, { label: string; progress: number; tone: string; icon: typeof Clock }> = {
  draft: { label: "Draft", progress: 10, tone: "bg-muted text-muted-foreground", icon: Edit2 },
  submitted: { label: "Submitted", progress: 35, tone: "bg-blue-500/10 text-blue-700", icon: Clock },
  under_review: { label: "Under Review", progress: 65, tone: "bg-amber-500/10 text-amber-700", icon: Clock },
  changes_requested: { label: "Changes Requested", progress: 50, tone: "bg-orange-500/10 text-orange-700", icon: AlertCircle },
  rejected: { label: "Rejected", progress: 100, tone: "bg-red-500/10 text-red-700", icon: AlertCircle },
  published: { label: "Published", progress: 100, tone: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle },
  archived: { label: "Archived", progress: 100, tone: "bg-muted text-muted-foreground", icon: FileText },
};

const getRequest = (m: any) => m.publishRequest || m.latestPublishRequest || m.submission || m.review || {};

const getStage = (m: any): Stage => {
  const bookStatus = String(m.status || "").toLowerCase();
  if (bookStatus === "published") return "published";
  if (bookStatus === "archived") return "archived";
  const raw = String(
    getRequest(m).status || m.publishingStatus || m.publishRequestStatus || m.reviewStatus || m.submissionStatus || ""
  )
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (raw === "approved" || raw === "published") return "published";
  if (raw === "under_review" || raw === "in_review" || raw === "in_editing") return "under_review";
  if (raw === "changes_requested" || raw === "revision_required") return "changes_requested";
  if (raw === "rejected") return "rejected";
  if (raw === "pending" || raw === "submitted") return "submitted";
  return "draft";
};

const text = (value: any) => (typeof value === "string" ? value : value?.name || "");

const toItem = (m: any) => {
  const request = getRequest(m);
  return {
    id: String(m._id || m.id),
    slug: m.slug,
    title: m.title || "Untitled Manuscript",
    // category can be a populated object; never render it directly.
    category: text(request.genre) || text(m.genre) || text(m.category) || "General",
    wordCount: Number(request.wordCount || m.wordCount || 0) || 0,
    fileUrl: getSafeExternalUrl(request.fileUrl || m.fileUrl || m.manuscriptUrl || ""),
    packageId: String(request.package?._id || request.package || request.packageId || ""),
    date: m.submittedAt || request.createdAt || m.updatedAt || m.createdAt || null,
    stage: getStage(m),
    feedback:
      request.reason || request.adminNotes || request.editorialNotes || request.feedback ||
      m.feedback || m.editorialNotes || m.rejectionReason || null,
  };
};

type Item = ReturnType<typeof toItem>;

export default function ManuscriptsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Stage>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitTarget, setSubmitTarget] = useState<Item | null>(null);

  const fetchManuscripts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/authors/me/books", { params: { limit: 100 }, cache: "no-store" } as any);
      setItems(extractList(data, "books").map(toItem));
    } catch (err) {
      console.warn("Failed to fetch manuscripts from API:", err);
      toast.error("Could not load your manuscripts. Please refresh.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManuscripts();
  }, [fetchManuscripts]);

  const filteredManuscripts = items.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || m.stage === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countOf = (...stages: Stage[]) => items.filter((m) => stages.includes(m.stage)).length;

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/authors/me/books/${id}`);
      setItems((prev) => prev.filter((m) => m.id !== id));
      toast.success("Manuscript deleted.");
    } catch (err: any) {
      console.error("Failed to delete manuscript:", err);
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | Stage)}>
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
          filteredManuscripts.map((manuscript, index) => {
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
                            <h3 className="font-semibold text-lg truncate">{manuscript.title}</h3>
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

                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Review Progress</span>
                            <span className="font-medium">{stage.progress}%</span>
                          </div>
                          <Progress value={stage.progress} className="h-2" />
                        </div>

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

                        {manuscript.date && (
                          <p className="text-sm text-muted-foreground">
                            Last updated {new Date(manuscript.date).toLocaleDateString("en-IN")}
                          </p>
                        )}
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

        {!loading && filteredManuscripts.length === 0 && (
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

      <SubmitForReviewDialog
        item={submitTarget}
        onClose={() => setSubmitTarget(null)}
        onSubmitted={() => {
          setSubmitTarget(null);
          fetchManuscripts();
        }}
      />
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
  item: Item | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [packages, setPackages] = useState<any[]>([]);
  const [packageId, setPackageId] = useState("");
  const [wordCount, setWordCount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) return;
    setWordCount(item.wordCount ? String(item.wordCount) : "");
    setFile(null);
    api
      .get("/publish-packages")
      .then(({ data }) => {
        const list = extractList(data, "packages").filter((p: any) => p.isActive !== false);
        setPackages(list);
        setPackageId(item.packageId || list[0]?._id || "");
      })
      .catch(() => setPackages([]));
  }, [item]);

  const handleSubmit = async () => {
    if (!item) return;
    const words = Math.floor(Number(wordCount));
    if (!Number.isFinite(words) || words < 1) {
      toast.error("Please enter the word count.");
      return;
    }
    if (!packageId) {
      toast.error("Please choose a publishing package.");
      return;
    }
    if (!file && !item.fileUrl) {
      toast.error("Please upload your manuscript file.");
      return;
    }

    setSubmitting(true);
    try {
      let fileUrl = item.fileUrl || "";
      if (file) {
        const form = new FormData();
        form.append("document", file);
        const { data } = await api.post("/authors/me/uploads/document", form);
        fileUrl = data?.data?.url || data?.url || data?.data?.fileUrl || "";
        if (!fileUrl) throw new Error("Upload finished but no file URL was returned.");
      }

      await api.post(`/authors/me/books/${item.id}/submit`, {
        fileUrl,
        genre: item.category,
        wordCount: words,
        packageId,
      });
      toast.success("Sent for editorial review.");
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not submit for review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
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
                {packages.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} — ₹{Number(p.price || 0).toLocaleString("en-IN")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

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
