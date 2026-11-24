"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CreditCard, Heart, LayoutDashboard, Menu, PenTool, ShoppingBag, User } from "lucide-react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { canOpenAuthorDashboard, getAuthorApplicationState } from "@/lib/author-access";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const readerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { href: "/dashboard/library", label: "My Library", icon: BookOpen },
  { href: "/dashboard/payments", label: "Payment History", icon: CreditCard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

function ReaderNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, userContext, logout } = useAuthStore();
  const application = getAuthorApplicationState(userContext);
  const authorLink = canOpenAuthorDashboard(user, userContext)
    ? { href: "/author", label: "Author Dashboard", icon: PenTool }
    : user?.role === "reader"
      ? { href: "/dashboard/become-author", label: application === "pending" ? "Application Pending" : application === "rejected" ? "Application Rejected" : "Become an Author", icon: PenTool }
      : null;
  const links = authorLink ? [...readerLinks, authorLink] : readerLinks;

  return (
    <nav aria-label="Reader dashboard" className="space-y-1 p-3">
      {user?.name && <p className="mb-2 px-3 pt-2 text-sm font-semibold [overflow-wrap:anywhere]">{user.name}</p>}
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={pathname === href ? "page" : undefined}
          className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium",
            pathname === href ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent")}
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
      <div className="mt-3 space-y-1 border-t border-current/20 pt-3">
        <Link href="/" onClick={onNavigate} className="flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-sidebar-accent">Back to Store</Link>
        <Button variant="ghost" className="w-full justify-start text-inherit hover:bg-sidebar-accent hover:text-inherit"
          onClick={() => { onNavigate?.(); void logout({ redirectToHome: true }); }}>
          Sign Out
        </Button>
      </div>
    </nav>
  );
}

function ReaderShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);

  return (
    <div className="mx-auto grid w-full max-w-[var(--site-content-width)] min-w-0 flex-1 items-start gap-4 p-4 sm:p-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-6 lg:p-8">
      <aside className="sticky top-[calc(var(--site-header-height,4rem)+1rem)] hidden max-h-[calc(100dvh-var(--site-header-height,4rem)-2rem)] overflow-y-auto rounded-2xl bg-sidebar text-sidebar-foreground lg:block">
        <ReaderNavigation />
      </aside>
      <div className="min-w-0 space-y-4">
        <div className="lg:hidden">
          <Sheet open={openPath !== null && openPath === pathname} onOpenChange={(open) => setOpenPath(open ? pathname : null)}>
            <SheetTrigger asChild>
              <Button variant="outline" className="min-h-11" aria-label="Open reader navigation">
                <Menu aria-hidden="true" /> Reader Dashboard
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(20rem,calc(100vw-2rem))] overflow-y-auto bg-sidebar text-sidebar-foreground">
              <SheetHeader className="pr-14">
                <SheetTitle className="text-sidebar-foreground">Reader Dashboard</SheetTitle>
                <SheetDescription className="sr-only">Links for managing your reader account</SheetDescription>
              </SheetHeader>
              <ReaderNavigation onNavigate={() => setOpenPath(null)} />
            </SheetContent>
          </Sheet>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><ReaderShell>{children}</ReaderShell></AuthGuard>;
}
