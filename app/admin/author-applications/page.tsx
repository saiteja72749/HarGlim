"use client";

import { scheduleRequest } from "@/lib/schedule-request";
import { describeApiError, record } from "@/lib/api-error";
import { accountId, adminResponse, adminRows } from "@/lib/admin-account-api";
import { notifyLiveChange } from "@/lib/live-sync";

import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { ErrorState } from "@/components/ui/error-state";
import { CheckCircle2, XCircle, Search } from "lucide-react";
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
import { getSafeExternalUrl } from "@/lib/utils";

const getStatusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "approved":
      return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold text-xs">Approved</Badge>;
    case "rejected":
      return <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 font-semibold text-xs">Rejected</Badge>;
    default:
      return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 font-semibold text-xs animate-pulse">Pending</Badge>;
  }
};

type AuthorApplication = {
  _id: string;
  id?: string;
  bio?: string;
  email?: string;
  experience?: string;
  fullName?: string;
  name?: string;
  penName?: string;
  phone?: string;
  portfolioUrl?: string;
  status: string;
};

export default function AdminAuthorApplicationsPage() {
  const [applications, setApplications] = useState<AuthorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const saving = useRef(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params: Record<string, string | number> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const { data } = await api.get("/admin/author-applications", { params, cache: "no-store" });
      setApplications(adminRows<AuthorApplication>(data, "applications"));
    } catch (err) {
      console.error("Failed to fetch author applications:", describeApiError(err));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => scheduleRequest(fetchApplications), [fetchApplications]);

  const changeApplicationStatus = async (id: string, status: "approved" | "rejected") => {
    if (saving.current) return;
    if (status === "rejected" && !window.confirm("Reject this author application?")) return;
    saving.current = true;
    setProcessingId(id);
    try {
      const { data } = await api.put(`/admin/author-applications/${encodeURIComponent(id)}/status`, { status });
      const result = record(adminResponse(data));
      const updated = record(result.application ?? result);
      const matches = (app: { _id?: unknown; id?: unknown; status?: unknown }) =>
        accountId(app) === id && String(app.status).toLowerCase() === status;
      if (!matches(updated)) {
        let confirmed = false;
        try {
          const { data: readback } = await api.get("/admin/author-applications", { params: { status }, cache: "no-store" });
          confirmed = adminRows<AuthorApplication>(readback, "applications").some(matches);
        } catch {
          // Surface an uncertain result instead of encouraging a repeated write.
        }
        if (!confirmed) throw new Error("The backend accepted the request, but the new status could not be confirmed. Refresh the applications list before retrying.");
      }
      notifyLiveChange("account-access", false);
      toast.success(status === "approved" ? "Author application approved." : "Author application rejected.");
      await fetchApplications();
    } catch (caughtError) {
      const err = describeApiError(caughtError);
      toast.error(err.response?.data?.message || err.message);
    } finally {
      saving.current = false;
      setProcessingId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    const name = (app.fullName || app.penName || app.name || "").toLowerCase();
    const email = (app.email || "").toLowerCase();
    const phone = (app.phone || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || phone.includes(query);
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
          Author Applications
        </h1>
        <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
          Review candidate writer requests and approve author dashboard access privileges.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              placeholder="Search applications by Name, Pen Name, Email, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white border-[#E2E6DF]"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            {["all", "pending", "approved", "rejected"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  statusFilter === tab
                    ? "bg-[#0F3D3E] text-white shadow-xs"
                    : "bg-[#F8F9F7] text-[#5C6E6E] hover:text-[#0F3D3E] border border-[#E2E6DF]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Applications Table (Strictly matching prompt) */}
      {error ? (
        <ErrorState
          title="Could not load applications"
          message="We encountered an issue fetching author requests. Please try again."
          onRetry={fetchApplications}
        />
      ) : loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F3D3E]" />
        </div>
      ) : (
        <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div>
              <Table>
                <TableHeader className="bg-[#F8F9F7]">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Applicant & Details</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Contact Info</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Bio / Experience</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Status</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider text-[#0F3D3E]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app, index) => {
                    const id = accountId(app);
                    if (!id) return null;
                    const status = (app.status || "pending").toLowerCase();

                    return (
                      <TableRow key={id || index} className="hover:bg-[#F8F9F7]/60 text-xs">
                        {/* Name & Pen Name */}
                        <TableCell className="align-top py-3">
                          <div className="font-serif font-bold text-[#0F3D3E] text-sm">
                            {app.fullName || app.name || "Writer Candidate"}
                          </div>
                          {app.penName && app.penName !== app.fullName && (
                            <span className="text-[11px] text-[#5C6E6E] block font-sans">
                              Pen Name: <strong className="text-[#0F3D3E]">{app.penName}</strong>
                            </span>
                          )}
                          {getSafeExternalUrl(app.portfolioUrl) && (
                            <a
                              href={getSafeExternalUrl(app.portfolioUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary hover:underline block truncate max-w-[180px] mt-0.5"
                            >
                              🔗 Portfolio Website
                            </a>
                          )}
                        </TableCell>

                        {/* Email & Phone */}
                        <TableCell className="align-top py-3">
                          <div className="font-sans text-[#5C6E6E] font-medium">
                            {app.email || "N/A"}
                          </div>
                          {app.phone && (
                            <div className="font-mono text-[11px] text-[#0F3D3E] mt-0.5">
                              📞 {app.phone}
                            </div>
                          )}
                        </TableCell>

                        {/* Bio & Experience */}
                        <TableCell className="align-top py-3 max-w-[240px]">
                          {app.experience && (
                            <span className="inline-block px-2 py-0.5 rounded bg-[#0F3D3E]/10 text-[#0F3D3E] font-semibold text-[10px] mb-1">
                              Exp: {app.experience}
                            </span>
                          )}
                          <p className="text-[11px] text-[#5C6E6E] line-clamp-2 leading-relaxed">
                            {app.bio || "No bio provided."}
                          </p>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          {getStatusBadge(status)}
                        </TableCell>

                        {/* Action Buttons: Approve (Green) & Reject (Red) */}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* Approve (Green Button) */}
                            <Button
                              size="sm"
                              onClick={() => changeApplicationStatus(id, "approved")}
                              disabled={processingId === id || status === "approved"}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg gap-1.5 font-semibold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>{status === "approved" ? "Approved" : "Approve"}</span>
                            </Button>

                            {/* Reject (Red Button) */}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => changeApplicationStatus(id, "rejected")}
                              disabled={processingId === id || status === "rejected"}
                              className="text-xs h-8 px-3 rounded-lg gap-1.5 font-semibold"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>{status === "rejected" ? "Rejected" : "Reject"}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredApps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground text-xs">
                        No author applications found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
