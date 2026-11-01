"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  BookOpen,
  Edit3,
  Image as ImageIcon,
  Megaphone,
  Truck,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  FileText,
  Award,
  Sparkles,
  Users,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSiteContent } from "@/context/site-content-context";
import { readSection } from "@/lib/page-content";
import { fetchPublicPackages, onPackagesChanged, type PackageCard as PackageCardData } from "@/lib/publish-packages";
import { PackageCard } from "@/components/packages/package-card";
import { SpotlightSection } from "@/components/spotlight/spotlight-section";
import { fetchPublicStats } from "@/lib/public-stats";
import { useAuthStore } from "@/store/auth-store";
import api from "@/lib/api";

/** Cloudinary covers resized for the hero (other hosts are used as they are). */
const coverUrl = (src: string) =>
  src.startsWith("https://res.cloudinary.com/") && src.includes("/upload/")
    ? src.replace("/upload/", "/upload/f_auto,q_auto,w_400,c_limit/")
    : src;

const SERVICE_ICONS = [Edit3, ImageIcon, FileText, Megaphone, Truck, DollarSign];


export default function PublishPage() {
  const { content } = useSiteContent();
  const publishingServices = readSection<{ title: string; description: string; features?: string[] }>(
    content,
    "publishServicesJson"
  ).map((service, idx) => ({ ...service, features: service.features || [], icon: SERVICE_ICONS[idx % SERVICE_ICONS.length] }));
  const stepGuide = readSection<{ title: string; description: string }>(content, "publishStepsJson").map((step, idx) => ({
    ...step,
    step: idx + 1,
  }));
  const role = useAuthStore((state) => state.user?.role);
  const [packages, setPackages] = useState<PackageCardData[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState(false);
  const [authorsCount, setAuthorsCount] = useState(0);

  useEffect(() => {
    const fetchAuthorsCount = async () => setAuthorsCount((await fetchPublicStats()).authorsCount);
    fetchAuthorsCount();
  }, []);

  // Hero showcase: the newest published books that have a cover.
  const [showcase, setShowcase] = useState<{ _id: string; slug?: string; title: string; coverImage: string }[]>([]);
  useEffect(() => {
    api
      .get("/books", { params: { limit: 8 } })
      .then(({ data }) => {
        const items = data?.data?.books || data?.books || data?.data || [];
        // Only hosts allowed for next/image in next.config.mjs.
        const allowed = (src: unknown) =>
          typeof src === "string" &&
          (src.startsWith("https://res.cloudinary.com/") || src.startsWith("https://harglimpublish-backend.onrender.com/"));
        setShowcase((Array.isArray(items) ? items : []).filter((b: any) => allowed(b?.coverImage)).slice(0, 3));
      })
      .catch(() => setShowcase([]));
  }, []);

  // The package database (Admin → Publishing Packages) is the only source: every card is a real
  // package whose _id is the packageId sent on manuscript submission. Reloaded when the tab
  // regains focus, so an admin's change shows without a refresh.
  const loadPackages = useCallback(async (showSpinner: boolean) => {
    if (showSpinner) setLoadingPackages(true);
    try {
      setPackages(await fetchPublicPackages());
      setPackagesError(false);
    } catch {
      setPackagesError(true);
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    loadPackages(true);
    return onPackagesChanged(() => loadPackages(false));
  }, [loadPackages]);

  // Approved authors go straight to submission with the package preselected; everyone else
  // must apply to become an author first.
  const packageHref = (pkg: PackageCardData) =>
    role === "author" ? `/author/manuscripts/new?packageId=${encodeURIComponent(pkg._id || "")}` : "/dashboard/become-author";

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E] font-sans">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO SECTION (Conversion Focused) */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white py-20 md:py-28 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column Text & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold">
              <Award className="h-4 w-4" />
              <span>Premier Independent Publishing House</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-white tracking-tight leading-tight">
              {content.publishTitle}
            </h1>

            <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
              {content.publishSubtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Link href="/dashboard/become-author">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-14 px-8 rounded-full shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all gap-2 text-base"
                >
                  <span>Submit Manuscript</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#packages">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border-2 border-white/40 text-white font-serif font-bold h-14 px-8 rounded-full text-base transition-all"
                >
                  <span>View Packages</span>
                </Button>
              </Link>
            </div>

            {/* Trust Badges Bar */}
            <div className="pt-6 border-t border-white/15 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start gap-1 text-[#D4AF37]">
                  <Users className="h-4 w-4" />
                  <span className="font-serif font-bold text-lg text-white">{authorsCount}+</span>
                </div>
                <p className="text-[11px] text-white/70">Authors Published</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start gap-1 text-[#D4AF37]">
                  <Globe className="h-4 w-4" />
                  <span className="font-serif font-bold text-lg text-white">Global</span>
                </div>
                <p className="text-[11px] text-white/70">Distribution</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center lg:justify-start gap-1 text-[#D4AF37]">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-serif font-bold text-lg text-white">Live</span>
                </div>
                <p className="text-[11px] text-white/70">Royalty Dashboard</p>
              </div>
            </div>
          </div>

          {/* Right Column: real books published by Harglim authors */}
          <div className="lg:col-span-5 flex flex-col items-center gap-5">
            {showcase.length > 0 ? (
              <>
                <div className="relative w-full max-w-sm h-[285px] sm:h-[310px]">
                  {showcase.map((book, idx) => {
                    // Front cover in the middle, the others fanned out behind it.
                    const fan = [
                      "z-30 left-1/2 -translate-x-1/2 rotate-0",
                      "z-20 left-[4%] rotate-[-8deg] top-6 opacity-90",
                      "z-10 right-[4%] rotate-[8deg] top-6 opacity-90",
                    ][idx];
                    return (
                      <Link
                        key={book._id}
                        href={`/books/${book.slug || book._id}`}
                        className={`absolute top-0 w-[46%] aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-[#D4AF37]/40 bg-[#0F3D3E] transition-transform hover:-translate-y-2 ${fan}`}
                        title={book.title}
                      >
                        <Image
                          src={coverUrl(book.coverImage)}
                          alt={`Cover of ${book.title}`}
                          fill
                          sizes="(max-width: 768px) 46vw, 180px"
                          className="object-cover"
                          priority={idx === 0}
                        />
                      </Link>
                    );
                  })}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-serif font-bold text-white">Recently published by Harglim authors</p>
                  <Link href="/books" className="inline-flex items-center gap-1 text-xs font-bold text-[#D4AF37] hover:underline">
                    Browse all books <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </>
            ) : (
              <div className="w-full max-w-sm rounded-3xl border-2 border-[#D4AF37]/40 bg-white/5 p-10 flex flex-col items-center text-center gap-4">
                <div className="relative h-28 w-28">
                  <Image src="/logo.png" alt="Harglim Publishers" fill sizes="112px" className="object-contain" />
                </div>
                <p className="font-serif font-bold text-lg text-white">Your book could be next</p>
                <p className="text-xs text-white/70">Editing, design, ISBN and distribution handled for you.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. TRUST STRIP (NEW LOGOS / MARQUEE) */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-6 bg-white border-b border-[#E2E6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-xs font-bold uppercase tracking-wider text-[#5C6E6E]">
            Published worldwide across major platforms:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs font-serif font-bold text-[#0F3D3E]/80">
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" /> Amazon Kindle</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" /> Flipkart Assured</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" /> IngramSpark Global</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" /> Google Play Books</span>
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" /> Barnes & Noble</span>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. HOW IT WORKS (Visual Timeline) */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
            4-Step Seamless Journey
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            How Publishing Works With Us
          </h2>
          <p className="text-sm text-[#5C6E6E]">
            Our step-by-step workflow ensures your book reaches perfection without any confusion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {stepGuide.map((step, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Card className="bg-white border border-[#E2E6DF] hover:border-[#D4AF37] rounded-2xl p-6 shadow-xs hover:shadow-xl transition-all h-full flex flex-col justify-between space-y-4 text-center">
                <div className="h-12 w-12 rounded-2xl bg-[#0F3D3E] text-[#D4AF37] font-serif font-bold text-xl flex items-center justify-center mx-auto shadow-xs">
                  {step.step}
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">{step.title}</h3>
                  <p className="text-xs text-[#5C6E6E] leading-relaxed">{step.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. SERVICES SECTION (Premium Grid Cards) */}
      {/* ------------------------------------------------------------------ */}
      <section id="services" className="py-16 sm:py-20 bg-white border-y border-[#E2E6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
              End-to-End Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
              Our Editorial & Publishing Services
            </h2>
            <p className="text-sm text-[#5C6E6E]">
              Everything you need to craft a successful, high-converting book.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishingServices.map((service, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-[#F8F9F7] border border-[#E2E6DF] hover:border-[#0F3D3E] rounded-2xl p-6 shadow-xs hover:shadow-lg transition-all space-y-4 h-full flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center shadow-xs">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">{service.title}</h3>
                    <p className="text-xs text-[#5C6E6E] leading-relaxed">{service.description}</p>
                  </div>
                  
                  <ul className="space-y-2 pt-4 border-t border-[#E2E6DF]">
                    {service.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2 text-xs font-semibold text-[#0F3D3E]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. PUBLISHING PACKAGES (Admin → Publishing Packages, GET /publish-packages) */}
      {/* ------------------------------------------------------------------ */}
      <section id="packages" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
            Transparent Pricing Plans
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            Choose Your Publishing Package
          </h2>
          <p className="text-sm text-[#5C6E6E]">
            Select the plan that aligns with your publishing vision and marketing goals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {loadingPackages &&
            [0, 1, 2].map((i) => (
              <div key={`pkg-skeleton-${i}`} className="rounded-3xl border border-[#E2E6DF] bg-white p-8 space-y-4 animate-pulse">
                <div className="h-6 w-2/3 rounded bg-[#0F3D3E]/10" />
                <div className="h-3 w-full rounded bg-[#0F3D3E]/5" />
                <div className="h-10 w-1/2 rounded bg-[#0F3D3E]/10" />
                <div className="space-y-2 pt-4">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="h-3 w-5/6 rounded bg-[#0F3D3E]/5" />
                  ))}
                </div>
              </div>
            ))}
          {!loadingPackages &&
            packages.map((pkg) => (
              <motion.div
                key={pkg._id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className={`flex ${pkg.highlighted ? "lg:scale-105" : ""}`}
              >
                <PackageCard pkg={pkg} href={packageHref(pkg)} />
              </motion.div>
            ))}
        </div>

        {!loadingPackages && packages.length === 0 && (
          <div className="max-w-xl mx-auto text-center rounded-3xl border border-[#E2E6DF] bg-white p-8 space-y-3">
            <p className="font-serif font-bold text-lg text-[#0F3D3E]">
              {packagesError ? "We couldn't load our packages right now." : "Our publishing packages are being updated."}
            </p>
            <p className="text-sm text-[#5C6E6E]">
              {packagesError ? "Please try again in a moment." : "Contact us and we'll help you choose the right plan."}
            </p>
            {packagesError ? (
              <Button onClick={() => loadPackages(true)} className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold">
                Try again
              </Button>
            ) : (
              <Link href="/contact" className="inline-block">
                <Button className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold">Contact us</Button>
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Author Spotlight (GET /spotlights), under the packages */}
      <SpotlightSection />

      {/* ------------------------------------------------------------------ */}
      {/* 6. FINAL CONVERSION CTA SECTION */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white rounded-3xl p-8 sm:p-14 text-center shadow-2xl border-2 border-[#D4AF37]/40 space-y-6">
          <BookOpen className="h-14 w-14 text-[#D4AF37] mx-auto" />
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white">
            Your Story Deserves to Be Published
          </h2>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mx-auto font-light leading-relaxed">
            Submit your manuscript and our editorial team will review it and guide you through every step to publication.
          </p>
          <Link href="/dashboard/become-author" className="inline-block">
            <Button
              size="lg"
              className="bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-14 px-10 rounded-xl shadow-lg gap-2 text-base"
            >
              <span>Start Your Publishing Journey</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
