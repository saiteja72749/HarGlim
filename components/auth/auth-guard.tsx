"use client";

import { Fragment, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { Loader2 } from "lucide-react";
import { useHydration } from '@/hooks/useHydration';
import { bootstrapUserContext } from '@/lib/api';
import { ErrorState } from '@/components/ui/error-state';

export function AuthGuard({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, userContext, isLoading, contextStatus, contextVerified } = useAuthStore();
  const mounted = useHydration();

  const roleMismatch = Boolean(requiredRole && user?.role !== requiredRole);
  // The persisted role is a cache. If it doesn't match this route, wait for the
  // fresh /users/me/context (SessionBootstrap) before redirecting, so a reader
  // who was just approved as an author lands on /author instead of bouncing.
  const awaitingFreshRole =
    isAuthenticated && (!contextVerified || (roleMismatch && contextStatus !== 'ready'));

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

  if (mounted && isAuthenticated && contextStatus === 'error' && (!contextVerified || roleMismatch)) {
    return <ErrorState title="Session could not be verified" message="Retry when your connection is available." onRetry={() => { void bootstrapUserContext(); }} />;
  }
  if (mounted && isAuthenticated && contextVerified && userContext?.user.isActive === false) {
    return <ErrorState title="Account unavailable" message="Your account is inactive. Contact support for assistance." />;
  }
  if (mounted && isAuthenticated && contextVerified && requiredRole === 'admin' && !userContext?.capabilities.canAdminister) {
    return <ErrorState title="Access denied" message="The backend has not granted administrator access to this session." />;
  }

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

  return <>{contextStatus === 'error' && <ErrorState title="Session refresh is unavailable" message="Your last verified session is shown. Reconnect and retry before saving changes." onRetry={() => { void bootstrapUserContext(); }} />}<Fragment key={user?._id}>{children}</Fragment></>;
}
