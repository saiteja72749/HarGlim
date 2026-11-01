"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort fallback for an error in the root layout itself, where app/error.tsx cannot run.
 * It replaces the whole document, so it renders its own <html> and <body> and uses plain links
 * (the app's providers and components are not available here).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#F8F9F7] text-[#0F3D3E] font-sans">
        <main className="min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-lg w-full text-center space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E]">Something went wrong</p>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold">Harglim Publishers is having trouble loading</h1>
            <p className="text-sm text-[#5C6E6E]">Please try again in a moment.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => reset()}
                className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold h-11 px-6 rounded-xl"
              >
                Try Again
              </button>
              {/* A full reload, not client navigation: the app around this page has crashed. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                className="inline-flex items-center justify-center border border-[#0F3D3E]/20 font-serif font-bold h-11 px-6 rounded-xl"
              >
                Back to Home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
