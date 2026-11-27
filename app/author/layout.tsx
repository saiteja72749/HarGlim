"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, CircleDollarSign, FilePlus2, FileText, LayoutDashboard, Menu, UserCircle } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useState } from "react";

const links = [
  { href: "/author", label: "Overview", icon: LayoutDashboard },
  { href: "/author/books", label: "My Books", icon: BookOpen },
  { href: "/author/manuscripts/new", label: "Submit Manuscript", icon: FilePlus2 },
  { href: "/author/manuscripts", label: "Manuscripts", icon: FileText },
  { href: "/author/analytics", label: "Performance & Analytics", icon: BarChart3 },
  { href: "/author/royalties", label: "Royalties", icon: CircleDollarSign },
  { href: "/author/settings", label: "Author Profile", icon: UserCircle },
];

function StudioNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = links.find((link) => pathname === link.href) ??
    links.find((link) => link.href !== "/author" && pathname.startsWith(link.href + "/"));
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      {user && <div className="border-b border-white/15 px-2 pb-4 [overflow-wrap:anywhere]">
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-white/80">{user.email}</p>
      </div>}
      <nav aria-label="Author Studio" className="space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const selected = active?.href === href;
          return <Link key={href} href={href} aria-current={selected ? "page" : undefined} onNavigate={onNavigate}
            className={cn("flex min-h-11 items-center gap-3 rounded-lg border-l-4 px-3 text-sm font-medium focus-visible:outline-white",
              selected ? "border-secondary bg-white/10 text-secondary" : "border-transparent text-white hover:bg-white/10")}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
          </Link>;
        })}
      </nav>
      <div className="grid gap-1 border-t border-white/15 pt-3">
        <Link href="/" onNavigate={onNavigate} className="flex min-h-11 items-center rounded-lg px-4 text-sm hover:bg-white/10">Main Website</Link>
        <Button variant="ghost" className="min-h-11 justify-start px-4 text-white hover:bg-white/10 hover:text-white"
          onClick={() => { onNavigate?.(); void logout({ redirectToHome: true }); }}>Sign Out</Button>
      </div>
    </div>
  );
}

function StudioLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="mx-auto grid w-full max-w-[90rem] flex-1 items-start gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:px-8">
      <aside className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-sidebar text-sidebar-foreground lg:block">
        <Link href="/author" className="block border-b border-white/15 px-6 py-4 font-serif text-lg font-semibold">Author Studio</Link>
        <StudioNavigation />
      </aside>
      <div className="min-w-0 space-y-4">
        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" aria-label="Open author navigation" className="min-h-11">
                <Menu aria-hidden="true" />Author Studio
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(21rem,calc(100vw-2rem))] gap-0 overflow-y-auto bg-sidebar text-sidebar-foreground">
              <SheetHeader className="pr-16">
                <SheetTitle className="text-white">Author Studio</SheetTitle>
                <SheetDescription className="sr-only">Navigation for your publishing workspace</SheetDescription>
              </SheetHeader>
              <StudioNavigation onNavigate={close} />
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole="author"><StudioLayout>{children}</StudioLayout></AuthGuard>;
}
