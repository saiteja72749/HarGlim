"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSiteContent, SiteContent, defaultSiteContent } from "@/context/site-content-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  Save,
  RotateCcw,
  Home,
  Building2,
  BookOpen,
  HelpCircle,
  Megaphone,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";

export default function AdminContentPage() {
  const { content: globalContent, updateContent, resetContent, loading } = useSiteContent();
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState<SiteContent>(globalContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "contact" | "publish" | "about" | "admin-profile">("home");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (globalContent) {
      setFormData(globalContent);
    }
  }, [globalContent]);

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, GIF).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size should be less than 10MB.");
      return;
    }

    setIsUploadingPhoto(true);

    try {
      // 1. Try uploading to backend image upload endpoint
      const formDataUpload = new FormData();
      formDataUpload.append("image", file);

      // A failed upload stops here: a base64 image must never be saved into site content.
      const res = await api.post("/uploads/image", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = res?.data?.data?.url || res?.data?.url || "";
      if (!uploadedUrl) throw new Error("The upload finished but no image URL was returned.");

      // Persist to the admin's own profile (PATCH /users/me) before showing it as saved.
      await api.patch("/users/me", { profilePicture: uploadedUrl });

      // Update local state, SiteContent, and Auth Store user profile
      setFormData((prev) => ({ ...prev, adminProfileImage: uploadedUrl }));
      if (user) {
        setUser({
          ...user,
          profileImage: uploadedUrl,
          profilePicture: uploadedUrl,
        });
      }

      toast.success("Admin profile photo uploaded and saved.");
    } catch (err: any) {
      console.error("Failed to upload profile photo:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => ({ ...prev, adminProfileImage: "" }));
    if (user) {
      setUser({
        ...user,
        profileImage: "",
        profilePicture: "",
      });
    }
    toast.success("Admin profile picture removed.");
  };

  const handleSave = async () => {
    // Validate Packages JSON
    try {
      if (formData.packagesJson) {
        JSON.parse(formData.packagesJson);
      }
    } catch {
      toast.error("Invalid JSON in Publishing Packages. Check your syntax.");
      return;
    }

    // Validate FAQs JSON
    try {
      if (formData.faqsJson) {
        JSON.parse(formData.faqsJson);
      }
    } catch {
      toast.error("Invalid JSON in FAQ section. Check your syntax.");
      return;
    }

    setIsSaving(true);
    try {
      if (formData.adminProfileImage && user) {
        setUser({
          ...user,
          profileImage: formData.adminProfileImage,
          profilePicture: formData.adminProfileImage,
        });
      }
      await updateContent(formData);
      toast.success("Site content saved & updated live globally!");
    } catch (err) {
      console.error("Failed to update site content:", err);
      toast.error("Failed to save site content.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all site content to defaults?")) {
      resetContent();
      setFormData(defaultSiteContent);
      toast.success("Site content reset to original defaults.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl flex items-center gap-2 text-foreground font-serif">
            <Globe className="h-7 w-7 text-primary" />
            Global Site Content Editor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Edit text across the website. Click save to publish changes live instantly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleReset} size="sm" className="gap-1.5 text-xs">
            <RotateCcw className="h-4 w-4" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-primary text-primary-foreground font-bold shadow-md">
            <Save className="h-4 w-4" />
            {isSaving ? "Publishing..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-2 sm:gap-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "home"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Home & Announcement</span>
        </button>

        <button
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "contact"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Contact & Company</span>
        </button>

        <button
          onClick={() => setActiveTab("publish")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "publish"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Publish & Guidelines</span>
        </button>

        <button
          onClick={() => setActiveTab("about")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "about"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span>About Us & FAQs</span>
        </button>

        <button
          onClick={() => setActiveTab("admin-profile")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "admin-profile"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera className="h-4 w-4 text-[#D4AF37]" />
          <span>Admin Profile Photo</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* ---------------- TAB 1: HOME & ANNOUNCEMENT ---------------- */}
      {activeTab === "home" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="h-5 w-5 text-primary" />
                Global Top Announcement Bar
              </CardTitle>
              <CardDescription>
                Promotional banner text displayed across the website header.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
                <Label htmlFor="announcementActive" className="cursor-pointer font-medium">
                  Enable Announcement Banner
                </Label>
                <Switch
                  id="announcementActive"
                  checked={formData.announcementActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, announcementActive: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="announcementText">Announcement Message</Label>
                <Input
                  id="announcementText"
                  value={formData.announcementText}
                  onChange={(e) =>
                    setFormData({ ...formData, announcementText: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Home Hero Section</CardTitle>
              <CardDescription>Main title and call to action on the landing page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homeTitle">Hero Title</Label>
                <Textarea
                  id="homeTitle"
                  rows={2}
                  value={formData.homeTitle}
                  onChange={(e) => setFormData({ ...formData, homeTitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeSubtitle">Hero Subtitle</Label>
                <Textarea
                  id="homeSubtitle"
                  rows={3}
                  value={formData.homeSubtitle}
                  onChange={(e) => setFormData({ ...formData, homeSubtitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeHeroCtaText">Hero Catalog CTA Button Text</Label>
                <Input
                  id="homeHeroCtaText"
                  value={formData.homeHeroCtaText}
                  onChange={(e) => setFormData({ ...formData, homeHeroCtaText: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Section Titles & Banners</CardTitle>
              <CardDescription>Custom headings for bookstore sections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homeFeaturedTitle">Featured Section Heading</Label>
                  <Input
                    id="homeFeaturedTitle"
                    value={formData.homeFeaturedTitle}
                    onChange={(e) => setFormData({ ...formData, homeFeaturedTitle: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="homeBestsellerTitle">Bestsellers Section Heading</Label>
                  <Input
                    id="homeBestsellerTitle"
                    value={formData.homeBestsellerTitle}
                    onChange={(e) => setFormData({ ...formData, homeBestsellerTitle: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="homeCtaHeading">Bottom Banner Heading</Label>
                <Input
                  id="homeCtaHeading"
                  value={formData.homeCtaHeading}
                  onChange={(e) => setFormData({ ...formData, homeCtaHeading: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeCtaSubtitle">Bottom Banner Subtitle</Label>
                <Input
                  id="homeCtaSubtitle"
                  value={formData.homeCtaSubtitle}
                  onChange={(e) => setFormData({ ...formData, homeCtaSubtitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeCtaButtonText">Bottom Banner Button Text</Label>
                <Input
                  id="homeCtaButtonText"
                  value={formData.homeCtaButtonText}
                  onChange={(e) => setFormData({ ...formData, homeCtaButtonText: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- TAB 2: CONTACT & COMPANY ---------------- */}
      {activeTab === "contact" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
              <CardDescription>Primary company contact details shown on the Contact page & Footer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Primary Phone Number</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactHours">Working Hours</Label>
                  <Input
                    id="contactHours"
                    value={formData.contactHours}
                    onChange={(e) => setFormData({ ...formData, contactHours: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">General Email</Label>
                  <Input
                    id="contactEmail"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactSupportEmail">Support Email</Label>
                  <Input
                    id="contactSupportEmail"
                    value={formData.contactSupportEmail}
                    onChange={(e) => setFormData({ ...formData, contactSupportEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactAddressLine1">Address Line 1</Label>
                <Input
                  id="contactAddressLine1"
                  value={formData.contactAddressLine1}
                  onChange={(e) => setFormData({ ...formData, contactAddressLine1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactAddressLine2">Address Line 2</Label>
                <Input
                  id="contactAddressLine2"
                  value={formData.contactAddressLine2}
                  onChange={(e) => setFormData({ ...formData, contactAddressLine2: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Media Links</CardTitle>
              <CardDescription>Social media profile URLs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="socialFacebook">Facebook URL</Label>
                  <Input
                    id="socialFacebook"
                    value={formData.socialFacebook}
                    onChange={(e) => setFormData({ ...formData, socialFacebook: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialTwitter">Twitter / X URL</Label>
                  <Input
                    id="socialTwitter"
                    value={formData.socialTwitter}
                    onChange={(e) => setFormData({ ...formData, socialTwitter: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialInstagram">Instagram URL</Label>
                  <Input
                    id="socialInstagram"
                    value={formData.socialInstagram}
                    onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="socialLinkedin">LinkedIn URL</Label>
                  <Input
                    id="socialLinkedin"
                    value={formData.socialLinkedin}
                    onChange={(e) => setFormData({ ...formData, socialLinkedin: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- TAB 3: PUBLISH & GUIDELINES ---------------- */}
      {activeTab === "publish" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Publish With Us Header</CardTitle>
              <CardDescription>Hero text on the Publish page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publishTitle">Publish Hero Title</Label>
                <Input
                  id="publishTitle"
                  value={formData.publishTitle}
                  onChange={(e) => setFormData({ ...formData, publishTitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="publishSubtitle">Publish Hero Subtitle</Label>
                <Textarea
                  id="publishSubtitle"
                  rows={2}
                  value={formData.publishSubtitle}
                  onChange={(e) => setFormData({ ...formData, publishSubtitle: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Publishing Packages (JSON Format)</CardTitle>
                <CardDescription>
                  Display copy only. The Publish page shows it only while no real package exists. Packages authors can
                  select (and that are saved on manuscripts) are managed in{" "}
                  <a href="/admin/packages" className="font-semibold text-[#8A6D1E] underline underline-offset-2">
                    Publishing Packages
                  </a>
                  .
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 hover:bg-amber-500/20"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      packagesJson: defaultSiteContent.packagesJson,
                    }));
                    toast.success("Loaded official HarGlim 6 packages (₹999 to ₹9,999) into editor!");
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Pre-fill HarGlim Official Packages
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(formData.packagesJson);
                      setFormData((prev) => ({
                        ...prev,
                        packagesJson: JSON.stringify(parsed, null, 2),
                      }));
                      toast.success("JSON formatted successfully!");
                    } catch (err: any) {
                      toast.error("Cannot format: Invalid JSON syntax (" + err.message + ")");
                    }
                  }}
                >
                  Format JSON
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                let isValid = true;
                let errorMsg = "";
                let count = 0;
                try {
                  const parsed = JSON.parse(formData.packagesJson);
                  if (Array.isArray(parsed)) {
                    count = parsed.length;
                  } else {
                    isValid = false;
                    errorMsg = "Root JSON must be an array of package objects";
                  }
                } catch (e: any) {
                  isValid = false;
                  errorMsg = e.message;
                }

                return (
                  <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border bg-muted/40 font-mono">
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${isValid ? "bg-emerald-500" : "bg-destructive animate-pulse"}`} />
                      <span>Syntax Status: {isValid ? `Valid JSON (${count} packages configured)` : `Invalid JSON Syntax`}</span>
                    </span>
                    {!isValid && <span className="text-destructive font-semibold truncate max-w-xs">{errorMsg}</span>}
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Textarea
                  id="packagesJson"
                  rows={14}
                  className="font-mono text-xs bg-muted/30 border border-input focus:ring-1"
                  value={formData.packagesJson}
                  onChange={(e) => setFormData({ ...formData, packagesJson: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Author Guidelines & Royalties</CardTitle>
              <CardDescription>Summary text on royalty info and manuscript guidelines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="royaltySummary">Royalty Policy Summary</Label>
                <Textarea
                  id="royaltySummary"
                  rows={2}
                  value={formData.royaltySummary}
                  onChange={(e) => setFormData({ ...formData, royaltySummary: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="authorGuidelinesText">Author Submission Guidelines</Label>
                <Textarea
                  id="authorGuidelinesText"
                  rows={3}
                  value={formData.authorGuidelinesText}
                  onChange={(e) => setFormData({ ...formData, authorGuidelinesText: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- TAB 4: ABOUT US & FAQS ---------------- */}
      {activeTab === "about" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About Us Content</CardTitle>
              <CardDescription>Main title, mission, and vision on the About page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aboutTitle">About Page Title</Label>
                <Input
                  id="aboutTitle"
                  value={formData.aboutTitle}
                  onChange={(e) => setFormData({ ...formData, aboutTitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aboutSubtitle">Tagline / Subtitle</Label>
                <Input
                  id="aboutSubtitle"
                  value={formData.aboutSubtitle}
                  onChange={(e) => setFormData({ ...formData, aboutSubtitle: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aboutMission">Mission Statement</Label>
                <Textarea
                  id="aboutMission"
                  rows={3}
                  value={formData.aboutMission}
                  onChange={(e) => setFormData({ ...formData, aboutMission: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aboutVision">Vision Statement</Label>
                <Textarea
                  id="aboutVision"
                  rows={3}
                  value={formData.aboutVision}
                  onChange={(e) => setFormData({ ...formData, aboutVision: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions (JSON Format)</CardTitle>
              <CardDescription>JSON array of questions and answers for the FAQ page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  id="faqsJson"
                  rows={10}
                  className="font-mono text-xs bg-muted/30"
                  value={formData.faqsJson}
                  onChange={(e) => setFormData({ ...formData, faqsJson: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------- TAB 5: ADMIN PROFILE PHOTO ---------------- */}
      {activeTab === "admin-profile" && (
        <div className="space-y-6">
          <Card className="border-primary/20 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-serif text-foreground">
                <Camera className="h-6 w-6 text-[#D4AF37]" />
                Admin Profile Picture Upload
              </CardTitle>
              <CardDescription>
                Upload and update your admin profile picture. Your photo will be displayed across the admin panel sidebar, navigation header, and operations dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handlePhotoFileChange}
                className="hidden"
              />

              {/* Avatar Preview Box */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-muted/30 border border-border">
                <div className="relative group">
                  <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#0F3D3E] text-[#D4AF37] font-serif font-bold text-3xl shadow-lg overflow-hidden border-4 border-[#D4AF37]">
                    {formData.adminProfileImage || user?.profileImage || user?.profilePicture ? (
                      <Image
                        src={formData.adminProfileImage || user?.profileImage || user?.profilePicture || ""}
                        alt="Admin Profile"
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      user?.name?.charAt(0).toUpperCase() || "A"
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute bottom-0 right-0 p-2.5 rounded-full bg-[#D4AF37] text-[#0F3D3E] hover:bg-[#C29F2F] shadow-md transition-transform group-hover:scale-110"
                    title="Change Photo"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg font-bold text-foreground">{user?.name || "Administrator"}</h3>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-[#D4AF37]/20 text-[#0F3D3E] border border-[#D4AF37]/40">
                      Super Admin
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{user?.email || "admin@harglimpublishers.com"}</p>
                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 justify-center sm:justify-start">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Profile Photo Active & Saved</span>
                  </p>

                  {/* Upload Action Buttons */}
                  <div className="pt-2 flex flex-wrap gap-3 justify-center sm:justify-start">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="gap-2 bg-[#0F3D3E] hover:bg-[#174C4D] text-white text-xs font-bold"
                    >
                      {isUploadingPhoto ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Upload Photo from Device</span>
                        </>
                      )}
                    </Button>

                    {(formData.adminProfileImage || user?.profileImage || user?.profilePicture) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRemovePhoto}
                        className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Photo</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Alternative: Image URL Input */}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="adminProfileImage" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Or Paste Direct Profile Photo URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="adminProfileImage"
                    type="url"
                    placeholder="https://example.com/admin-photo.jpg"
                    value={formData.adminProfileImage || ""}
                    onChange={(e) => {
                      const newUrl = e.target.value;
                      setFormData({ ...formData, adminProfileImage: newUrl });
                      if (user) {
                        setUser({ ...user, profileImage: newUrl, profilePicture: newUrl });
                      }
                    }}
                    className="text-xs font-mono"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Supports PNG, JPG, WEBP, and GIF images. Max recommended resolution: 800x800 px.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

