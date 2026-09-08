"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminRoyaltiesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/settlements");
  }, [router]);

  return (
    <div className="flex h-[400px] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">Redirecting to Royalty Settlement Engine...</p>
    </div>
  );
}
