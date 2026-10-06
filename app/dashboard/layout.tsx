"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  User,
  LogOut,
  Menu,
  X,
  CreditCard,
  BookOpen,
  PenTool,
  Store,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { AuthGuard } from "@/components/auth/auth-guard";
import { canOpenAuthorDashboard, getAuthorApplicationState } from "@/lib/author-access";

const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/dashboard/wishlist", label: "Wishlist", icon: Heart },
  { href: "/dashboard/library", label: "My Library", icon: BookOpen },
  { href: "/dashboard/payments", label: "Payment History", icon: CreditCard },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, userContext } = useAuthStore();
  const applicationState = getAuthorApplicationState(userContext);
  const authorCta =
    applicationState === "pending"
      ? { title: "Application Pending", subtitle: "Under review by our editors" }
      : applicationState === "rejected"
      ? { title: "Application Rejected", subtitle: "Reapply to publish with Harglim" }
      : { title: "Become Author", subtitle: "Publish with Harglim" };
  const pathname = usePathname();
  const router = useRouter();

  return (
    <AuthGuard>
      <div className="flex bg-[#F8F9F7] min-h-[calc(100vh-4rem)]">
        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar (Luxury Deep Green #0F3D3E) */}
        <aside
          className={cn(
            "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 transform bg-[#0F3D3E] text-white border-r border-[#174C4D] transition-transform duration-300 lg:translate-x-0 shadow-xl",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            {/* Mobile Close Button */}
            <div className="flex items-center justify-between p-4 border-b border-[#174C4D] lg:hidden">
              <span className="font-serif font-bold text-lg text-[#D4AF37]">Harglim Reader</span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white hover:bg-[#174C4D]"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* User Info Header */}
            <div className="p-5 border-b border-[#174C4D] bg-[#0C3233]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-lg shadow-md">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-white truncate">{user?.name || "Reader Account"}</p>
                  <p className="text-xs text-white/60 truncate">
                    {user?.email || "reader@harglim.com"}
                  </p>
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">
                      {user?.role || "Reader"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">
                  Navigation
                </p>
                {sidebarLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative",
                        isActive
                          ? "bg-[#174C4D] text-[#D4AF37] font-semibold border-l-4 border-[#D4AF37] pl-2.5 shadow-sm"
                          : "text-white/70 hover:bg-[#174C4D]/60 hover:text-white",
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <link.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive ? "text-[#D4AF37]" : "text-white/60 group-hover:text-white")} />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Approved authors reach their studio from here (the navbar hides on /author). */}
              {canOpenAuthorDashboard(user, userContext) && (
                <div className="pt-2 border-t border-[#174C4D]">
                  <Link
                    href="/author"
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <PenTool className="h-5 w-5 shrink-0" />
                    <p className="leading-none text-xs font-bold uppercase tracking-wide">Author Dashboard</p>
                  </Link>
                </div>
              )}

              {/* Become Author / application status (readers only; no author nav until role is author) */}
              {user?.role === "reader" && (
                <div className="pt-2 border-t border-[#174C4D]">
                  <Link
                    href="/dashboard/become-author"
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200 border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/10 to-transparent hover:from-[#D4AF37]/20 hover:border-[#D4AF37]",
                      pathname === "/dashboard/become-author"
                        ? "bg-[#D4AF37] text-[#0F3D3E] font-bold shadow-md"
                        : "text-[#D4AF37]"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <PenTool className="h-5 w-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="leading-none text-xs font-bold uppercase tracking-wide">{authorCta.title}</p>
                      <p className="text-[10px] opacity-80 mt-1 font-sans">{authorCta.subtitle}</p>
                    </div>
                    <Sparkles className="h-4 w-4 shrink-0 text-[#D4AF37]" />
                  </Link>
                </div>
              )}
            </nav>

            {/* Bottom Actions */}
            <div className="border-t border-[#174C4D] p-4 space-y-2 bg-[#0C3233]">
              <Link href="/" passHref>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-[#174C4D] h-9 text-xs"
                >
                  <Store className="h-4 w-4" />
                  Back to Main Store
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-red-300 hover:text-red-200 hover:bg-red-950/40 h-9 text-xs"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-[calc(100vh-4rem)]">
          {/* Mobile Header Bar */}
          <header className="sticky top-16 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-white/90 backdrop-blur-md px-4 lg:hidden shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="text-[#0F3D3E]"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="font-serif font-bold text-base text-[#0F3D3E]">Reader Dashboard</span>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
