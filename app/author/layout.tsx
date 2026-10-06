"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  LogOut,
  Menu,
  X,
  BookOpen,
  PenTool,
  Store,
  ChevronRight,
  ShieldCheck,
  Truck,
  FilePlus2,
  BarChart3,
  TrendingUp,
  Landmark,
  Wallet,
  UserCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { AuthGuard } from "@/components/auth/auth-guard";
import { bootstrapUserContext } from "@/lib/api";
import { canOpenAuthorDashboard } from "@/lib/author-access";

// Navigation for an approved author (backend handoff "Navigation Rules").
// Dashboard access is free once approved, so there is no purchase/paywall entry.
const authorSidebarLinks = [
  { href: "/author", label: "Author Dashboard", icon: LayoutDashboard },
  { href: "/author/books", label: "My Books", icon: BookOpen },
  { href: "/author/manuscripts/new", label: "Add Book", icon: FilePlus2 },
  { href: "/author/manuscripts", label: "Manuscripts", icon: FileText },
  { href: "/author/analytics#performance", label: "Book Performance", icon: TrendingUp },
  { href: "/author/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/author/royalties", label: "Royalties", icon: DollarSign },
  { href: "/author/royalties#settlements", label: "Royalty Settlements", icon: Landmark },
  { href: "/author/settings#profile", label: "Author Profile", icon: UserCircle },
  { href: "/author/settings#payout", label: "Payment/Payout Details", icon: Wallet },
  // Authors also buy books; orders & courier tracking live in the shared reader dashboard.
  { href: "/dashboard/orders", label: "My Orders & Tracking", icon: Truck },
];

const isLinkActive = (href: string, pathname: string, hash: string) => {
  const [path, linkHash = ""] = href.split("#");
  if (pathname !== path && !(path !== "/author" && pathname.startsWith(path + "/"))) return false;
  // "/author/manuscripts" must not light up on "/author/manuscripts/new" (its own "Add Book" entry).
  if (path === "/author/manuscripts" && pathname === "/author/manuscripts/new") return false;
  return linkHash === hash.replace("#", "");
};

export default function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const userContext = useAuthStore((state) => state.userContext);
  const contextStatus = useAuthStore((state) => state.contextStatus);
  const [hash, setHash] = useState("");
  const [refreshingAccess, setRefreshingAccess] = useState(false);

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  // Role "author" is checked by AuthGuard. The backend capability is the final word:
  // with paid access disabled it is true for every approved author, whatever the
  // historical dashboardAccessStatus (NOT_PURCHASED, REVOKED, ...) says.
  const accessDenied = contextStatus === "ready" && !canOpenAuthorDashboard(user, userContext);

  const retryAccess = async () => {
    setRefreshingAccess(true);
    await bootstrapUserContext();
    setRefreshingAccess(false);
  };

  return (
    <AuthGuard requiredRole="author">
      <div className="min-h-screen bg-[#F8F9F7] flex text-[#0F3D3E]">
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

        {/* Sidebar (Seamless Uniform Deep Green #0C3233) */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-64 transform bg-[#0C3233] text-white border-r border-[#174C4D] transition-transform duration-300 lg:translate-x-0 shadow-2xl flex flex-col",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Header Brand */}
          <div className="flex h-16 items-center justify-between border-b border-[#174C4D] px-5 bg-[#0C3233]">
            <Link href="/author" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-lg shadow-sm">
                ✍️
              </div>
              <div>
                <span className="font-serif font-bold text-base text-white block leading-none">Author Studio</span>
                <span className="text-[10px] text-[#D4AF37] tracking-wider uppercase font-sans">Harglim Publishers</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Author User Info */}
          <div className="border-b border-[#174C4D] p-4 bg-[#0C3233]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-base shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-xs text-white truncate">{user?.name || "Author"}</p>
                <p className="text-[10px] text-white/60 truncate">{user?.email || "author@harglim.com"}</p>
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                    Verified Author
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-[#0C3233]">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 font-sans">
              Author Navigation
            </p>
            {authorSidebarLinks.map((link) => {
              const isActive = isLinkActive(link.href, pathname, hash);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-[#174C4D] text-[#D4AF37] font-bold border-l-4 border-[#D4AF37] pl-2.5 shadow-xs"
                      : "text-white/70 hover:bg-[#174C4D]/60 hover:text-white",
                  )}
                  onClick={() => {
                    setSidebarOpen(false);
                    // Same-page hash links don't always fire "hashchange" under the App Router.
                    setHash(link.href.includes("#") ? "#" + link.href.split("#")[1] : "");
                  }}
                >
                  <div className="flex items-center gap-3">
                    <link.icon
                      className={cn(
                        "h-4 w-4 transition-transform group-hover:scale-110",
                        isActive ? "text-[#D4AF37]" : "text-white/60 group-hover:text-white"
                      )}
                    />
                    <span>{link.label}</span>
                  </div>
                  {isActive && <ChevronRight className="h-3.5 w-3.5 text-[#D4AF37]" />}
                </Link>
              );
            })}
          </nav>

          {/* Quick Submit Manuscript Action */}
          <div className="p-4 border-t border-[#174C4D] bg-[#0C3233] space-y-2">
            <Link href="/author/manuscripts/new" passHref>
              <Button className="w-full bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold text-xs h-10 rounded-xl shadow-xs gap-2">
                <PenTool className="h-4 w-4" />
                <span>Submit New Manuscript</span>
              </Button>
            </Link>

            <Link href="/" passHref>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-[#174C4D] h-9 text-xs"
              >
                <Store className="h-4 w-4" />
                <span>Main Website</span>
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
              <span>Sign Out</span>
            </Button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="lg:pl-64 flex-1 flex flex-col min-h-screen">
          {/* Top Author Studio Header Bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E2E6DF] bg-white px-4 sm:px-8 shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="text-[#0F3D3E] lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <span className="font-serif font-bold text-lg text-[#0F3D3E]">
                Author Workspace & Publication Management
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-xs">
                <ShieldCheck className="h-4 w-4 text-[#0F3D3E]" />
                <span className="font-bold text-[#0F3D3E]">Author Portal: {user?.name || "Author"}</span>
              </div>
            </div>
          </header>

          {/* Main Workspace View */}
          <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
            {accessDenied ? (
              <div className="max-w-lg mx-auto mt-16 rounded-2xl border border-[#E2E6DF] bg-white p-8 text-center space-y-4 shadow-xs">
                <ShieldCheck className="h-10 w-10 mx-auto text-[#0F3D3E]" />
                <h1 className="font-serif font-bold text-xl text-[#0F3D3E]">Author dashboard unavailable</h1>
                <p className="text-sm text-[#5C6E6E]">
                  Your account is an author account, but the server did not grant dashboard access for this session.
                  Refresh your access. If this keeps happening, contact the Harglim team.
                </p>
                <Button
                  onClick={retryAccess}
                  disabled={refreshingAccess}
                  className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", refreshingAccess && "animate-spin")} />
                  <span>{refreshingAccess ? "Refreshing..." : "Refresh access"}</span>
                </Button>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
