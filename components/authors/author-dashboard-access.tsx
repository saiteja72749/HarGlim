"use client";

import { useState, type ReactNode } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { bootstrapUserContext } from "@/lib/api";
import { canOpenAuthorDashboard } from "@/lib/author-access";
import { cn } from "@/lib/utils";

/** Gate report content inside the page so the shared layout always renders its router outlet. */
export function AuthorDashboardAccess({ children }: { children: ReactNode }) {
  const { user, userContext, contextStatus } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const denied = contextStatus === "ready" && !canOpenAuthorDashboard(user, userContext);

  if (!denied) return children;

  const retry = async () => {
    setRefreshing(true);
    try {
      await bootstrapUserContext();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-16 rounded-2xl border border-[#E2E6DF] bg-white p-8 text-center space-y-4 shadow-xs">
      <ShieldCheck className="h-10 w-10 mx-auto text-[#0F3D3E]" />
      <h1 className="font-serif font-bold text-xl text-[#0F3D3E]">Author dashboard unavailable</h1>
      <p className="text-sm text-[#5C6E6E]">
        Your account is an author account, but the server did not grant dashboard access for this session.
        Refresh your access. If this keeps happening, contact the Harglim team.
      </p>
      <Button onClick={retry} disabled={refreshing} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-2">
        <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        <span>{refreshing ? "Refreshing..." : "Refresh access"}</span>
      </Button>
    </div>
  );
}
