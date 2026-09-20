"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  Menu,
  ShoppingCart,
  User,
  ChevronDown,
  Search,
  LogOut,
  LayoutDashboard,
  PenTool,
} from "lucide-react";
import Image from "next/image";
import logo from "@/public/logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { cn } from "@/lib/utils";
import { useSiteContent } from "@/context/site-content-context";
import { useHydration } from "@/hooks/useHydration";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/categories", label: "Categories" },
  { href: "/authors", label: "Authors" },
  { href: "/publish", label: "Publish with Us" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const { content } = useSiteContent();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const rawItemCount = useCartStore((state) => state.items.reduce((total, item) => total + item.quantity, 0));
  const itemCount = (isAuthenticated && user) ? rawItemCount : 0;
  const isHydrated = useHydration();

  // Hide Navbar on admin, private author dashboard, and auth routes
  const isHiddenRoute = 
    pathname?.startsWith('/admin') || 
    pathname === '/author' || 
    pathname?.startsWith('/author/') || 
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const getDashboardLink = () => {
    if (!user) return "/dashboard";
    switch (user.role) {
      case "admin":
        return "/admin";
      case "author":
        return "/author";
      default:
        return "/dashboard";
    }
  };

  const handleLogout = () => {
    useCartStore.getState().clearCart();
    logout();
    router.push("/");
  };

  if (isHiddenRoute) return null;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-2xl shadow-sm border-b border-primary/10"
          : "bg-background/40 backdrop-blur-sm border-b border-transparent",
      )}
    >
      {/* Scroll Progress Bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-[2px] origin-left bg-gold-gradient z-50"
        style={{ scaleX }}
      />

      {/* Dynamic Announcement Banner (Post-Hydration Only to Prevent Mismatch) */}
      {isHydrated && content?.announcementActive && content?.announcementText && (
        <div className="bg-gradient-to-r from-[#0F3D3E] via-[#174C4D] to-[#0F3D3E] text-[#D4AF37] text-xs font-semibold py-1.5 px-4 text-center border-b border-[#D4AF37]/30 flex items-center justify-center gap-2 shadow-xs">
          <span>{content.announcementText}</span>
        </div>
      )}
      
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center group py-1">
            <Image
              src={logo}
              alt="Harglim Publishers"
              className="h-11 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === link.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Link href="/search">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Search className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>
            </Link>

            {/* Cart */}
            <Link href={isAuthenticated ? "/checkout/cart" : "/login"}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {isAuthenticated && user && isHydrated && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Button>
            </Link>

            {/* User Menu (Desktop) */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="h-5 w-5" />
                    <span className="hidden sm:inline">
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border border-[#E2E6DF] shadow-md bg-white">
                  <div className="px-3 py-2 bg-[#F8F9F7] rounded-xl mb-1 border border-[#E2E6DF]">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-serif font-bold text-[#0F3D3E] truncate">{user.name}</p>
                      <span className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                        user.role === "admin" ? "bg-rose-50 text-rose-700 border-rose-200" :
                        user.role === "author" ? "bg-[#D4AF37]/20 text-[#0F3D3E] border-[#D4AF37]/40" :
                        "bg-[#0F3D3E]/10 text-[#0F3D3E] border-[#0F3D3E]/20"
                      )}>
                        {user.role === "admin" ? "Admin" : user.role === "author" ? "Author" : "Reader"}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C6E6E] truncate">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator className="my-1 bg-[#E2E6DF]" />
                  <DropdownMenuItem asChild className="rounded-lg px-3 py-2 cursor-pointer focus:bg-[#F0F2ED] text-xs font-medium text-[#0F3D3E]">
                    <Link
                      href={getDashboardLink()}
                      className="flex items-center gap-2.5"
                    >
                      <LayoutDashboard className="h-4 w-4 text-[#0F3D3E]" />
                      <span>
                        {user.role === "admin" ? "Admin Ops Control Panel" : user.role === "author" ? "Author Studio Workspace" : "Reader Dashboard"}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "author" && (
                    <DropdownMenuItem asChild className="rounded-lg px-3 py-2 cursor-pointer focus:bg-[#F0F2ED] text-xs font-medium text-[#0F3D3E]">
                      <Link
                        href="/author/manuscripts/new"
                        className="flex items-center gap-2.5"
                      >
                        <PenTool className="h-4 w-4 text-[#D4AF37]" />
                        Submit Manuscript
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild className="rounded-lg px-3 py-2 cursor-pointer focus:bg-[#F0F2ED] text-xs font-medium text-[#0F3D3E]">
                    <Link
                      href="/dashboard/orders"
                      className="flex items-center gap-2.5"
                    >
                      <ShoppingCart className="h-4 w-4 text-[#0F3D3E]" />
                      <span>My Orders & Tracking</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg px-3 py-2 cursor-pointer focus:bg-[#F0F2ED] text-xs font-medium text-[#0F3D3E]">
                    <Link
                      href={user.role === "admin" ? "/admin/users" : user.role === "author" ? "/author/settings" : "/dashboard/profile"}
                      className="flex items-center gap-2.5"
                    >
                      <User className="h-4 w-4 text-[#0F3D3E]" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-[#E2E6DF]" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50 text-xs font-medium gap-2"
                  >
                    <LogOut className="h-4 w-4 text-rose-500" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href={pathname && pathname !== "/login" && pathname !== "/register" ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login"}>
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href={pathname && pathname !== "/login" && pathname !== "/register" ? `/register?redirect=${encodeURIComponent(pathname)}` : "/register"}>
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px] flex flex-col border-r shadow-2xl">
                <SheetHeader className="text-left border-b pb-4 mb-2">
                  <SheetTitle className="font-serif text-2xl font-bold text-gold-gradient">
                    Harglim Publishers
                  </SheetTitle>
                  <SheetDescription className="sr-only">Mobile Navigation Menu</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto space-y-1 py-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "block px-3 py-3 text-base font-medium rounded-md transition-all",
                        pathname === link.href
                          ? "text-primary bg-primary/10 border-l-4 border-primary pl-2"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted hover:pl-4",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>

                {/* Mobile Drawer Footer: Authenticated User & Guest controls */}
                {isAuthenticated && user ? (
                  <div className="pt-4 border-t border-border mt-auto space-y-2 pb-4">
                    <div className="px-3 py-2.5 bg-[#F8F9F7] rounded-xl border border-[#E2E6DF]">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-serif font-bold text-[#0F3D3E] truncate">{user.name}</p>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                          user.role === "admin" ? "bg-rose-50 text-rose-700 border-rose-200" :
                          user.role === "author" ? "bg-[#D4AF37]/20 text-[#0F3D3E] border-[#D4AF37]/40" :
                          "bg-[#0F3D3E]/10 text-[#0F3D3E] border-[#0F3D3E]/20"
                        )}>
                          {user.role === "admin" ? "Admin" : user.role === "author" ? "Author" : "Reader"}
                        </span>
                      </div>
                      <p className="text-xs text-[#5C6E6E] truncate">{user.email}</p>
                    </div>

                    <Link
                      href={getDashboardLink()}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#0F3D3E] rounded-lg hover:bg-muted"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span>{user.role === "admin" ? "Admin Ops Control Panel" : user.role === "author" ? "Author Studio Workspace" : "Reader Dashboard"}</span>
                    </Link>

                    <Link
                      href="/dashboard/orders"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#0F3D3E] rounded-lg hover:bg-muted"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span>My Orders & Tracking</span>
                    </Link>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="w-full justify-start text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2 h-9 px-3"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>Log out</span>
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-border mt-auto space-y-3 pb-6">
                    <Link
                      href={pathname && pathname !== "/login" && pathname !== "/register" ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login"}
                      className="block"
                      onClick={() => setIsOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        Login
                      </Button>
                    </Link>
                    <Link
                      href={pathname && pathname !== "/login" && pathname !== "/register" ? `/register?redirect=${encodeURIComponent(pathname)}` : "/register"}
                      className="block"
                      onClick={() => setIsOpen(false)}
                    >
                      <Button className="w-full">Register</Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
