"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingCart, User } from "lucide-react";
import Image from "@/components/ui/backend-image";
import logo from "@/public/logo.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSiteContent } from "@/context/site-content-context";
import { useHydration } from "@/hooks/useHydration";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/books", label: "Books" },
  { href: "/authors", label: "Authors" },
  { href: "/publish", label: "Publish with Us" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const headerRef = useRef<HTMLElement>(null);
  const { content } = useSiteContent();
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const closeMenu = () => setOpenPath(null);
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((state) => state.items.reduce((count, item) => count + item.quantity, 0));
  const hydrated = useHydration();
  const account = hydrated && isAuthenticated ? user : null;
  const isHiddenRoute = /^\/(admin|author|login|register)(\/|$)/.test(pathname ?? "");

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--site-header-height", `${header.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, [isHiddenRoute]);

  if (isHiddenRoute) return null;

  const role = account?.role;
  const dashboard = role === "admin" ? { href: "/admin", label: "Admin Dashboard" }
    : role === "author" ? { href: "/author", label: "Author Studio" }
    : { href: "/dashboard", label: "Reader Dashboard" };
  const profile = role === "admin" ? "/admin/users" : role === "author" ? "/author/settings" : "/dashboard/profile";
  const redirect = pathname && pathname !== "/" ? `?redirect=${encodeURIComponent(pathname)}` : "";
  const accountLinks = account ? [
    dashboard,
    ...(role === "admin" ? [] : [{ href: "/dashboard/orders", label: "My Orders" }]),
    { href: profile, label: role === "author" ? "Profile Settings" : "Profile" },
  ] : [
    { href: `/login${redirect}`, label: "Login" },
    { href: `/register${redirect}`, label: "Register" },
  ];

  const signOut = () => {
    closeMenu();
    useCartStore.getState().clearCart();
    void logout({ redirectToHome: true });
  };

  const navigationLinks = (mobile: boolean) => navLinks.map(({ href, label }) => {
    const current = pathname === href;
    const active = current || (href !== "/" && pathname?.startsWith(`${href}/`));
    return (
      <Link key={href} href={href} aria-current={current ? "page" : undefined} onClick={mobile ? closeMenu : undefined}
        className={cn("flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors",
          active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
        {label}
      </Link>
    );
  });

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-border bg-background">
      {hydrated && content?.announcementActive && content.announcementText && (
        <p className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground [overflow-wrap:anywhere]">
          {content.announcementText}
        </p>
      )}
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <Link href="/" className="inline-flex min-h-11 w-fit max-w-full items-center rounded-md">
          <Image src={logo} alt="Harglim Publishers" className="h-10 w-auto max-w-full object-contain sm:h-12" priority />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">{navigationLinks(false)}</nav>
        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
          <Button variant="ghost" size="icon" className="size-11" asChild>
            <Link href="/search" aria-label="Search"><Search aria-hidden="true" /></Link>
          </Button>
          <Button variant="ghost" size="icon" className="relative size-11" asChild>
            <Link href="/cart" aria-label={hydrated && itemCount ? `Cart (${itemCount} items)` : "Cart"}>
              <ShoppingCart aria-hidden="true" />
              {hydrated && itemCount > 0 && (
                <span aria-hidden="true" className="absolute right-0 top-0 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label={account ? `Account for ${account.name}` : "Account"}>
                <User aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} collisionPadding={12} className="z-50 w-56 max-w-[calc(100vw-1.5rem)]">
              {account && (
                <>
                  <DropdownMenuLabel className="[overflow-wrap:anywhere]">
                    {account.name}
                    <span className="block text-xs font-normal text-muted-foreground">{account.email}</span>
                    <span className="block font-normal capitalize text-muted-foreground">{role}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              {accountLinks.map(({ href, label }) => (
                <DropdownMenuItem key={href} asChild className="min-h-11">
                  <Link href={href}>{label}</Link>
                </DropdownMenuItem>
              ))}
              {account && <DropdownMenuItem className="min-h-11" onSelect={signOut}>Sign Out</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={openPath === pathname && openPath !== null} onOpenChange={(open) => setOpenPath(open ? pathname : null)}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Toggle menu">
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(21rem,calc(100vw-2rem))] overflow-y-auto">
              <SheetHeader className="pr-14">
                <SheetTitle className="font-serif text-xl">Harglim Publishers</SheetTitle>
                <SheetDescription className="sr-only">Site navigation and account links</SheetDescription>
              </SheetHeader>
              <nav aria-label="Mobile primary" className="space-y-1 px-4">{navigationLinks(true)}</nav>
              <nav aria-label="Account" className="mx-4 space-y-1 border-t py-4">
                {account && <div className="px-3 text-sm [overflow-wrap:anywhere]">
                  <p className="font-medium">{account.name} <span className="capitalize text-muted-foreground">· {role}</span></p>
                  <p className="text-xs text-muted-foreground">{account.email}</p>
                </div>}
                {accountLinks.map(({ href, label }) => (
                  <Link key={href} href={href} onClick={closeMenu} className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-muted">{label}</Link>
                ))}
                {account && <Button variant="ghost" className="min-h-11" onClick={signOut}>Sign Out</Button>}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
