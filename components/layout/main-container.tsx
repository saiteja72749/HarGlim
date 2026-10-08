"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Must mirror the Navbar's hidden routes: these layouts render their own header, so
  // reserving the 64px navbar gap leaves an empty strip above them.
  const isHiddenRoute =
    pathname?.startsWith('/admin') ||
    pathname === '/author' ||
    pathname?.startsWith('/author/') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  return (
    <main className={cn("min-h-screen flex flex-col", !isHiddenRoute && "pt-16")}>
      {children}
    </main>
  );
}
