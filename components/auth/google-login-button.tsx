"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import api, { bootstrapUserContext } from "@/lib/api";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onAccountLinkRequired?: (email?: string) => void;
  onUserInactive?: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function GoogleLoginButton({
  onSuccess,
  onAccountLinkRequired,
  onUserInactive,
  disabled = false,
  label = "Continue with Google",
  className = "",
}: GoogleLoginButtonProps) {
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const login = useAuthStore((state) => state.login);
  const setAuthStatus = useAuthStore((state) => state.setAuthStatus);

  // Read environment Google Client ID with a fallback for dev/demo mode
  const rawClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const cleanClientId = rawClientId
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .trim();
  const clientId =
    cleanClientId && !cleanClientId.includes("CHANGE_ME")
      ? cleanClientId
      : "13886691041-flfn7g4qteies5jul4efud04v826oc3q.apps.googleusercontent.com";

  // 1. Dynamically load Google Identity Services SDK script
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.accounts?.id) {
      setIsSdkLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => setIsSdkLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setIsSdkLoaded(true);
    script.onerror = () => {
      console.warn("Google Identity Services script failed to load from CDN.");
    };
    document.body.appendChild(script);
  }, []);

  // 2. Callback triggered when user selects a Google Account
  const handleGoogleCallback = async (response: { credential?: string }) => {
    if (!response || !response.credential) {
      toast.error("Google sign-in was cancelled or failed to produce credentials.");
      return;
    }

    const credential = response.credential;
    setIsLoading(true);
    setStatusMessage("Signing in with Google...");
    setAuthStatus("authenticating");

    try {
      // Backend Contract: Only send { credential }
      const { data } = await api.post("/auth/google", { credential });

      const authData = data?.data || data;
      const { user, token, refreshToken, refreshTokenExpiresAt } = authData;

      if (!token || !user) {
        throw new Error("Invalid authentication payload returned from server.");
      }

      // Save tokens & basic user state in store
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

      // Bootstrap user context & capabilities
      setStatusMessage("Loading your account context...");
      setAuthStatus("context-loading");
      await bootstrapUserContext(token);

      toast.success(`Welcome back, ${user.name || "Reader"}!`, {
        duration: 3000,
        position: "top-center",
      });

      setAuthStatus("authenticated");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      setAuthStatus("error");
      const status = error.response?.status;
      const errorCode = error.response?.data?.error;
      const errorMessage = error.response?.data?.message || error.message || "";
      const email = error.response?.data?.email || error.response?.data?.data?.email;

      const isAccountLinkRequired =
        status === 409 ||
        errorCode === "ACCOUNT_LINK_REQUIRED" ||
        errorCode === "ACCOUNT_EXISTS" ||
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("linking google") ||
        errorMessage.toLowerCase().includes("sign in to the existing account") ||
        errorMessage.toLowerCase().includes("existing account");

      if (isAccountLinkRequired) {
        if (onAccountLinkRequired) {
          onAccountLinkRequired(email);
        } else {
          toast.error(
            "An account with this email already exists. Please sign in with your email & password."
          );
        }
      } else if (status === 403 && (errorCode === "USER_INACTIVE" || errorCode === "ACCOUNT_DISABLED")) {
        if (onUserInactive) {
          onUserInactive();
        } else {
          toast.error(errorMessage || "Your account has been deactivated. Please contact support.");
        }
      } else if (status === 503 && errorCode === "GOOGLE_AUTH_NOT_CONFIGURED") {
        toast.error("Google sign-in is temporarily unavailable. Please use email & password.");
      } else if (status === 401 && errorCode === "INVALID_GOOGLE_CREDENTIAL") {
        toast.error("Google credential expired or invalid. Please try again.");
      } else {
        toast.error(errorMessage || "Google sign-in request failed. Please check your backend connection.");
      }
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  // 3. Initialize GSI client once script is loaded
  useEffect(() => {
    if (!isSdkLoaded || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Render native hidden GSI button for standard popup triggering
      if (googleBtnRef.current) {
        googleBtnRef.current.replaceChildren();
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          type: "standard",
          width: "100%",
        });
      }
    } catch (err) {
      console.warn("GSI initialization info:", err);
    }
  }, [isSdkLoaded, clientId]);

  // Trigger Google Login popup directly
  const triggerGoogleSignIn = () => {
    if (disabled || isLoading) return;

    if (window.google?.accounts?.id) {
      // 1. Try clicking standard rendered GSI button if present inside ref
      const renderedBtn = googleBtnRef.current?.querySelector(
        "div[role='button'], iframe, button"
      ) as HTMLElement;

      if (renderedBtn) {
        renderedBtn.click();
        return;
      }

      // 2. Or prompt Google One Tap / account chooser directly
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.warn("GSI prompt skipped:", notification.getNotDisplayedReason());
        }
      });
    } else {
      toast.error("Google Sign-In is initializing. Please click again in a moment.");
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      {/* Hidden container for native GSI Button iframe */}
      <div ref={googleBtnRef} className="hidden" aria-hidden="true" />

      {/* Premium Styled Custom Google Button */}
      <button
        type="button"
        onClick={triggerGoogleSignIn}
        disabled={disabled || isLoading}
        className={`w-full relative flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 border bg-card/80 hover:bg-card text-foreground border-border/80 hover:border-primary/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          disabled || isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2 text-primary font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{statusMessage || "Connecting..."}</span>
          </span>
        ) : (
          <>
            {/* Google Colored G Icon SVG */}
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>

            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
