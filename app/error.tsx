"use client";
import { describeApiError } from "@/lib/api-error";


import { useEffect } from "react";
import Link from "next/link";
import { ServerCrash, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", describeApiError(error));
  }, [error]);

  return (
    <div className="bg-[#F8F9F7] min-h-[70vh] flex items-center justify-center px-4 py-20 text-[#0F3D3E] font-sans">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="mx-auto h-20 w-20 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shadow-md border border-red-100">
          <ServerCrash className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E]">Something went wrong</p>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            We hit a snag loading this page
          </h1>
          <p className="text-sm text-[#5C6E6E] max-w-md mx-auto">
            Our team has been notified. Please try again, or head back to the homepage.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={() => reset()} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] border border-[#D4AF37]/40 font-serif font-bold h-11 px-6 rounded-xl gap-2">
            <RefreshCcw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>
          <Button asChild variant="outline" className="border-[#0F3D3E]/20 text-[#0F3D3E] font-serif font-bold h-11 px-6 rounded-xl gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
