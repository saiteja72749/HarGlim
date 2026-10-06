"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, BookOpen, ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import api, { bootstrapUserContext } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import dynamic from "next/dynamic";
import { PasswordStrengthIndicator } from "@/components/auth/password-strength-indicator";
import { getSafeRedirect } from "@/lib/utils";
import { getHomeRouteForContext } from "@/lib/author-access";

const AccountLinkDialog = dynamic(
  () => import("@/components/auth/account-link-dialog").then((m) => m.AccountLinkDialog),
  { ssr: false }
);

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");

  const login = useAuthStore((state) => state.login);
  const setAuthStatus = useAuthStore((state) => state.setAuthStatus);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Security & conflict modal dialog
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "link_required" | "user_inactive" | null;
    email?: string;
  }>({
    isOpen: false,
    type: null,
    email: undefined,
  });

  const handleRouteAfterAuth = (context?: any) => {
    // No explicit ?redirect=: approved authors go straight to their dashboard, admins to /admin.
    const home = getHomeRouteForContext(useAuthStore.getState().user, context || useAuthStore.getState().userContext);
    router.replace(getSafeRedirect(redirectUrl, home));
  };

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please enter your full name and email address.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match. Please check and try again.");
      return;
    }

    if (!agreeTerms) {
      toast.error("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    setIsLoading(true);
    setAuthStatus("authenticating");

    try {
      // 1. Create reader account
      await api.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      toast.success("Account created! Signing you in...", {
        duration: 2000,
        position: "top-center",
      });

      // 2. Auto-login immediately after creation
      const { data: loginRes } = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      const authData = loginRes.data || loginRes;
      const { user, token, refreshToken, refreshTokenExpiresAt } = authData;

      login(
        {
          _id: user._id || user.id,
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImage: user.profilePicture || user.profileImage,
          emailVerified: true,
          isActive: true,
        },
        token,
        refreshToken,
        refreshTokenExpiresAt
      );

      setAuthStatus("context-loading");
      const context = await bootstrapUserContext(token);
      setAuthStatus("authenticated");

      setTimeout(() => {
        handleRouteAfterAuth(context);
      }, 300);
    } catch (error: any) {
      setAuthStatus("error");
      const status = error.response?.status;
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";

      const isAccountExistsError =
        status === 409 ||
        errorCode === "ACCOUNT_EXISTS" ||
        errorCode === "ACCOUNT_LINK_REQUIRED" ||
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("linking google") ||
        errorMessage.toLowerCase().includes("existing account");

      if (isAccountExistsError) {
        setDialogState({
          isOpen: true,
          type: "link_required",
          email: formData.email,
        });
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen overflow-hidden bg-[#F8F9F7] flex text-[#0F3D3E]">
      {/* Account Link & Security Dialog */}
      <AccountLinkDialog
        isOpen={dialogState.isOpen}
        type={dialogState.type}
        email={dialogState.email}
        onClose={() => setDialogState({ isOpen: false, type: null })}
        onSwitchToPasswordLogin={(targetEmail) => {
          const emailToPass = targetEmail || formData.email;
          router.push(`/login${emailToPass ? `?email=${encodeURIComponent(emailToPass)}` : ""}`);
        }}
      />

      {/* Left side - Form Container */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative h-full overflow-y-auto">
        {/* Top Navigation */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="gap-2 text-[#5C6E6E] hover:text-[#0F3D3E] hover:bg-[#E2E6DF]/50 h-9 px-3 rounded-lg text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Form Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm mx-auto my-auto space-y-4"
        >
          {/* Header */}
          <div className="text-center space-y-1.5">
            <Link href="/" className="inline-flex justify-center items-center group mb-2">
              <Image
                src="/logo.png"
                alt="Harglim Publishers"
                width={56}
                height={56}
                className="h-12 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            <h1 className="text-2xl font-serif font-bold text-[#0F3D3E]">
              Create Your Account
            </h1>
            <p className="text-xs text-[#5C6E6E] max-w-xs mx-auto">
              Join thousands of readers and authors on Harglim Publishers
            </p>
          </div>

          <div className="space-y-3">
            {/* 1-Click Direct Google Signup */}
            <div>
              <GoogleLoginButton
                label="Sign up with Google"
                disabled={isLoading}
                onSuccess={() => {
                  setTimeout(() => {
                    handleRouteAfterAuth(useAuthStore.getState().userContext);
                  }, 300);
                }}
                onAccountLinkRequired={(emailAddress) => {
                  setDialogState({
                    isOpen: true,
                    type: "link_required",
                    email: emailAddress || formData.email,
                  });
                }}
                onUserInactive={() => {
                  setDialogState({
                    isOpen: true,
                    type: "user_inactive",
                  });
                }}
              />
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-[#E2E6DF] w-full" />
              <span className="bg-[#F8F9F7] px-3 text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] shrink-0">
                OR REGISTER WITH EMAIL
              </span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleManualRegister} className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                  FULL NAME
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5C6E6E]" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    className="pl-9 h-9.5 bg-white border-[#E2E6DF] focus:border-[#0F3D3E] text-xs rounded-xl"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                  EMAIL ADDRESS
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5C6E6E]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9 h-9.5 bg-white border-[#E2E6DF] focus:border-[#0F3D3E] text-xs rounded-xl"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                  PASSWORD
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5C6E6E]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="pl-9 pr-9 h-9.5 bg-white border-[#E2E6DF] focus:border-[#0F3D3E] text-xs rounded-xl"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5C6E6E] hover:text-[#0F3D3E]"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={formData.password} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                  CONFIRM PASSWORD
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5C6E6E]" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="pl-9 h-9.5 bg-white border-[#E2E6DF] focus:border-[#0F3D3E] text-xs rounded-xl"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-0.5">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                />
                <Label htmlFor="terms" className="text-xs text-[#5C6E6E] cursor-pointer select-none">
                  I agree to the{" "}
                  <Link href="/terms" className="text-[#0F3D3E] hover:underline font-medium">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-[#0F3D3E] hover:underline font-medium">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/30 font-serif font-bold text-xs rounded-xl shadow-md transition-all mt-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="text-center pt-2.5 border-t border-[#E2E6DF]">
              <p className="text-xs text-[#5C6E6E]">
                Already have an account?{" "}
                <Link
                  href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
                  className="text-[#0F3D3E] font-serif font-bold hover:underline inline-flex items-center gap-1 hover:text-[#D4AF37]"
                >
                  <span>Sign In</span>
                  <Sparkles className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="text-center text-xs text-[#5C6E6E]/60">
          &copy; {new Date().getFullYear()} Harglim Publishers. All rights reserved.
        </div>
      </div>

      {/* Right side - Premium Hero Showcase Banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B2E2F] via-[#0F3D3E] to-[#082223] relative overflow-hidden h-full">
        {/* Glow Spheres */}
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-20 flex flex-col justify-between p-12 text-white h-full w-full">
          {/* Top Brand Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Join Our Literary Network</span>
          </div>

          {/* Main Showcase Text */}
          <div className="space-y-4 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-2 shadow-lg">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-serif font-bold leading-tight text-white">
              Start Your Reading & Publishing Journey
            </h2>
            <p className="text-white/80 text-sm font-light leading-relaxed">
              Create a free account to access exclusive bookstore releases, manage your personal library, or submit your manuscript for publishing.
            </p>
          </div>

          {/* Bottom Copyright Line */}
          <div className="text-xs text-white/50 border-t border-white/10 pt-4">
            &copy; {new Date().getFullYear()} Harglim Publishers
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9F7]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-[#0F3D3E] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-serif text-[#0F3D3E]">Loading Register Page...</p>
          </div>
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}

