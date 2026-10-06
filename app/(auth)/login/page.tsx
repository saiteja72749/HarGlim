"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, BookOpen, ArrowLeft, Sparkles } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/store/auth-store";
import toast from "react-hot-toast";
import api, { bootstrapUserContext } from "@/lib/api";
import { GoogleLoginButton } from "@/components/auth/google-login-button";
import dynamic from "next/dynamic";
import { getSafeRedirect } from "@/lib/utils";
import { getHomeRouteForContext } from "@/lib/author-access";

const AccountLinkDialog = dynamic(
  () => import("@/components/auth/account-link-dialog").then((m) => m.AccountLinkDialog),
  { ssr: false }
);

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  const urlEmail = searchParams.get("email");

  const login = useAuthStore((state) => state.login);
  const setAuthStatus = useAuthStore((state) => state.setAuthStatus);

  const [email, setEmail] = useState(urlEmail || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Error boundary modal state
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: "link_required" | "user_inactive" | null;
    email?: string;
  }>({
    isOpen: false,
    type: null,
    email: undefined,
  });

  const handleRouteByCapabilities = (context?: any) => {
    // No explicit ?redirect=: approved authors go straight to their dashboard, admins to /admin.
    const home = getHomeRouteForContext(useAuthStore.getState().user, context || useAuthStore.getState().userContext);
    router.replace(getSafeRedirect(redirectUrl, home));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setAuthStatus("authenticating");

    try {
      const { data } = await api.post("/auth/login", { email, password });
      const authData = data.data || data;
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

      toast.success(`Welcome back, ${user.name || "Reader"}!`, {
        duration: 2000,
        position: "top-center",
      });

      setAuthStatus("authenticated");
      setTimeout(() => {
        handleRouteByCapabilities(context);
      }, 300);
    } catch (error: any) {
      setAuthStatus("error");
      const status = error.response?.status;
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message;

      if (status === 403 && errorCode === "USER_INACTIVE") {
        setDialogState({
          isOpen: true,
          type: "user_inactive",
        });
      } else {
        toast.error(errorMessage || "Invalid email or password. Please try again.");
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
          if (targetEmail) {
            setEmail(targetEmail);
          }
        }}
      />

      {/* Left side - Form Container */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-8 lg:p-10 relative h-full overflow-y-auto">
        {/* Top Back Navigation */}
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

        {/* Main Form Center Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm mx-auto my-auto space-y-5"
        >
          {/* Header */}
          <div className="text-center space-y-2">
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
              Welcome Back
            </h1>
            <p className="text-xs text-[#5C6E6E] max-w-xs mx-auto">
              Access your library, author workspace, and publishing dashboard
            </p>
          </div>

          <div className="space-y-4">
            {/* 1-Click Direct Google Login */}
            <div>
              <GoogleLoginButton
                label="Sign in with Google"
                disabled={isLoading}
                onSuccess={() => {
                  setTimeout(() => {
                    handleRouteByCapabilities(useAuthStore.getState().userContext);
                  }, 300);
                }}
                onAccountLinkRequired={(emailAddress) => {
                  setDialogState({
                    isOpen: true,
                    type: "link_required",
                    email: emailAddress || email,
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
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-[#E2E6DF] w-full" />
              <span className="bg-[#F8F9F7] px-3 text-[10px] font-bold uppercase tracking-wider text-[#5C6E6E] shrink-0">
                OR SIGN IN WITH EMAIL
              </span>
            </div>

            {/* Manual Email Login Form */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                  EMAIL ADDRESS
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10 h-10 bg-white border-[#E2E6DF] focus:border-[#0F3D3E] text-xs rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-[#5C6E6E]">
                    PASSWORD
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[#0F3D3E] font-medium hover:underline hover:text-[#D4AF37]"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-10 bg-white border-[#E2E6DF] focus:border-[#0F3D3E] text-xs rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5C6E6E] hover:text-[#0F3D3E]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <Label htmlFor="remember" className="text-xs text-[#5C6E6E] cursor-pointer select-none">
                    Remember me for 30 days
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/30 font-serif font-bold text-xs rounded-xl shadow-md transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  "Sign In with Password"
                )}
              </Button>
            </form>

            <div className="text-center pt-3 border-t border-[#E2E6DF]">
              <p className="text-xs text-[#5C6E6E]">
                Don&apos;t have an account yet?{" "}
                <Link
                  href="/register"
                  className="text-[#0F3D3E] font-serif font-bold hover:underline inline-flex items-center gap-1 hover:text-[#D4AF37]"
                >
                  <span>Create Account</span>
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
            <span>Official Publishing Portal</span>
          </div>

          {/* Main Showcase Text */}
          <div className="space-y-4 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] mb-2 shadow-lg">
              <BookOpen className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-serif font-bold leading-tight text-white">
              Empowering Authors, Inspiring Readers
            </h2>
            <p className="text-white/80 text-sm font-light leading-relaxed">
              Step into a premium literary ecosystem. Seamlessly publish your manuscripts, track royalties, and explore curated world-class publications.
            </p>
          </div>

          {/* Bottom Simple Copyright Line */}
          <div className="text-xs text-white/50 border-t border-white/10 pt-4">
            &copy; {new Date().getFullYear()} Harglim Publishers
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F9F7]">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-[#0F3D3E] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-serif text-[#0F3D3E]">Loading Login Page...</p>
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}

