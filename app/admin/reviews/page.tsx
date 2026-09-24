"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import toast from "react-hot-toast";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (statusFilter !== "all") params.status = statusFilter;

      const { data } = await api.get("/admin/reviews", { params }).catch(() =>
        api.get("/reviews", { params })
      );
      const items = data?.data?.reviews || (Array.isArray(data?.data) ? data.data : []) || (Array.isArray(data) ? data : []);
      setReviews(Array.isArray(items) ? items : []);
    } catch (err) {
      console.warn("Reviews fetch notice:", err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Moderate Status (PATCH /api/admin/reviews/:reviewId/status)
  const handleModerate = async (reviewId: string, newStatus: "approved" | "rejected") => {
    setActionInProgressId(reviewId);
    try {
      await api.patch(`/admin/reviews/${reviewId}/status`, { status: newStatus });
      toast.success(`Review ${newStatus === "approved" ? "approved" : "rejected"}!`);
      setReviews((prev) =>
        prev.map((r) => ((r._id || r.id) === reviewId ? { ...r, status: newStatus } : r))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to moderate review.");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Delete Review (DELETE /api/admin/reviews/:id)
  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    setActionInProgressId(reviewId);
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      toast.success("Review deleted successfully.");
      setReviews((prev) => prev.filter((r) => (r._id || r.id) !== reviewId));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete review.");
    } finally {
      setActionInProgressId(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const comment = (r.comment || r.review || "").toLowerCase();
    const bookTitle = (r.book?.title || r.bookTitle || "").toLowerCase();
    const userName = (r.user?.name || r.userName || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return comment.includes(q) || bookTitle.includes(q) || userName.includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Customer Reviews Moderation
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Review reader ratings, moderate editorial comments, and maintain honest catalog feedback.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search by comment, book, or reader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["pending", "approved", "rejected", "all"].map((st) => (
              <Button
                key={st}
                variant={statusFilter === st ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(st)}
                className="text-xs capitalize"
              >
                {st}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Book / Work</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Reader</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Rating</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Review Comment</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-36 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading reviews queue...</p>
                  </TableCell>
                </TableRow>
              ) : filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6E6E]">
                    No reviews in the {statusFilter} queue.
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((rev) => {
                  const revId = rev._id || rev.id;
                  const ratingNum = Number(rev.rating || 5);
                  const isApproved = rev.status === "approved";
                  const isRejected = rev.status === "rejected";

                  return (
                    <TableRow key={revId} className="hover:bg-[#F8F9F7]/60 text-xs">
                      <TableCell>
                        <p className="font-bold text-[#0F3D3E]">{rev.book?.title || rev.bookTitle || "Catalog Book"}</p>
                        <p className="text-[11px] font-mono text-[#5C6E6E]">{rev.book?._id || rev.bookId}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-[#0F3D3E]">{rev.user?.name || rev.userName || "Reader"}</p>
                        <p className="text-[11px] text-[#5C6E6E]">{rev.user?.email || "Verified Buyer"}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1 bg-[#D4AF37]/15 px-2 py-0.5 rounded-full text-[#8A6D1E] font-bold">
                          <Star className="h-3 w-3 fill-[#D4AF37]" />
                          <span>{ratingNum}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="line-clamp-2 text-[#0F3D3E] italic">
                          &ldquo;{rev.comment || rev.review}&rdquo;
                        </p>
                      </TableCell>
                      <TableCell className="text-center">
                        {isApproved ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 text-[10px]">Approved</Badge>
                        ) : isRejected ? (
                          <Badge className="bg-rose-500/15 text-rose-800 text-[10px]">Rejected</Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 text-amber-800 text-[10px]">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isApproved && (
                            <Button
                              size="sm"
                              onClick={() => handleModerate(revId, "approved")}
                              disabled={actionInProgressId === revId}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Approve</span>
                            </Button>
                          )}
                          {!isRejected && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModerate(revId, "rejected")}
                              disabled={actionInProgressId === revId}
                              className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>Reject</span>
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(revId)}
                            disabled={actionInProgressId === revId}
                            className="h-7 w-7 text-[#5C6E6E] hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
