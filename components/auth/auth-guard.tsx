"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Loader2 } from "lucide-react";

export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, contextStatus } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const roleMismatch = Boolean(requiredRole && user?.role !== requiredRole);
  // The persisted role is a cache. If it doesn't match this route, wait for the
  // fresh /users/me/context (SessionBootstrap) before redirecting, so a reader
  // who was just approved as an author lands on /author instead of bouncing.
  const awaitingFreshRole =
    isAuthenticated && roleMismatch && (contextStatus === "idle" || contextStatus === "loading");

  useEffect(() => {
    if (!mounted || isLoading || awaitingFreshRole) return;

    if (!isAuthenticated) {
      // Redirect to login and save the original destination
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (roleMismatch) {
      // Redirect to their default dashboard or home if wrong role
      if (user?.role === "author") {
        router.push("/author");
      } else if (user?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [mounted, isAuthenticated, isLoading, awaitingFreshRole, roleMismatch, router, pathname, user]);

  // Show a generic full-screen loader while checking auth state
  if (!mounted || isLoading || awaitingFreshRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Verifying session...</p>
        </div>
      </div>
    );
  }

  // Prevent flashing of protected content before redirect
  if (!isAuthenticated || roleMismatch) {
    return null;
  }

  return <>{children}</>;
}
