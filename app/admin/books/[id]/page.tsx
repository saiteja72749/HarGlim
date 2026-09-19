"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/lib/api";
import { getBookAuthorInfo } from "@/lib/utils";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

export const BISAC_CATEGORIES = [
  "Antiques & Collectibles",
  "Architecture",
  "Art",
  "Bibles",
  "Biography & Autobiography",
  "Body, Mind & Spirit",
  "Business & Economics",
  "Comics & Graphic Novels",
  "Computers",
  "Cooking",
  "Crafts & Hobbies",
  "Design",
  "Drama",
  "Education",
  "Family & Relationships",
  "Fiction",
  "Foreign Language Study",
  "Games & Activities",
  "Gardening",
  "Health & Fitness",
  "History",
  "House & Home",
  "Humor",
  "Juvenile Fiction",
  "Juvenile Nonfiction",
  "Language Arts & Disciplines",
  "Language Study",
  "Law",
  "Literary Collections",
  "Literary Criticism",
  "Mathematics",
  "Medical",
  "Mind, Body, Spirit",
  "Music",
  "Nature",
  "Performing Arts",
  "Pets",
  "Philosophy",
  "Photography",
  "Poetry",
  "Political Science",
  "Psychology",
  "Reference",
  "Religion",
  "Science",
  "Self-Help",
  "Social Science",
  "Sports & Recreation",
  "Study Aids",
  "Technology & Engineering",
  "Transportation",
  "Travel",
  "True Crime",
  "Young Adult Fiction",
  "Young Adult Nonfiction",
  "Non-Classifiable",
];

type AuthorType = "existing" | "new" | "external";

export default function EditBookPage() {
  const router = useRouter();
  const routeParams = useParams();
  const bookId = (routeParams?.id as string) || "";

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Author Mode & Details
  const [authorType, setAuthorType] = useState<AuthorType>("existing");
  const [authorsList, setAuthorsList] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>("");
  const [selectedAuthorName, setSelectedAuthorName] = useState<string>("");
  const [externalAuthorName, setExternalAuthorName] = useState<string>("");
  const [newAuthorName, setNewAuthorName] = useState<string>("");
  const [newAuthorEmail, setNewAuthorEmail] = useState<string>("");
  const [newAuthorBio, setNewAuthorBio] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    authorName: "",
    description: "",
    category: "",
    price: "",
    stock: "0",
    isbn: "",
    status: "published",
    format: "paperback",
    pages: "250",
    language: "English",
    isFeatured: false,
    isBestseller: false,
    isNewRelease: false,
    royaltyPercentage: "",
  });

  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    const loadCategoriesAndAuthors = async () => {
      try {
        const [catRes, usersRes, authorsRes] = await Promise.allSettled([
          api.get("/categories").catch(() => api.get("/admin/categories")),
          api.get("/admin/users", { params: { limit: 100 } }),
          api.get("/authors", { params: { limit: 100 } }),
        ]);

        if (catRes.status === "fulfilled" && catRes.value?.data) {
          const cData = catRes.value.data;
          const items = cData?.data?.categories || cData?.data || cData || [];
          setCategoriesList(Array.isArray(items) ? items : []);
        }

        const authorsMap = new Map<string, any>();

        if (usersRes.status === "fulfilled" && usersRes.value?.data) {
          const uData = usersRes.value.data;
          const uList = uData?.data?.users || (Array.isArray(uData?.data) ? uData.data : []) || (Array.isArray(uData) ? uData : []);
          if (Array.isArray(uList)) {
            uList.forEach((u: any) => {
              const id = u._id || u.id;
              if (id) {
                authorsMap.set(String(id), {
                  _id: String(id),
                  name: u.name || u.fullName || u.email || "Registered User",
                  email: u.email || "",
                  role: u.role || "user",
                });
              }
            });
          }
        }

        if (authorsRes.status === "fulfilled" && authorsRes.value?.data) {
          const aData = authorsRes.value.data;
          const aList = aData?.data?.authors || aData?.authors || (Array.isArray(aData?.data) ? aData.data : []) || (Array.isArray(aData) ? aData : []);
          if (Array.isArray(aList)) {
            aList.forEach((a: any) => {
              const userId = a.user?._id || a.user?.id || a.userId || a._id || a.id;
              const aName = a.name || a.user?.name || a.fullName;
              if (userId && aName) {
                if (authorsMap.has(String(userId))) {
                  const existing = authorsMap.get(String(userId));
                  authorsMap.set(String(userId), { ...existing, name: aName, role: "author" });
                } else {
                  authorsMap.set(String(userId), {
                    _id: String(userId),
                    name: aName,
                    email: a.email || a.user?.email || "",
                    role: "author",
                  });
                }
              }
            });
          }
        }

        const combined = Array.from(authorsMap.values());
        combined.sort((a, b) => {
          const aIsAuthor = a.role === "author" ? 0 : 1;
          const bIsAuthor = b.role === "author" ? 0 : 1;
          if (aIsAuthor !== bIsAuthor) return aIsAuthor - bIsAuthor;
          return (a.name || "").localeCompare(b.name || "");
        });

        setAuthorsList(combined);
      } catch (err: any) {
        console.warn("Failed to load categories and authors:", err);
      }
    };
    loadCategoriesAndAuthors();
  }, []);

  useEffect(() => {
    if (!bookId) return;

    const fetchBook = async () => {
      setFetching(true);
      try {
        let bookData: any = null;

        // Tier 1: Try /admin/books/:id
        const res1 = await api.get(`/admin/books/${bookId}`).catch(() => null);
        if (res1?.data) {
          bookData = res1.data.data || res1.data;
        }

        // Tier 2: Try /books/:id
        if (!bookData) {
          const res2 = await api.get(`/books/${bookId}`).catch(() => null);
          if (res2?.data) {
            bookData = res2.data.data || res2.data;
          }
        }

        // Tier 3: Search list in /books
        if (!bookData) {
          const res3 = await api.get(`/books?limit=100`).catch(() => null);
          const list = res3?.data?.data?.books || res3?.data?.data || res3?.data || [];
          if (Array.isArray(list)) {
            bookData = list.find(
              (b: any) => (b._id || b.id) === bookId || b.slug === bookId
            );
          }
        }

        if (bookData) {
          const authorInfo = getBookAuthorInfo(bookData);
          const resolvedAuthorName = authorInfo.name;

          const extractedAuthorId =
            typeof bookData.author === "object" && bookData.author !== null
              ? bookData.author._id || bookData.author.id || ""
              : typeof bookData.author === "string" && /^[0-9a-fA-F]{24}$/.test(bookData.author)
              ? bookData.author
              : "";

          if (extractedAuthorId) {
            setSelectedAuthorId(extractedAuthorId);
          }

          // Determine initial author mode
          if (!authorInfo.hasProfile || resolvedAuthorName.includes("Biswas") || !extractedAuthorId) {
            setAuthorType("external");
            setExternalAuthorName(resolvedAuthorName);
          } else {
            setAuthorType("existing");
            setSelectedAuthorName(resolvedAuthorName);
          }

          setFormData({
            title: bookData.title || "",
            authorName: resolvedAuthorName,
            description: bookData.description || "",
            category:
              typeof bookData.category === "object"
                ? bookData.category?._id || bookData.category?.id || ""
                : bookData.category || "",
            price: (bookData.mrp || bookData.price)?.toString() || "",
            stock: bookData.stock?.toString() || "0",
            isbn: bookData.isbn || "",
            status: bookData.status === "Active" ? "published" : (bookData.status || "published"),
            format: bookData.format || "paperback",
            pages: bookData.pages?.toString() || "250",
            language: bookData.language || "English",
            isFeatured: Boolean(bookData.isFeatured),
            isBestseller: Boolean(bookData.isBestseller),
            isNewRelease: Boolean(bookData.isNewRelease),
            royaltyPercentage: bookData.royaltyPercentage?.toString() || "",
          });
        } else {
          toast.error("Book not found in database.");
        }
      } catch (err: any) {
        console.error("Failed to fetch book details:", err);
        toast.error("Could not load book data.");
      } finally {
        setFetching(false);
      }
    };

    fetchBook();
  }, [bookId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. RESOLVE AUTHOR
      let finalAuthorId: string | null = null;
      let targetAuthorDisplayName = "";

      if (authorType === "existing") {
        if (!selectedAuthorId) {
          toast.error("Please select an existing author from the dropdown.");
          setLoading(false);
          return;
        }
        finalAuthorId = selectedAuthorId;
        const found = authorsList.find((a) => (a._id || a.id) === selectedAuthorId);
        targetAuthorDisplayName = found?.name || selectedAuthorName || formData.authorName;
      } else if (authorType === "new") {
        targetAuthorDisplayName = newAuthorName.trim();
        if (!targetAuthorDisplayName) {
          toast.error("Please enter the new author's name.");
          setLoading(false);
          return;
        }

        // Try creating author profile via dedicated admin user endpoint (never use public register)
        const cleanSlug = targetAuthorDisplayName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "writer";
        const emailToUse = newAuthorEmail.trim() || `author.${cleanSlug}.${Date.now().toString().slice(-4)}@harglim.internal`;
        const tempPassword = `Author#${Math.random().toString(36).slice(-6)}!Aa1`;

        try {
          const adminUserRes = await api.post("/admin/users", {
            name: targetAuthorDisplayName,
            email: emailToUse,
            password: tempPassword,
            role: "author",
            isActive: true,
          });
          const uData = adminUserRes?.data?.data?.user || adminUserRes?.data?.user || adminUserRes?.data?.data || adminUserRes?.data;
          finalAuthorId = uData?._id || uData?.id || null;
          if (finalAuthorId) {
            toast.success(`Author account created for "${targetAuthorDisplayName}"`);
          }
        } catch (adminErr: any) {
          console.warn("Admin user creation error:", adminErr?.message);
          finalAuthorId = selectedAuthorId || null;
        }
      } else {
        // External or Guest author - never call registration to prevent session disruption
        targetAuthorDisplayName = (externalAuthorName || formData.authorName || "").trim();
        if (!targetAuthorDisplayName) {
          toast.error("Please enter the author's name.");
          setLoading(false);
          return;
        }
        const existingByName = authorsList.find(
          (a) => a.name?.toLowerCase().trim() === targetAuthorDisplayName.toLowerCase()
        );
        if (existingByName && /^[0-9a-fA-F]{24}$/.test(existingByName._id || existingByName.id)) {
          finalAuthorId = existingByName._id || existingByName.id;
        } else if (selectedAuthorId && /^[0-9a-fA-F]{24}$/.test(selectedAuthorId)) {
          finalAuthorId = selectedAuthorId;
        }
      }

      // 2. COVER IMAGE UPLOAD (IF NEW IMAGE ATTACHED)
      let coverImageUrl = undefined;
      if (imageFile) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append("image", imageFile);

          const uploadRes = await api.post("/uploads/image", uploadFormData, {
            headers: { "Content-Type": undefined },
          }).catch(() => api.post("/uploads/publishing-image", uploadFormData, {
            headers: { "Content-Type": undefined },
          }));

          coverImageUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url;
        } catch (uploadErr) {
          console.warn("Image upload warning:", uploadErr);
        }
      }

      // 3. CONSTRUCT STRICT CLEAN JSON PAYLOAD
      const numericPrice = Number(formData.price) || 0;
      const statusValue = formData.status === "Active" ? "published" : formData.status;

      const jsonPayload: any = {
        title: formData.title.trim(),
        authorName: targetAuthorDisplayName || undefined,
        description: formData.description.trim(),
        category: formData.category,
        mrp: numericPrice,
        price: numericPrice,
        stock: Number(formData.stock) || 0,
        isbn: formData.isbn.trim() || undefined,
        status: statusValue,
        format: formData.format || "paperback",
        pages: formData.pages ? Number(formData.pages) : 250,
        language: formData.language || "English",
        isFeatured: Boolean(formData.isFeatured),
        isBestseller: Boolean(formData.isBestseller),
        isNewRelease: Boolean(formData.isNewRelease),
        royaltyPercentage: formData.royaltyPercentage
          ? Number(formData.royaltyPercentage)
          : undefined,
      };

      if (finalAuthorId && /^[0-9a-fA-F]{24}$/.test(finalAuthorId)) {
        jsonPayload.author = finalAuthorId;
      }

      if (coverImageUrl) {
        jsonPayload.coverImage = coverImageUrl;
      }

      // Execute update with graceful fallback
      let updateSuccess = false;
      try {
        await api.put(`/admin/books/${bookId}`, jsonPayload);
        updateSuccess = true;
      } catch (putErr: any) {
        console.warn("Primary /admin/books put failed, trying /books fallback:", putErr?.message);
        try {
          await api.put(`/books/${bookId}`, jsonPayload);
          updateSuccess = true;
        } catch (fallbackErr: any) {
          throw putErr || fallbackErr;
        }
      }

      if (updateSuccess) {
        toast.success("Book updated successfully! 📚");
        router.push("/admin/books");
      }
    } catch (err) {
      console.error("Failed to update book:", err);
      const errMsg = (err as any)?.response?.data?.message || (err as any)?.message || "Failed to update book";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0F3D3E]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-[#0F3D3E]">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/books">
            <ArrowLeft className="h-5 w-5 text-[#0F3D3E]" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-bold lg:text-3xl text-[#0F3D3E]">Edit Book</h1>
          <p className="text-sm text-[#5C6E6E] mt-1 font-sans">
            Update author attribution, details, pricing, stock, and marketing flags
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* AUTHOR ATTRIBUTION CARD */}
        <Card className="bg-white border border-[#E2E6DF] shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="p-6 bg-[#F8F9F7] border-b border-[#E2E6DF]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-serif font-bold text-lg text-[#0F3D3E]">
                  Author Attribution & Details
                </CardTitle>
                <p className="text-xs text-[#5C6E6E] mt-0.5">
                  Specify whether this book is by a registered author, an external guest writer, or a new author profile.
                </p>
              </div>
              <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded bg-[#0F3D3E]/10 text-[#0F3D3E] uppercase">
                Required
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Author Mode Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setAuthorType("existing")}
                className={`flex items-center space-x-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none ${
                  authorType === "existing"
                    ? "border-[#0F3D3E] bg-[#0F3D3E]/5 shadow-xs"
                    : "border-[#E2E6DF] bg-[#F8F9F7] hover:bg-white hover:border-[#0F3D3E]/40"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    authorType === "existing" ? "border-[#0F3D3E]" : "border-[#5C6E6E]"
                  }`}
                >
                  {authorType === "existing" && <div className="h-2 w-2 rounded-full bg-[#0F3D3E]" />}
                </div>
                <div>
                  <span className="font-serif font-bold text-xs text-[#0F3D3E] block">
                    Existing Author
                  </span>
                  <span className="text-[10px] text-[#5C6E6E] block mt-0.5">
                    Select registered author
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAuthorType("external")}
                className={`flex items-center space-x-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none ${
                  authorType === "external"
                    ? "border-[#0F3D3E] bg-[#0F3D3E]/5 shadow-xs"
                    : "border-[#E2E6DF] bg-[#F8F9F7] hover:bg-white hover:border-[#0F3D3E]/40"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    authorType === "external" ? "border-[#0F3D3E]" : "border-[#5C6E6E]"
                  }`}
                >
                  {authorType === "external" && <div className="h-2 w-2 rounded-full bg-[#0F3D3E]" />}
                </div>
                <div>
                  <span className="font-serif font-bold text-xs text-[#0F3D3E] block">
                    External / Guest Author
                  </span>
                  <span className="text-[10px] text-[#5C6E6E] block mt-0.5">
                    Unregistered or co-authors
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAuthorType("new")}
                className={`flex items-center space-x-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer select-none ${
                  authorType === "new"
                    ? "border-[#0F3D3E] bg-[#0F3D3E]/5 shadow-xs"
                    : "border-[#E2E6DF] bg-[#F8F9F7] hover:bg-white hover:border-[#0F3D3E]/40"
                }`}
              >
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    authorType === "new" ? "border-[#0F3D3E]" : "border-[#5C6E6E]"
                  }`}
                >
                  {authorType === "new" && <div className="h-2 w-2 rounded-full bg-[#0F3D3E]" />}
                </div>
                <div>
                  <span className="font-serif font-bold text-xs text-[#0F3D3E] block">
                    New Author Account
                  </span>
                  <span className="text-[10px] text-[#5C6E6E] block mt-0.5">
                    Create new profile
                  </span>
                </div>
              </button>
            </div>

            {/* Dynamic Author Inputs */}
            {authorType === "existing" && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="existingAuthorSelect" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    Select Registered Author *
                  </Label>
                  <span className="text-[11px] text-[#5C6E6E]">
                    {authorsList.length} authors / users available
                  </span>
                </div>
                <Select
                  value={selectedAuthorId}
                  onValueChange={(val) => {
                    setSelectedAuthorId(val);
                    const found = authorsList.find((a) => (a._id || a.id) === val);
                    if (found) {
                      setSelectedAuthorName(found.name || "");
                      setFormData((prev) => ({ ...prev, authorName: found.name || "" }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-[#F8F9F7] border-[#E2E6DF] rounded-xl h-11 text-xs font-serif font-bold">
                    <SelectValue placeholder="Choose an author..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF] max-h-72">
                    {authorsList.map((a) => (
                      <SelectItem key={a._id || a.id} value={a._id || a.id} className="text-xs py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0F3D3E]">{a.name}</span>
                          {a.email && <span className="text-[#5C6E6E] text-[11px]">({a.email})</span>}
                          {a.role === "author" ? (
                            <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-700 rounded-md font-semibold">
                              Author
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-500/10 text-slate-600 rounded-md">
                              {a.role || "User"}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-[#5C6E6E] pt-1">
                  The book will be linked to this registered author profile and show in their public author page.
                </p>
              </div>
            )}

            {authorType === "external" && (
              <div className="space-y-3 pt-2 border-t border-[#E2E6DF]">
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-[11px] text-blue-800">
                  💡 External or guest authors will appear on the book cover and catalog without broken links to 404 pages.
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="externalAuthorName" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    External / Guest Author Name *
                  </Label>
                  <Input
                    id="externalAuthorName"
                    placeholder="e.g. Dr Arjita Biswas and Pretesh Biswas"
                    value={externalAuthorName}
                    onChange={(e) => {
                      setExternalAuthorName(e.target.value);
                      setFormData((prev) => ({ ...prev, authorName: e.target.value }));
                    }}
                    className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-bold"
                    required
                  />
                </div>
              </div>
            )}

            {authorType === "new" && (
              <div className="space-y-4 pt-2 border-t border-[#E2E6DF]">
                <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-800">
                  💡 A dedicated author profile and account will be created under this name with Author permissions.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAuthorName" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                      Author Name *
                    </Label>
                    <Input
                      id="newAuthorName"
                      placeholder="e.g. Dr. A.P. Sharma"
                      value={newAuthorName}
                      onChange={(e) => setNewAuthorName(e.target.value)}
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAuthorEmail" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                      Author Email (Optional)
                    </Label>
                    <Input
                      id="newAuthorEmail"
                      type="email"
                      placeholder="e.g. author@example.com"
                      value={newAuthorEmail}
                      onChange={(e) => setNewAuthorEmail(e.target.value)}
                      className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newAuthorBio" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                    Author Biography (Optional)
                  </Label>
                  <Textarea
                    id="newAuthorBio"
                    rows={3}
                    placeholder="Short summary of author's credentials..."
                    value={newAuthorBio}
                    onChange={(e) => setNewAuthorBio(e.target.value)}
                    className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-xs"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BOOK METADATA & DETAILS CARD */}
        <Card className="bg-white border border-[#E2E6DF] shadow-sm rounded-2xl">
          <CardHeader className="border-b border-[#E2E6DF] bg-[#F8F9F7]">
            <CardTitle className="font-serif font-bold text-lg text-[#0F3D3E]">
              Book Details & Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Book Title *
              </Label>
              <Input
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleInputChange}
                className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Description *
              </Label>
              <Textarea
                id="description"
                name="description"
                required
                rows={5}
                value={formData.description}
                onChange={handleInputChange}
                className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Category *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, category: val }))
                  }
                >
                  <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF] max-h-72">
                    {Array.from(new Set([
                      ...categoriesList.map((c: any) => c.name || c),
                      ...BISAC_CATEGORIES
                    ])).map((categoryName) => (
                      <SelectItem key={categoryName} value={categoryName}>
                        {categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  ISBN
                </Label>
                <Input
                  id="isbn"
                  name="isbn"
                  value={formData.isbn}
                  onChange={handleInputChange}
                  className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) =>
                    setFormData((prev) => ({ ...prev, status: val }))
                  }
                >
                  <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF]">
                    <SelectItem value="published">Published (Active)</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Price (₹) *
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  required
                  value={formData.price}
                  onChange={handleInputChange}
                  className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Stock *
                </Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={handleInputChange}
                  className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="format" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Format *
                </Label>
                <Select
                  value={formData.format}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, format: val }))}
                >
                  <SelectTrigger className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E2E6DF]">
                    <SelectItem value="paperback">Paperback</SelectItem>
                    <SelectItem value="hardcover">Hardcover</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pages" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Number of Pages *
                </Label>
                <Input
                  id="pages"
                  name="pages"
                  type="number"
                  min="1"
                  required
                  value={formData.pages}
                  onChange={handleInputChange}
                  placeholder="e.g. 250"
                  className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                  Language *
                </Label>
                <Input
                  id="language"
                  name="language"
                  required
                  value={formData.language}
                  onChange={handleInputChange}
                  placeholder="e.g. English, Hindi, Telugu"
                  className="bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-4 border border-[#E2E6DF] rounded-2xl p-5 bg-[#F8F9F7]">
              <h3 className="font-serif font-bold text-base text-[#0F3D3E]">
                Display & Marketing Badges
              </h3>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="isFeatured" className="flex flex-col space-y-1 cursor-pointer">
                    <span className="font-bold text-xs">Feature on Home</span>
                    <span className="font-normal text-[11px] text-[#5C6E6E]">Show in featured releases</span>
                  </Label>
                  <Switch
                    id="isFeatured"
                    checked={formData.isFeatured}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isFeatured: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="isBestseller" className="flex flex-col space-y-1 cursor-pointer">
                    <span className="font-bold text-xs text-[#D4AF37]">Bestseller</span>
                    <span className="font-normal text-[11px] text-[#5C6E6E]">Add bestseller badge</span>
                  </Label>
                  <Switch
                    id="isBestseller"
                    checked={formData.isBestseller}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isBestseller: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="isNewRelease" className="flex flex-col space-y-1 cursor-pointer">
                    <span className="font-bold text-xs text-emerald-700">New Release</span>
                    <span className="font-normal text-[11px] text-[#5C6E6E]">Add new release badge</span>
                  </Label>
                  <Switch
                    id="isNewRelease"
                    checked={formData.isNewRelease}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isNewRelease: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Cover Image (Upload New)
              </Label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#E2E6DF] rounded-2xl cursor-pointer bg-[#F8F9F7] hover:bg-[#F0F2ED] transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-[#5C6E6E]" />
                    <p className="mb-1 text-xs text-[#5C6E6E]">
                      <span className="font-bold text-[#0F3D3E]">Click to upload new cover</span> or drag and drop
                    </p>
                    <p className="text-[11px] text-[#5C6E6E]">
                      {imageFile ? imageFile.name : "Leave empty to retain current book cover"}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold h-12 px-8 rounded-xl shadow-xs"
              >
                {loading ? (
                  "Updating Book..."
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2 text-[#D4AF37]" />
                    Update Book Details
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
