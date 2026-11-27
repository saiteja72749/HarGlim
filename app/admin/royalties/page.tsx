"use client";

import { notifyLiveChange } from "@/lib/live-sync";
import type { Book } from "@/types";
import { scheduleRequest } from "@/lib/schedule-request";
import { parseCollectionPage } from "@/lib/catalog-data";
import { describeApiError, mutationErrorMessage, record, writeOutcomeUncertain } from "@/lib/api-error";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Ban, Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
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
  formatManualRoyalty,
  grandTotals,
  listManualRoyalties,
  manualRoyaltyAttempt,
  type ManualRoyaltyAttempt,
  rowError,
  rowTotal,
  voidManualRoyalty,
  type ManualRoyaltyRow,
  type ManualRoyaltyStatement,
} from "@/lib/manual-royalties";
import { ManualRoyaltyTable } from "@/components/royalties/manual-royalty-table";

type AuthorOption = { id: string; name: string; email: string };
type BookOption = { id: string; title: string };

const bookAuthorId = (book: Book) => String((typeof book?.author === "object" ? book.author?._id : book?.author) || "");
const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

function ManualRoyaltiesPage() {
  const searchParams = useSearchParams();
  const [authorSearch, setAuthorSearch] = useState("");
  const [authorPage, setAuthorPage] = useState(1);
  const [authorRevision, setAuthorRevision] = useState(0);
  const [authorResult, setAuthorResult] = useState<{ key: string; authors: AuthorOption[]; pages: number } | { key: string; failed: true }>();
  const authorKey = JSON.stringify([authorSearch.trim(), authorPage, authorRevision]);
  const currentAuthors = authorResult?.key === authorKey ? authorResult : undefined;
  const authors = currentAuthors && "authors" in currentAuthors ? currentAuthors.authors : [];
  const authorPages = currentAuthors && "pages" in currentAuthors ? currentAuthors.pages : 1;
  const [pickedAuthor, setPickedAuthor] = useState<AuthorOption>();
  const [authorId, setAuthorId] = useState(searchParams.get("authorId") || "");
  const [bookOptions, setBookOptions] = useState<{ authorId: string; items: BookOption[] }>();
  const books = bookOptions?.authorId === authorId ? bookOptions.items : [];
  const [rows, setRows] = useState<ManualRoyaltyRow[]>(() => [emptyRow()]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [note, setNote] = useState("");
  const [replacementFor, setReplacementFor] = useState<string>();
  const [attempt, setAttempt] = useState<ManualRoyaltyAttempt>();
  const unconfirmedCreate = useRef(false);
  const [retryAt, setRetryAt] = useState<number>();
  const [statusFilter, setStatusFilter] = useState<"" | "RECORDED" | "VOID">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [statements, setStatements] = useState<ManualRoyaltyStatement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);
  const [statementError, setStatementError] = useState("");
  const [statementPage, setStatementPage] = useState(1);
  const [statementPages, setStatementPages] = useState(1);
  const [statementRevision, setStatementRevision] = useState(0);
  const [bookError, setBookError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api.get("/admin/users", {
        params: { role: "author", page: authorPage, limit: 25, search: authorSearch.trim() || undefined },
        signal: controller.signal, cache: "no-store",
      }).then((res) => {
        if (controller.signal.aborted) return;
        const { items, pages } = parseCollectionPage<unknown>(res.data, "users");
        const results = new Map<string, AuthorOption>();
        for (const item of items) {
          const author = record(item);
          const id = author._id || author.id;
          if (typeof id !== "string" || !/^[0-9a-f]{24}$/i.test(id)) throw new Error("The API returned an invalid author ID.");
          const email = typeof author.email === "string" ? author.email : "";
          results.set(id, { id, email, name: typeof author.name === "string" && author.name ? author.name : email || id });
        }
        if (pages !== null && authorPage > pages) setAuthorPage(pages);
        else setAuthorResult({ key: authorKey, authors: [...results.values()], pages: pages ?? 1 });
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuthorResult({ key: authorKey, failed: true });
      });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [authorKey, authorPage, authorSearch]);

  // Each statement line references a book owned by the selected author.
  useEffect(() => {
    if (!authorId) return;
    const controller = new AbortController();
    const loadBooks = async () => {
      const loadPage = async (page: number) => {
        const { data } = await api.get("/admin/books", {
          params: { author: authorId, page, limit: 100 }, signal: controller.signal, cache: "no-store",
        });
        return parseCollectionPage<Book>(data, "books");
      };
      try {
        const first = await loadPage(1);
        const items = [...first.items];
        for (let page = 2; page <= (first.pages ?? 1); page++) {
          if (controller.signal.aborted) return;
          items.push(...(await loadPage(page)).items);
        }
        if (controller.signal.aborted) return;
        setBookError(null);
        const owned = items.filter((book) => (book._id || book.id) && typeof book.title === "string" && book.title.trim() && bookAuthorId(book) === authorId);
        setBookOptions({ authorId, items: Array.from(new Map(owned.map((book) => {
          const id = String(book._id || book.id);
          return [id, { id, title: book.title }];
        })).values()) });
      } catch {
        if (!controller.signal.aborted) setBookError(authorId);
      }
    };
    void loadBooks();
    return () => controller.abort();
  }, [authorId]);

  const refreshStatements = useCallback(() => setStatementRevision((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    const cancel = scheduleRequest(async () => {
      setLoadingStatements(true);
      setStatementError("");
      try {
        if (filterFrom && filterTo && filterFrom > filterTo) {
          setStatementError("The start date must be on or before the end date.");
          return;
        }
        const result = await listManualRoyalties({
          authorId: authorId || undefined, status: statusFilter || undefined,
          from: filterFrom ? `${filterFrom}T00:00:00.000Z` : undefined,
          to: filterTo ? `${filterTo}T23:59:59.999Z` : undefined,
        }, statementPage, controller.signal);
        if (controller.signal.aborted) return;
        setStatements(result.statements);
        setStatementPages(result.pages);
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatementError(mutationErrorMessage(error, "The statement list could not load. Please retry."));
      } finally {
        if (!controller.signal.aborted) setLoadingStatements(false);
      }
    });
    return () => { cancel(); controller.abort(); };
  }, [authorId, statementPage, statementRevision, statusFilter, filterFrom, filterTo]);

  const selectAuthor = (id: string) => {
    setStatementPage(1);
    setReplacementFor(undefined);
    setAuthorId(id);
    setPickedAuthor(authors.find((author) => author.id === id));
    setRows((current) => current.map((row) => row.bookId ? { ...row, bookId: "", bookTitle: "" } : row));
    setStatements([]);
  };

  const updateRow = (key: string, patch: Partial<ManualRoyaltyRow>) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const totals = useMemo(() => grandTotals(rows), [rows]);
  const selectedAuthor = authors.find((a) => a.id === authorId) || (pickedAuthor?.id === authorId ? pickedAuthor : undefined);

  const resetForm = () => {
    setRows([emptyRow()]);
    setNote("");
    setReplacementFor(undefined);
    setShowErrors(false);
  };

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setTimeout(() => setRetryAt(undefined), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [retryAt]);

  const handleSave = async () => {
    if (busy.current || uncertain || retryAt) return;
    let current = attempt;
    if (!current) {
      if (!/^[0-9a-f]{24}$/i.test(authorId)) {
        toast.error("Select an author first.");
        return;
      }
      const filled = filledRows(rows);
      if (!filled.length || filled.some((row) => rowError(row) || !books.some((book) => book.id === row.bookId))) {
        setShowErrors(true);
        toast.error("Choose books from this author's catalog and enter valid rates and quantities.");
        return;
      }
      if (periodStart && periodEnd && periodStart > periodEnd) {
        toast.error("Period start must be on or before period end.");
        return;
      }
      current = manualRoyaltyAttempt(buildPayload(authorId, rows, { periodStart, periodEnd, note, replacementFor }));
      setAttempt(current);
    }

    busy.current = true;
    setSaving(true);
    setWriteError("");
    try {
      const saved = await createManualRoyalty(current);
      notifyLiveChange("royalty-statements");
      toast.success(`Royalty of ${formatManualRoyalty(saved.totalRoyalty, saved.currency)} recorded for ${saved.authorName || "the author"}.`);
      unconfirmedCreate.current = false;
      setAttempt(undefined);
      resetForm();
      refreshStatements();
    } catch (error) {
      const failure = describeApiError(error);
      const conflict = failure.response?.data.error === "MANUAL_ROYALTY_IDEMPOTENCY_CONFLICT";
      if (conflict) {
        setUncertain(true);
        setWriteError("The backend reported a conflict for this submission. Check recorded statements before opening a new form.");
      } else if (writeOutcomeUncertain(error) || failure.response?.status === 429 || unconfirmedCreate.current) {
        unconfirmedCreate.current ||= writeOutcomeUncertain(error);
        setRetryAt(failure.retryAt);
        setWriteError(failure.response?.status === 429
          ? "Please wait before retrying this statement."
          : "The save outcome is unconfirmed. Retry this exact submission to retrieve or complete it safely.");
      } else {
        setAttempt(undefined);
        setWriteError(mutationErrorMessage(error, "Could not record the royalty statement."));
      }
      refreshStatements();
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const replaceStatement = (statement: ManualRoyaltyStatement) => {
    selectAuthor(statement.authorId);
    setReplacementFor(statement.id);
    setPeriodStart(statement.periodStart.slice(0, 10));
    setPeriodEnd(statement.periodEnd.slice(0, 10));
    setNote("");
    setShowErrors(false);
    setRows(statement.items.length ? statement.items.map((item) => ({
      ...emptyRow(), bookId: item.bookId ?? "", bookTitle: item.bookTitle,
      royaltyPerBook: String(item.royaltyPerBook), unitsSold: String(item.unitsSold),
    })) : [emptyRow()]);
  };

  const handleVoid = async (statement: ManualRoyaltyStatement) => {
    if (busy.current || uncertain || attempt) return;
    const reason = window.prompt("Reason for voiding this royalty statement:")?.trim();
    if (!reason) return;
    busy.current = true;
    setVoidingId(statement.id);
    setWriteError("");
    try {
      await voidManualRoyalty(statement.id, reason);
      notifyLiveChange("royalty-statements");
      toast.success("Statement voided.");
      refreshStatements();
    } catch (error) {
      setWriteError(mutationErrorMessage(error, "Could not void the statement."));
      if (writeOutcomeUncertain(error)) {
        setUncertain(true);
        refreshStatements();
      }
    } finally {
      busy.current = false;
      setVoidingId(null);
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

      {writeError && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
        <p>{writeError}</p>
        {uncertain && <p>Review the refreshed statement list before starting another operation.</p>}
      </div>}

      <Card className="border-[#E2E6DF]">
        <CardHeader>
          <CardTitle className="text-lg text-[#0F3D3E]">{replacementFor ? "Replacement royalty statement" : "New royalty statement"}</CardTitle>
        </CardHeader>
        <CardContent>
          <fieldset disabled={Boolean(attempt) || saving || Boolean(voidingId) || uncertain} className="min-w-0 space-y-5">
          {replacementFor && <div className="flex flex-wrap items-center gap-2 text-sm">
            <p>Replacing void statement <span className="font-mono break-all">{replacementFor}</span></p>
            <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel replacement</Button>
          </div>}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">Author *</Label>
              <Input aria-label="Search authors" placeholder="Search authors by name or email" maxLength={100}
                value={authorSearch} onChange={(event) => { setAuthorSearch(event.target.value); setAuthorPage(1); }} />
              <Select value={authorId} onValueChange={selectAuthor} disabled={saving || Boolean(voidingId) || Boolean(replacementFor) || Boolean(attempt)}>
                <SelectTrigger aria-label="Statement author" className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl">
                  <SelectValue placeholder="Select an author" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E2E6DF] max-h-72">
                  {authorId && !authors.some((author) => author.id === authorId) && (
                    <SelectItem value={authorId}>{selectedAuthor?.name || authorId}</SelectItem>
                  )}
                  {authors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.email ? ` · ${a.email}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!currentAuthors && <p role="status" className="text-sm text-muted-foreground">Searching authors…</p>}
              {currentAuthors && "failed" in currentAuthors && <div role="alert" className="space-y-2 text-sm">
                <p>Could not load authors.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setAuthorRevision((value) => value + 1)}>Retry author search</Button>
              </div>}
              {currentAuthors && "authors" in currentAuthors && !authors.length && <p role="status" className="text-sm text-muted-foreground">No matching authors.</p>}
              {authorPages > 1 && <nav aria-label="Author search pages" className="flex items-center justify-between gap-2">
                <Button type="button" size="sm" variant="outline" disabled={authorPage <= 1} onClick={() => setAuthorPage(authorPage - 1)}>Previous</Button>
                <span className="text-xs">Page {authorPage} of {authorPages}</span>
                <Button type="button" size="sm" variant="outline" disabled={authorPage >= authorPages} onClick={() => setAuthorPage(authorPage + 1)}>Next</Button>
              </nav>}
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

          {authorId && bookError === authorId && <p role="alert" className="text-sm text-destructive">The linked book list could not load.</p>}
          <div role="region" aria-label="Statement lines" tabIndex={0} className="overflow-x-auto rounded-xl border border-[#E2E6DF]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#F8F9F7] text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                <tr>
                  <th className="p-3">Book name</th>
                  <th className="p-3 w-40">Royalty per book (100%)</th>
                  <th className="p-3 w-32">Total books sold</th>
                  <th className="p-3 w-36 text-right">Estimated royalty</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E6DF]">
                {rows.map((row) => {
                  const error = showErrors && filledRows([row]).length > 0 ? rowError(row) : null;
                  return (
                    <tr key={row.key} className={error ? "bg-rose-50/60" : undefined}>
                      <td className="p-2">
                        <select aria-label="Author book" value={row.bookId} onChange={(event) => {
                          const book = books.find((item) => item.id === event.target.value);
                          updateRow(row.key, { bookId: book?.id ?? "", bookTitle: book?.title ?? "" });
                        }} className="h-9 w-full rounded-lg border bg-background px-2">
                          <option value="">Choose an author book</option>
                          {row.bookId && !books.some((book) => book.id === row.bookId) && <option value={row.bookId} disabled>{row.bookTitle} (unavailable)</option>}
                          {books.map((book) => <option key={book.id} value={book.id}>{book.title} ({book.id.slice(-6)})</option>)}
                        </select>
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

          </fieldset>
          <div className="mt-5 flex justify-end">
            <Button onClick={handleSave} disabled={saving || Boolean(voidingId) || uncertain || Boolean(retryAt) || !authorId} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {attempt ? "Retry same submission" : "Save statement"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#E2E6DF]">
        <CardHeader>
          <CardTitle className="text-lg text-[#0F3D3E]">
            Royalty statements{selectedAuthor ? ` · ${selectedAuthor.name}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <label className="space-y-1 text-sm"><span>Status</span><select className="h-9 w-full rounded-lg border bg-background px-2" value={statusFilter}
              onChange={(event) => { setStatusFilter(event.target.value as typeof statusFilter); setStatementPage(1); }}>
              <option value="">All statuses</option><option value="RECORDED">Recorded</option><option value="VOID">Void</option>
            </select></label>
            <label className="space-y-1 text-sm"><span>Filter from (UTC)</span><Input type="date" value={filterFrom}
              onChange={(event) => { setFilterFrom(event.target.value); setStatementPage(1); }} /></label>
            <label className="space-y-1 text-sm"><span>Filter to (UTC)</span><Input type="date" value={filterTo}
              onChange={(event) => { setFilterTo(event.target.value); setStatementPage(1); }} /></label>
          </div>
          {authorId && <Button type="button" variant="outline" className="mb-3" disabled={saving || Boolean(voidingId) || Boolean(attempt)} onClick={() => selectAuthor("")}>Show all statements</Button>}
          {loadingStatements ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#5C6E6E]" /></div>
          ) : statementError ? (
            <ErrorState title="Statements could not load" message={statementError} onRetry={refreshStatements} />
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
                      {s.replacementFor && <p className="text-xs break-all">Replaces {s.replacementFor}</p>}
                      {s.note && <p className="text-xs text-[#5C6E6E] mt-1 italic">{s.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={s.status === "VOID" ? "text-rose-700 border-rose-200" : "text-emerald-700 border-emerald-200"}>
                        {s.status.toLowerCase()}
                      </Badge>
                      {s.status === "VOID" ? (
                        <Button variant="outline" size="sm" disabled={saving || Boolean(voidingId) || uncertain || Boolean(attempt)} onClick={() => replaceStatement(s)}>Replace void statement</Button>
                      ) : (
                        <Button variant="ghost" size="sm" disabled={saving || Boolean(voidingId) || uncertain || Boolean(attempt)} onClick={() => handleVoid(s)} className="h-7 gap-1 text-xs text-rose-700">
                          <Ban className="h-3.5 w-3.5" /> Void
                        </Button>
                      )}
                    </div>
                  </div>
                  <ManualRoyaltyTable statement={s} />
                </div>
              ))}
              {statementPages > 1 && <nav aria-label="Statement pages" className="flex flex-wrap items-center gap-2">
                <Button variant="outline" disabled={statementPage <= 1} onClick={() => setStatementPage((page) => page - 1)}>Previous</Button>
                <span className="text-sm">Page {statementPage} of {statementPages}</span>
                <Button variant="outline" disabled={statementPage >= statementPages} onClick={() => setStatementPage((page) => page + 1)}>Next</Button>
              </nav>}
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
