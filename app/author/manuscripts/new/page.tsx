"use client";

import { BookLanguageField } from "@/components/books/book-language-field";
import { bookLanguageApiError, bookLanguageError, normalizeBookLanguage } from "@/lib/book-language";
import { verifyAuthorBookLanguage } from "@/lib/author-manuscript";
import { PublishingTermsField, usePublishingTerms } from "@/components/authors/publishing-terms-field";
import { termsConflict } from "@/lib/publishing-terms";
import { describeApiError } from "@/lib/api-error";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  Upload,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";
import Link from "next/link";
import api from "@/lib/api";
import { fetchBackendCategories } from "@/lib/categories";
import { useBookCategories } from "@/hooks/use-book-categories";
import { fetchPublicPackages, type PackageCard } from "@/lib/publish-packages";

import { manuscriptFileError, submitAuthorManuscript, uploadAuthorManuscript } from "@/lib/author-manuscript";

export default function NewManuscriptPage() {
  const router = useRouter();
  const terms = usePublishingTerms();
  const [isLoading, setIsLoading] = useState(false);
  const pending = useRef(false);
  const [languageError, setLanguageError] = useState<string>();
  const [needsReconciliation, setNeedsReconciliation] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [packages, setPackages] = useState<PackageCard[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [loadingPackages, setLoadingPackages] = useState(true);
  const { categories, loading: categoriesLoading, error: categoryError, reload: reloadCategories } = useBookCategories(false);
  // If the draft was created but the submit step failed, retry only the submit (no duplicate drafts).
  const [draftBookId, setDraftBookId] = useState<string | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    language: "",
    category: "",
    synopsis: "",
    targetAudience: "",
    estimatedWordCount: "",
    previouslyPublished: false,
  });

  // Step 1: Fetch live publish packages from GET /api/publish-packages
  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        // Same packages, in the same order, as the Publish page.
        const arr = await fetchPublicPackages();
        setPackages(arr);
        // The Publish page links here with ?packageId=<_id> for the card the author chose.
        const requested = new URLSearchParams(window.location.search).get("packageId");
        // Without a chosen card the author must pick: defaulting to the first package would
        // silently submit a package they never chose.
        const preselected = arr.find((p) => p._id === requested);
        if (preselected) {
          setSelectedPackageId(preselected._id || "");
        }
      } catch (err) {
        console.warn("Failed to load publish packages:", describeApiError(err));
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const problem = manuscriptFileError(selectedFile);
      if (problem) {
        toast.error(problem);
        return;
      }
      setFile(selectedFile);
      setUploadedFileUrl("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pending.current || needsReconciliation) return;
    if (!packages.some((item) => item._id === selectedPackageId)) {
      toast.error("Choose an available publishing package.");
      return;
    }

    if (!formData.title.trim() || !formData.category || categoryError || categoriesLoading || !formData.synopsis.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const wordCount = formData.estimatedWordCount.trim() ? Number(formData.estimatedWordCount) : undefined;
    if (wordCount !== undefined && (!Number.isSafeInteger(wordCount) || wordCount < 1)) {
      toast.error("Please enter the manuscript's word count.");
      return;
    }

    if (!file) {
      toast.error("Please upload your manuscript");
      return;
    }

    if (!terms.ready) return;
    const invalidLanguage = bookLanguageError(formData.language);
    if (invalidLanguage) { toast.error(invalidLanguage); return; }
    setLanguageError(undefined);

    pending.current = true;
    setUploadPercent(null);
    setIsLoading(true);
    let createdId = draftBookId;
    let operation: "upload" | "create" | "submit" = "upload";

    // Documented author publishing flow (handover sections 39-45):
    //   upload document -> POST /authors/me/books (draft) -> POST /authors/me/books/{id}/submit
    // The legacy POST /publish-requests is NOT used: it creates a request the author can
    // never list, so submissions vanished from the Manuscripts page.
    try {
      if (!await terms.confirm()) return;
      // 1. Upload manuscript (field name "document"; response data.url)
      let fileUrl = uploadedFileUrl;
      if (!fileUrl) {
        fileUrl = await uploadAuthorManuscript(file, setUploadPercent);
        setUploadedFileUrl(fileUrl);
      }

      const category = (await fetchBackendCategories(true)).find((c) => c._id === formData.category);
      if (!category) throw new Error("The selected category is no longer available. Refresh categories and select again.");

      // 2. Create the draft once. Fields outside the backend schema go into the
      //    description so the editorial team still sees them.
      const language = normalizeBookLanguage(formData.language);
      let bookId = draftBookId;
      if (!bookId) {
        const extraLines = [
          formData.targetAudience.trim() && `Target audience: ${formData.targetAudience.trim()}`,
          formData.previouslyPublished && "Previously published: yes",
        ].filter(Boolean);
        const description = [formData.synopsis.trim(), ...extraLines].join("\n\n");

        operation = "create";
        const createRes = await api.post("/authors/me/books", {
          title: formData.title.trim(),
          language,
          description,
          category: formData.category,
        });
        const created = createRes.data?.data?.book || createRes.data?.data || createRes.data?.book || createRes.data;
        bookId = created?._id || created?.id || null;
        if (!bookId) throw new Error("Draft was created but no book id was returned. Check Manuscripts before retrying.");
        createdId = bookId;
        setDraftBookId(bookId);
      }

      if (language) await verifyAuthorBookLanguage(bookId, language);

      // 3. Submit the draft for editorial review
      operation = "submit";
      await submitAuthorManuscript(bookId, {
        fileUrl,
        genre: category.name,
        wordCount,
        packageId: selectedPackageId,
      });

      toast.success("Manuscript submitted for editorial review! 📚");
      router.push("/author/manuscripts");
    } catch (caughtError) {
      if (operation === "submit" && termsConflict(caughtError)) { await terms.refresh(); toast.error("Review the current publishing terms before trying again."); return; }
      const fieldError = bookLanguageApiError(caughtError);
      if (fieldError) { setLanguageError(fieldError); toast.error(fieldError); return; }
      const error = describeApiError(caughtError);
      const message = error?.response?.data?.message || error?.message || "Failed to submit manuscript request.";
      const status = error.response?.status;
      const ambiguous = operation !== "upload" && (!status || status >= 500 || status === 408 || status === 409);
      setNeedsReconciliation(ambiguous);
      toast.error(ambiguous ? "The submission could not be confirmed. Check Manuscripts before making another submission." : createdId ? `${message} Your draft was saved.` : message);
    } finally {
      pending.current = false;
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold lg:text-3xl">Submit New Manuscript</h1>
        <p className="text-muted-foreground mt-1">
          Fill in the details and upload your manuscript for review
        </p>
      </div>

      <form onSubmit={handleSubmit} aria-busy={isLoading}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Manuscript Details</CardTitle>
                  <CardDescription>
                    Provide information about your manuscript
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      readOnly={Boolean(draftBookId) || isLoading}
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter manuscript title"
                    />
                  </div>
                  <BookLanguageField value={formData.language} readOnly={Boolean(draftBookId) || isLoading} serverError={languageError}
                    onChange={(event) => { setLanguageError(undefined); handleChange(event); }} />

                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      disabled={categoriesLoading || categoryError || Boolean(draftBookId) || isLoading}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select a category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat._id} value={cat._id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {categoryError && <p role="alert" className="text-xs text-rose-700">Could not load categories. <button type="button" className="underline" onClick={() => void reloadCategories()}>Retry</button></p>}
                    {!categoriesLoading && !categoryError && categories.length === 0 && <p className="text-xs text-muted-foreground">No active categories are available. Please contact the publisher.</p>}

                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publishPackage">
                      Publishing Package <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={selectedPackageId}
                      onValueChange={setSelectedPackageId}
                      disabled={loadingPackages}
                    >
                      <SelectTrigger id="publishPackage">
                        <SelectValue placeholder={loadingPackages ? "Loading packages..." : "Select a publishing package"} />
                      </SelectTrigger>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg._id || ""} value={pkg._id || ""}>
                            {pkg.name} — ₹{Number(pkg.price || 0).toLocaleString("en-IN")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {packages.length > 0 && selectedPackageId && (
                      <p className="text-xs text-muted-foreground">
                        {packages.find((p) => p._id === selectedPackageId)?.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="synopsis">
                      Synopsis <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="synopsis"
                      readOnly={Boolean(draftBookId) || isLoading}
                      name="synopsis"
                      value={formData.synopsis}
                      onChange={handleChange}
                      placeholder="Write a brief synopsis of your manuscript (500-1000 words)"
                      rows={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      {formData.synopsis.length} characters
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Target Audience</Label>
                      <Input
                        id="targetAudience"
                        name="targetAudience"
                        value={formData.targetAudience}
                        onChange={handleChange}
                        placeholder="e.g., Young Adults, Professionals"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedWordCount">
                        Estimated word count (optional)
                      </Label>
                      <Input
                        id="estimatedWordCount"
                        name="estimatedWordCount"
                        type="number"
                        min={1}
                        value={formData.estimatedWordCount}
                        onChange={handleChange}
                        placeholder="e.g., 50000"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="previouslyPublished"
                      checked={formData.previouslyPublished}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          previouslyPublished: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="previouslyPublished" className="font-normal">
                      This manuscript has been previously published
                    </Label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Upload Manuscript</CardTitle>
                  <CardDescription>
                    Upload your manuscript file (PDF or Word document, max 25MB)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!file ? (
                    <label
                      htmlFor="manuscript"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF or Word document (max 25MB)
                        </p>
                      </div>
                      <input
                        id="manuscript"
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-10 w-10 text-primary" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        aria-label="Remove selected file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Submission Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Before submitting, please ensure:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Your manuscript is complete and edited</li>
                    <li>Title page includes your name and contact</li>
                    <li>Standard formatting (12pt font, double-spaced)</li>
                    <li>No plagiarized or copyrighted content</li>
                    <li>Synopsis accurately represents your work</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Check Manuscripts for your submission status and editorial feedback.
                </AlertDescription>
              </Alert>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardContent className="p-6 space-y-4">
                  <PublishingTermsField terms={terms} disabled={isLoading} />
                  {isLoading && uploadPercent !== null && <p role="status" className="text-sm">File upload {uploadPercent}%</p>}
                  {needsReconciliation && <Link href="/author/manuscripts" className="inline-flex min-h-11 items-center underline">Check Manuscripts</Link>}
                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={!terms.ready || isLoading || needsReconciliation}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Submit Manuscript
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </form>
    </div>
  );
}
