"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  DollarSign,
  Menu,
  BookOpen,
  X,
  UserPlus,
  Store,
  Globe,
  CreditCard,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Truck,
  Tags,
  Star,
  Receipt,
  Bell,
  BarChart3,
  Feather,
  PackageCheck,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { AuthGuard } from "@/components/auth/auth-guard";

const sidebarSections = [
  {
    title: "OPERATIONS",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders & Verification", icon: ShoppingBag },
      { href: "/admin/payments", label: "Payment Operations", icon: CreditCard },
      { href: "/admin/shipments", label: "Shipments & Courier", icon: Truck },
      { href: "/admin/inventory", label: "Inventory & Ledger", icon: PackageCheck },
    ],
  },
  {
    title: "CATALOG & CONTENT",
    items: [
      { href: "/admin/books", label: "Books Catalog", icon: BookOpen },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/manuscripts", label: "Publish Requests", icon: FileText },
      { href: "/admin/reviews", label: "Customer Reviews", icon: Star },
      { href: "/admin/content", label: "Site Content CMS", icon: Globe },
    ],
  },
  {
    title: "AUTHORS & USERS",
    items: [
      { href: "/admin/users", label: "Users & Accounts", icon: Users },
      { href: "/admin/authors", label: "Authors Directory", icon: Feather },
      { href: "/admin/author-applications", label: "Author Applications", icon: UserPlus },
      { href: "/admin/author-access", label: "Author Dashboard Access", icon: ShieldCheck },
    ],
  },
  {
    title: "FINANCE & AUDIT",
    items: [
      { href: "/admin/settlements", label: "Royalty Settlements", icon: DollarSign },
      { href: "/admin/invoices", label: "Invoices", icon: Receipt },
      { href: "/admin/analytics", label: "Platform Analytics", icon: BarChart3 },
      { href: "/admin/notifications", label: "Notifications Log", icon: Bell },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  return (
    <AuthGuard requiredRole="admin">
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

        {/* Sidebar (Seamless Uniform Deep Green #0F3D3E) */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-64 transform bg-[#0F3D3E] text-white border-r border-[#174C4D] transition-transform duration-300 lg:translate-x-0 shadow-2xl flex flex-col",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Header Brand */}
          <div className="flex h-16 items-center justify-between border-b border-[#174C4D] px-5 bg-[#0F3D3E]">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-lg shadow-sm">
                H
              </div>
              <span className="font-serif font-bold text-base text-white">Harglim Admin</span>
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

          {/* Admin User Info */}
          <div className="border-b border-[#174C4D] p-4 bg-[#0F3D3E]">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-base shadow-sm overflow-hidden border border-[#D4AF37]/50">
                {user?.profileImage || user?.profilePicture ? (
                  <Image
                    src={user.profileImage || user.profilePicture || ""}
                    alt={user.name || "Admin"}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "A"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-white truncate">{user?.name || "Administrator"}</p>
                {user?.email && <p className="text-[10px] text-white/60 truncate">{user.email}</p>}
                <div className="mt-1">
                  <span className="inline-block px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                    Super Admin
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0F3D3E]">
            {sidebarSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 font-sans">
                  {section.title}
                </p>
                {section.items.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href !== "/admin" && pathname.startsWith(link.href));

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
                      onClick={() => setSidebarOpen(false)}
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
              </div>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="border-t border-[#174C4D] p-4 space-y-2 bg-[#0F3D3E]">
            <Link href="/" passHref>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white/70 hover:text-white hover:bg-[#174C4D] h-9 text-xs"
              >
                <Store className="h-4 w-4" />
                <span>View Main Website</span>
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
          {/* Top Admin Header Bar */}
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
                Publishing Operations Control Panel
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0F3D3E]/5 border border-[#0F3D3E]/10 text-xs">
                <div className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D4AF37] text-[#0F3D3E] font-bold text-xs overflow-hidden">
                  {user?.profileImage || user?.profilePicture ? (
                    <Image
                      src={user.profileImage || user.profilePicture || ""}
                      alt={user.name || "Admin"}
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                <span className="font-semibold text-[#0F3D3E]">Admin: {user?.name || "Admin"}</span>
              </div>
            </div>
          </header>

          {/* Main Workspace View */}
          <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
