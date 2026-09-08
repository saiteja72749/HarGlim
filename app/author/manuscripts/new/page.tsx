"use client";

import { useState, useEffect } from "react";
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
import api from "@/lib/api";

const categories = [
  "Fiction",
  "Non-Fiction",
  "Technology",
  "Business",
  "Self-Help",
  "Literature",
  "Finance",
  "Science",
  "History",
  "Biography",
  "Poetry",
  "Children",
];

export default function NewManuscriptPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [loadingPackages, setLoadingPackages] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    synopsis: "",
    targetAudience: "",
    estimatedWordCount: "",
    previouslyPublished: false,
    agreeToTerms: false,
  });

  // Step 1: Fetch live publish packages from GET /api/publish-packages
  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        const res = await api.get("/publish-packages");
        const list = res.data?.data || res.data || [];
        const arr = Array.isArray(list) ? list : [];
        setPackages(arr);
        if (arr.length > 0) {
          setSelectedPackageId(arr[0]._id || arr[0].id);
        }
      } catch (err) {
        console.warn("Failed to load publish packages:", err);
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
      if (
        !["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(
          selectedFile.type
        )
      ) {
        toast.error("Please upload a PDF or Word document");
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.category || !formData.synopsis.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedPackageId) {
      toast.error("Please select a valid publishing package");
      return;
    }

    if (!file) {
      toast.error("Please upload your manuscript");
      return;
    }

    if (!formData.agreeToTerms) {
      toast.error("Please agree to the terms and conditions");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Upload manuscript file (Single file field named 'document')
      let fileUrl = "";
      try {
        const formDataUpload = new FormData();
        formDataUpload.append("document", file);

        const uploadRes = await api
          .post("/uploads/document", formDataUpload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .catch(() =>
            api.post("/authors/me/uploads/document", formDataUpload, {
              headers: { "Content-Type": "multipart/form-data" },
            })
          );

        fileUrl =
          uploadRes?.data?.data?.url ||
          uploadRes?.data?.url ||
          uploadRes?.data?.data?.fileUrl ||
          uploadRes?.data?.fileUrl ||
          "";

        if (!fileUrl) {
          throw new Error("Could not retrieve file URL from manuscript upload.");
        }
      } catch (uploadErr: any) {
        console.error("Document file upload error:", uploadErr);
        throw new Error(
          uploadErr?.response?.data?.message || "Failed to upload manuscript document file."
        );
      }

      // 2. Submit Publish Request (POST /api/publish-requests with real package ObjectId)
      const numericWordCount = formData.estimatedWordCount
        ? Math.max(1, Number(formData.estimatedWordCount))
        : 50000;

      const publishPayload = {
        title: formData.title.trim(),
        genre: formData.category,
        wordCount: numericWordCount,
        packageId: selectedPackageId,
        fileUrl,
      };

      const publishRes = await api.post("/publish-requests", publishPayload);

      if (publishRes.data?.success || publishRes.status === 201 || publishRes.status === 200) {
        toast.success("Manuscript submitted successfully for editorial review! 📚");
        router.push("/author/manuscripts");
      } else {
        throw new Error(publishRes.data?.message || "Failed to submit publish request.");
      }
    } catch (error: any) {
      console.error("Manuscript submission failed:", error);
      toast.error(error?.response?.data?.message || error?.message || "Failed to submit manuscript request.");
    } finally {
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

      <form onSubmit={handleSubmit}>
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
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Enter manuscript title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                          <SelectItem key={pkg._id || pkg.id} value={pkg._id || pkg.id}>
                            {pkg.name} — ₹{(pkg.price || 0).toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {packages.length > 0 && selectedPackageId && (
                      <p className="text-xs text-muted-foreground">
                        {packages.find((p) => (p._id || p.id) === selectedPackageId)?.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="synopsis">
                      Synopsis <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="synopsis"
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
                        Estimated Word Count
                      </Label>
                      <Input
                        id="estimatedWordCount"
                        name="estimatedWordCount"
                        type="number"
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
                    Upload your manuscript file (PDF or Word document, max 50MB)
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
                          PDF or Word document (max 50MB)
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
                  Review typically takes 2-4 weeks. You&apos;ll receive email
                  updates on your manuscript status.
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
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          agreeToTerms: checked as boolean,
                        })
                      }
                    />
                    <Label
                      htmlFor="agreeToTerms"
                      className="font-normal text-sm leading-relaxed"
                    >
                      <span>
                        I agree to the{" "}
                        <a href="#" className="text-primary hover:underline">
                          Terms and Conditions
                        </a>{" "}
                        and confirm this is my original work
                      </span>
                    </Label>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={isLoading}
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
