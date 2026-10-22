"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Ban, Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatINR } from "@/lib/author-dashboard";
import {
  buildPayload,
  createManualRoyalty,
  emptyRow,
  filledRows,
  grandTotals,
  isMissingEndpoint,
  listManualRoyalties,
  rowError,
  rowTotal,
  voidManualRoyalty,
  type ManualRoyaltyRow,
  type ManualRoyaltyStatement,
} from "@/lib/manual-royalties";
import { ManualRoyaltyTable } from "@/components/royalties/manual-royalty-table";

type AuthorOption = { id: string; name: string; email: string };
type BookOption = { id: string; title: string };

const bookAuthorId = (book: any) => String((typeof book?.author === "object" ? book.author?._id : book?.author) || "");
const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

function ManualRoyaltiesPage() {
  const searchParams = useSearchParams();
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [authorId, setAuthorId] = useState(searchParams.get("authorId") || "");
  const [books, setBooks] = useState<BookOption[]>([]);
  const [rows, setRows] = useState<ManualRoyaltyRow[]>(() => [emptyRow()]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [statements, setStatements] = useState<ManualRoyaltyStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [backendMissing, setBackendMissing] = useState(false);

  useEffect(() => {
    api
      .get("/admin/users", { params: { role: "author", limit: 100 } })
      .then((res) => {
        const list = res?.data?.data?.users ?? res?.data?.data ?? [];
        setAuthors(
          (Array.isArray(list) ? list : []).map((a: any) => ({
            id: String(a._id || a.id),
            name: a.name || a.email || "Author",
            email: a.email || "",
          }))
        );
      })
      .catch(() => toast.error("Could not load the author list."));
  }, []);

  // The selected author's books feed each row's book picker (titles can still be typed freely).
  useEffect(() => {
    setBooks([]);
    if (!authorId) return;
    api
      .get("/admin/books", { params: { author: authorId, limit: 100 } })
      .then(({ data }) => {
        const items = data?.data?.books || (Array.isArray(data?.data) ? data.data : []);
        setBooks(
          (Array.isArray(items) ? items : [])
            .filter((b: any) => bookAuthorId(b) === authorId)
            .map((b: any) => ({ id: String(b._id || b.id), title: b.title || "Untitled" }))
        );
      })
      .catch(() => setBooks([]));
  }, [authorId]);

  const loadStatements = useCallback(async () => {
    setLoadingStatements(true);
    try {
      setStatements(await listManualRoyalties(authorId || undefined));
      setBackendMissing(false);
    } catch (err) {
      if (isMissingEndpoint(err)) setBackendMissing(true);
      setStatements([]);
    } finally {
      setLoadingStatements(false);
    }
  }, [authorId]);

  useEffect(() => {
    loadStatements();
  }, [loadStatements]);

  const updateRow = (key: string, patch: Partial<ManualRoyaltyRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const setBookTitle = (key: string, title: string) => {
    const match = books.find((b) => b.title.toLowerCase() === title.trim().toLowerCase());
    updateRow(key, { bookTitle: title, bookId: match?.id || "" });
  };

  const totals = useMemo(() => grandTotals(rows), [rows]);
  const selectedAuthor = authors.find((a) => a.id === authorId);

  const resetForm = () => {
    setRows([emptyRow()]);
    setNote("");
    setShowErrors(false);
  };

  const handleSave = async () => {
    if (!authorId) {
      toast.error("Select an author first.");
      return;
    }
    const filled = filledRows(rows);
    if (filled.length === 0) {
      toast.error("Add at least one book row.");
      return;
    }
    if (filled.some((row) => rowError(row))) {
      setShowErrors(true);
      toast.error("Fix the highlighted rows.");
      return;
    }
    if (periodStart && periodEnd && periodStart > periodEnd) {
      toast.error("Period start must be on or before period end.");
      return;
    }

    setSaving(true);
    try {
      await createManualRoyalty(buildPayload(authorId, rows, { periodStart, periodEnd, note }));
      toast.success(`Royalty of ${formatINR(totals.royalty)} recorded for ${selectedAuthor?.name || "the author"}.`);
      resetForm();
      loadStatements();
    } catch (err: any) {
      toast.error(
        isMissingEndpoint(err)
          ? "The backend does not support manual royalties yet (POST /admin/manual-royalties)."
          : err?.response?.data?.message || "Failed to save the royalty statement."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async (statement: ManualRoyaltyStatement) => {
    const reason = window.prompt("Reason for voiding this royalty statement:", "Entered by mistake");
    if (!reason) return;
    try {
      await voidManualRoyalty(statement.id, reason);
      toast.success("Statement voided.");
      loadStatements();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to void the statement.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">Manual Royalties</h1>
          <p className="text-sm text-[#5C6E6E] mt-1">
            Share book sales and royalties with an author for their information. Saved statements appear in that author&apos;s Royalties page. They are not paid out through Royalty Settlements.
          </p>
        </div>
        <Link href="/admin/settlements" className="text-sm font-semibold text-[#8A6D1E] underline underline-offset-2">
          Royalty Settlements →
        </Link>
      </div>

      {backendMissing && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            The backend does not have the manual royalty API yet, so statements cannot be saved or listed. The table
            below works and will save as soon as the backend adds it.
          </span>
        </div>
      )}

      <Card className="border-[#E2E6DF]">
        <CardHeader>
          <CardTitle className="text-lg text-[#0F3D3E]">New royalty statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">Author *</Label>
              <Select value={authorId} onValueChange={setAuthorId}>
                <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl">
                  <SelectValue placeholder="Select an author" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E6DF] max-h-72">
                  {authors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.email ? ` · ${a.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {authorId && <p className="text-[10px] font-mono text-[#5C6E6E] break-all">ID: {authorId}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodStart" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">Period from</Label>
              <Input id="periodStart" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">Period to</Label>
              <Input id="periodEnd" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl" />
            </div>
          </div>

          <datalist id="author-books">
            {books.map((b) => (
              <option key={b.id} value={b.title} />
            ))}
          </datalist>

          <div className="overflow-x-auto rounded-xl border border-[#E2E6DF]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#F8F9F7] text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                <tr>
                  <th className="p-3">Book name</th>
                  <th className="p-3 w-40">Royalty per book (100%)</th>
                  <th className="p-3 w-32">Total books sold</th>
                  <th className="p-3 w-36 text-right">Total royalty</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6DF]">
                {rows.map((row) => {
                  const error = showErrors && filledRows([row]).length > 0 ? rowError(row) : null;
                  return (
                    <tr key={row.key} className={error ? "bg-rose-50/60" : undefined}>
                      <td className="p-2">
                        <Input
                          list="author-books"
                          value={row.bookTitle}
                          onChange={(e) => setBookTitle(row.key, e.target.value)}
                          placeholder={books.length ? "Pick or type a book" : "Book name"}
                          className="border-[#E2E6DF] rounded-lg"
                        />
                        {error && <p className="text-[10px] text-rose-700 mt-1">{error}</p>}
                        {!error && row.bookId && <p className="text-[10px] font-mono text-[#5C6E6E] mt-1">Book ID: {row.bookId}</p>}
                      </td>
                      <td className="p-2">
                        <Input type="number" min="0" step="0.01" value={row.royaltyPerBook} onChange={(e) => updateRow(row.key, { royaltyPerBook: e.target.value })} placeholder="₹0" className="border-[#E2E6DF] rounded-lg font-mono" />
                      </td>
                      <td className="p-2">
                        <Input type="number" min="1" step="1" value={row.unitsSold} onChange={(e) => updateRow(row.key, { unitsSold: e.target.value })} placeholder="0" className="border-[#E2E6DF] rounded-lg font-mono" />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 tabular-nums">{formatINR(rowTotal(row))}</td>
                      <td className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remove row"
                          onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== row.key) : [emptyRow()]))}
                          className="h-8 w-8 text-[#5C6E6E] hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#F8F9F7] font-bold text-[#0F3D3E]">
                <tr>
                  <td className="p-3" colSpan={2}>
                    <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, emptyRow()])} className="gap-1.5 border-[#0F3D3E]/30">
                      <Plus className="h-4 w-4" /> Add row
                    </Button>
                  </td>
                  <td className="p-3 font-mono tabular-nums">{totals.units.toLocaleString("en-IN")} total</td>
                  <td className="p-3 text-right font-mono text-emerald-700 tabular-nums">{formatINR(totals.royalty)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">Note</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Book fair sales, Amazon sales for September" className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl" />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving || !authorId} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save royalty of {formatINR(totals.royalty)}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E2E6DF]">
        <CardHeader>
          <CardTitle className="text-lg text-[#0F3D3E]">
            Recorded statements{selectedAuthor ? ` · ${selectedAuthor.name}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStatements ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#5C6E6E]" /></div>
          ) : statements.length === 0 ? (
            <p className="text-sm text-[#5C6E6E]">No manual royalty statements yet.</p>
          ) : (
            <div className="space-y-4">
              {statements.map((s) => (
                <div key={s.id} className="rounded-xl border border-[#E2E6DF] p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#0F3D3E]">{s.authorName || authors.find((a) => a.id === s.authorId)?.name || s.authorId}</p>
                      <p className="text-xs text-[#5C6E6E]">
                        {s.periodStart || s.periodEnd ? `${formatDate(s.periodStart)} – ${formatDate(s.periodEnd)} · ` : ""}
                        Recorded {formatDate(s.createdAt)}
                      </p>
                      {s.note && <p className="text-xs text-[#5C6E6E] mt-1 italic">{s.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={s.status === "VOID" ? "text-rose-700 border-rose-200" : "text-emerald-700 border-emerald-200"}>
                        {s.status.toLowerCase()}
                      </Badge>
                      {s.status !== "VOID" && (
                        <Button variant="ghost" size="sm" onClick={() => handleVoid(s)} className="h-7 gap-1 text-xs text-rose-700">
                          <Ban className="h-3.5 w-3.5" /> Void
                        </Button>
                      )}
                    </div>
                  </div>
                  <ManualRoyaltyTable statement={s} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminManualRoyaltiesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <ManualRoyaltiesPage />
    </Suspense>
  );
}
