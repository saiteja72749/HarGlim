"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  PenTool,
  CheckCircle2,
  UserCircle,
  Mail,
  Phone,
  Sparkles,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function BecomeAuthorPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const [formData, setFormData] = useState({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: "",
    penName: "",
    bio: "",
    portfolioUrl: "",
    experience: "",
  });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  // Check backend application status
  const checkStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await api.get("/users/me/author-application").catch(() =>
        api.get("/author-applications/me")
      );
      const data = res.data;
      const app = data?.data || data?.application || (Array.isArray(data) ? data[0] : data);
      if (app && (app.status || app.state)) {
        const rawStatus = (app.status || app.state || "").toLowerCase();
        setApplicationStatus(
          rawStatus === "approved" || rawStatus === "accepted"
            ? "approved"
            : rawStatus === "rejected" || rawStatus === "declined"
            ? "rejected"
            : rawStatus === "pending"
            ? "pending"
            : "none"
        );
        if (app.rejectionReason || app.adminNotes || app.reason || app.feedback) {
          setRejectionReason(app.rejectionReason || app.adminNotes || app.reason || app.feedback);
        }
      }
    } catch {
      setApplicationStatus("none");
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()) {
      toast.error("Please fill in your Full Name, Email Address, and Phone Number.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      penName: formData.penName || formData.fullName,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      bio: formData.bio,
      portfolioUrl: formData.portfolioUrl,
      experience: formData.experience,
    };

    try {
      await api.post("/author-applications", payload);

      toast.success("Author application submitted successfully!");
      setApplicationStatus("pending");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F3D3E]"></div>
      </div>
    );
  }

  // STATE 3: APPROVED (Already Author)
  if (user?.role === "author" || applicationStatus === "approved") {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm border border-emerald-200">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-bold px-3 py-1 text-xs">
            AUTHOR ACCESS GRANTED
          </Badge>
          <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
            You are a Published Author!
          </h1>
          <p className="text-[#5C6E6E] text-sm max-w-md mx-auto leading-relaxed">
            Congratulations! Your Harglim Author Account is active. You have full access to manuscript submission, royalty analytics, and editorial tools.
          </p>
        </div>
        <Button
          onClick={() => router.push("/author")}
          className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold h-12 px-8 shadow-sm gap-2"
        >
          <span>Go to Author Dashboard</span>
          <ArrowRight className="h-4 w-4 text-[#D4AF37]" />
        </Button>
      </div>
    );
  }

  // STATE 2: PENDING ("Your request is under review")
  if (applicationStatus === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto py-12"
      >
        <Card className="bg-white border-2 border-[#D4AF37]/50 shadow-md rounded-2xl p-8 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-bl-full pointer-events-none" />
          <div className="mx-auto w-16 h-16 bg-[#0F3D3E] text-[#D4AF37] rounded-2xl flex items-center justify-center shadow-sm">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <Badge className="bg-amber-500/10 text-amber-800 border-amber-500/30 font-bold px-3 py-0.5">
              APPLICATION UNDER REVIEW
            </Badge>
            <h1 className="text-3xl font-serif font-bold text-[#0F3D3E]">
              Your request is under review
            </h1>
            <p className="text-[#5C6E6E] text-sm max-w-md mx-auto leading-relaxed font-sans">
              Thank you for applying to become an author with Harglim Publishers. Our editorial team is evaluating your application details and will update your account status shortly.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="border-[#0F3D3E]/30 text-[#0F3D3E] font-medium"
            >
              Return to Reader Dashboard
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // STATE 4: REJECTED (Show reason + retry option)
  if (applicationStatus === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto py-12"
      >
        <Card className="bg-white border-2 border-rose-200 shadow-md rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-4 border-b border-rose-100 pb-4">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <Badge className="bg-rose-500/10 text-rose-700 border-rose-500/20 font-bold text-xs mb-1">
                APPLICATION REJECTED
              </Badge>
              <h1 className="text-2xl font-serif font-bold text-[#0F3D3E]">
                Application Status Update
              </h1>
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-4 space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Editorial Feedback / Rationale
            </p>
            <p className="text-sm text-rose-800 font-sans leading-relaxed">
              {rejectionReason || "Your application details required additional information. You may update your contact information and re-apply below."}
            </p>
          </div>

          <Button
            onClick={() => setApplicationStatus("none")}
            className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-medium gap-2 h-11"
          >
            <RotateCcw className="h-4 w-4 text-[#D4AF37]" />
            <span>Update Details & Retry Application</span>
          </Button>
        </Card>
      </motion.div>
    );
  }

  // STATE 1: NO APPLICATION (Show Form with Gold Accent)
  return (
    <div className="max-w-2xl mx-auto py-4 space-y-8">
      {/* Brand Headline strictly matching prompt */}
      <div className="text-center sm:text-left space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#0F3D3E] text-xs font-semibold mb-1">
          <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
          <span>Harglim Editorial House</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
          Become an Author
        </h1>
        <p className="text-[#5C6E6E] text-base leading-relaxed font-sans">
          Turn your ideas into published books with Harglim.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-white border-2 border-[#D4AF37]/40 shadow-md rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-2 h-full bg-[#D4AF37]" />
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Full Name / Pen Name
              </Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-3 h-5 w-5 text-[#5C6E6E]" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full legal or pen name"
                  className="pl-10 bg-white border-[#E2E6DF] focus:border-[#D4AF37]"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-[#5C6E6E]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  className="pl-10 bg-white border-[#E2E6DF] focus:border-[#D4AF37]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-5 w-5 text-[#5C6E6E]" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  className="pl-10 bg-white border-[#E2E6DF] focus:border-[#D4AF37]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Pen Name (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="penName" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Pen Name (Optional)
              </Label>
              <Input
                id="penName"
                type="text"
                placeholder="Preferred author or publishing name"
                className="bg-white border-[#E2E6DF] focus:border-[#D4AF37]"
                value={formData.penName}
                onChange={(e) => setFormData({ ...formData, penName: e.target.value })}
              />
            </div>

            {/* Portfolio / Website URL */}
            <div className="space-y-2">
              <Label htmlFor="portfolioUrl" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Portfolio / Website URL (Optional)
              </Label>
              <Input
                id="portfolioUrl"
                type="url"
                placeholder="https://yourwebsite.com or blog link"
                className="bg-white border-[#E2E6DF] focus:border-[#D4AF37]"
                value={formData.portfolioUrl}
                onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
              />
            </div>

            {/* Writing Experience */}
            <div className="space-y-2">
              <Label htmlFor="experience" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Writing Background / Experience (Optional)
              </Label>
              <Input
                id="experience"
                type="text"
                placeholder="e.g. Published 2 novels, 5 years journalism experience"
                className="bg-white border-[#E2E6DF] focus:border-[#D4AF37]"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              />
            </div>

            {/* Brief Bio / Pitch */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-wider text-[#0F3D3E]">
                Short Bio / Book Idea
              </Label>
              <Textarea
                id="bio"
                placeholder="Tell us briefly about your writing background or the manuscript concept..."
                className="bg-white border-[#E2E6DF] min-h-[100px] text-sm"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-[#E2E6DF]">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/50 font-serif font-bold h-12 shadow-sm text-sm gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Submitting Application...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-[#D4AF37]" />
                    Submit Author Application
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
