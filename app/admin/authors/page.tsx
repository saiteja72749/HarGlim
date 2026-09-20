"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import {
  Feather,
  Search,
  DollarSign,
  ExternalLink,
  ChevronRight,
  Eye,
  Loader2,
  X,
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
import Link from "next/link";

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });

  // Detail Drawer State (GET /api/admin/authors/:authorId)
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [authorDetail, setAuthorDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Fetch Authors List via GET /api/admin/users?role=author
  const fetchAuthors = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: any = { role: "author", page, limit: 20 };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get("/admin/users", { params }).catch(() =>
        api.get("/users", { params })
      );

      const items =
        data?.data?.users ||
        (Array.isArray(data?.data) ? data.data : []) ||
        (Array.isArray(data) ? data : []);
      setAuthors(Array.isArray(items) ? items : []);

      if (data?.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch authors list:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  // Open Author Detail Drawer
  const openAuthorDetail = async (author: any) => {
    const aId = author._id || author.id;
    setSelectedAuthorId(aId);
    setLoadingDetail(true);
    setAuthorDetail(null);

    try {
      // 1. Fetch rich admin author detail
      const res = await api.get(`/admin/authors/${aId}`).catch(() => null);
      if (res?.data?.data) {
        setAuthorDetail(res.data.data);
      } else {
        // Fallback with basic user object
        setAuthorDetail({
          author,
          bookCounts: { published: 0, drafts: 0, total: 0 },
        });
      }
    } catch (err) {
      console.warn("Failed to load detailed author record:", err);
      setAuthorDetail({
        author,
        bookCounts: { published: 0, drafts: 0, total: 0 },
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredAuthors = authors.filter((a) => {
    const nameMatches = (a.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatches = (a.email || "").toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatches || emailMatches;
  });

  if (error) {
    return (
      <ErrorState
        title="Could not load authors"
        message="Failed to fetch registered authors from backend. Please retry."
        onRetry={fetchAuthors}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F3D3E]">
            Authors Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#5C6E6E] mt-1">
            Manage author accounts, manuscript entitlements, publication status, and royalty settlements.
          </p>
        </div>
        <Link href="/admin/author-applications">
          <Button variant="outline" className="text-xs font-bold gap-1.5 border-[#0F3D3E]/30 text-[#0F3D3E]">
            <span>Review Applications</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Filter Card */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search author by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-[#F8F9F7]"
            />
          </div>
          <div className="text-xs text-[#5C6E6E] font-medium">
            Total Authors: <span className="font-bold text-[#0F3D3E]">{pagination.total || authors.length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Authors Table */}
      <Card className="border border-[#E2E6DF] bg-white rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#F8F9F7]">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Author</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Email</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Role</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase text-[#0F3D3E]">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-[#0F3D3E]">Joined</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-[#0F3D3E]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#0F3D3E]" />
                    <p className="text-xs text-[#5C6E6E] mt-2">Loading author directory...</p>
                  </TableCell>
                </TableRow>
              ) : filteredAuthors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-[#5C6E6E]">
                    No authors found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAuthors.map((author) => {
                  const authorId = author._id || author.id;
                  const isActive = author.isActive !== false && author.status !== "Suspended";

                  return (
                    <TableRow key={authorId} className="hover:bg-[#F8F9F7]/60 text-xs">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3D3E]/10 text-[#0F3D3E] font-serif font-bold text-sm">
                            {(author.name || "A").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#0F3D3E]">{author.name}</p>
                            <p className="text-[11px] font-mono text-[#5C6E6E]">ID: {authorId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-[#5C6E6E]">
                        {author.email}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-purple-500/15 text-purple-900 border-purple-300 text-[11px] font-bold">
                          Author
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {isActive ? (
                          <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-800 border-rose-300 text-[11px]">
                            Suspended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-[#5C6E6E] font-sans">
                        {author.createdAt
                          ? new Date(author.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openAuthorDetail(author)}
                          className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white text-xs gap-1.5 font-bold h-8"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Profile</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Author Detail Modal Drawer */}
      {selectedAuthorId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#E2E6DF] overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E2E6DF] bg-[#F8F9F7]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/20 text-[#8A6D1E] font-serif font-bold text-lg">
                  <Feather className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                    {authorDetail?.author?.name || "Author Profile"}
                  </h3>
                  <p className="text-xs text-[#5C6E6E]">{authorDetail?.author?.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedAuthorId(null)}
                className="h-8 w-8 text-[#5C6E6E]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {loadingDetail ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-7 w-7 animate-spin mx-auto text-[#0F3D3E]" />
                  <p className="text-xs text-[#5C6E6E] mt-2">Loading author metrics and profile...</p>
                </div>
              ) : (
                <>
                  {/* Metric Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">Published Books</p>
                      <p className="text-xl font-serif font-bold text-[#0F3D3E] mt-1">
                        {authorDetail?.bookCounts?.published ?? 0}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">Manuscripts</p>
                      <p className="text-xl font-serif font-bold text-[#0F3D3E] mt-1">
                        {authorDetail?.publishRequestCount ?? 0}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">Total Catalog</p>
                      <p className="text-xl font-serif font-bold text-[#0F3D3E] mt-1">
                        {authorDetail?.bookCounts?.total ?? 0}
                      </p>
                    </div>
                  </div>

                  {/* Application & Entitlement Info */}
                  <div className="space-y-3">
                    <h4 className="font-bold uppercase tracking-wider text-[#5C6E6E]">
                      Author Privileges & Application
                    </h4>
                    <div className="p-4 rounded-xl bg-[#F8F9F7] border border-[#E2E6DF] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[#5C6E6E]">Application Review Status:</span>
                        <Badge className="bg-emerald-500/15 text-emerald-800 border-emerald-300 text-[11px]">
                          {authorDetail?.application?.status || "Approved"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5C6E6E]">Author Dashboard Entitlement:</span>
                        <Badge className="bg-blue-500/15 text-blue-800 border-blue-300 text-[11px]">
                          {authorDetail?.entitlement?.status || "ACTIVE"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5C6E6E]">Entitlement Source:</span>
                        <span className="font-mono font-semibold text-[#0F3D3E]">
                          {authorDetail?.entitlement?.source || "ADMIN_GRANT"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Links */}
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/authors/${selectedAuthorId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2E6DF] hover:border-[#0F3D3E] font-medium text-[#0F3D3E] shadow-2xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>View Public Author Page</span>
                    </Link>
                    <Link
                      href={`/admin/settlements`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D3E]/10 hover:bg-[#0F3D3E]/20 font-bold text-[#0F3D3E]"
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      <span>Process Royalty Settlement</span>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E2E6DF] flex justify-end bg-[#F8F9F7]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAuthorId(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
