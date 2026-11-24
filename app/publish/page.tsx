"use client";

import { scheduleRequest } from "@/lib/schedule-request";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from '@/components/ui/backend-image';
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
  Users,
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
import { parseCollectionPage } from "@/lib/catalog-data";

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
  const [authorsCount, setAuthorsCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchAuthorsCount = async () => {
      try { setAuthorsCount((await fetchPublicStats()).authorsCount); }
      catch { setAuthorsCount(null); }
    };
    fetchAuthorsCount();
  }, []);

  // Hero showcase: the newest published books that have a cover.
  const [showcase, setShowcase] = useState<{ _id: string; slug?: string; title: string; coverImage: string }[]>([]);
  useEffect(() => {
    api
      .get("/books", { params: { limit: 8 } })
      .then(({ data }) => {
        const { items } = parseCollectionPage<{ _id: string; slug?: string; title: string; coverImage: string }>(data, "books");
        setShowcase(items.filter((book) => typeof book.coverImage === "string" && /^(https?:\/\/|\/(?!\/))/.test(book.coverImage)).slice(0, 3));
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

  useEffect(() => scheduleRequest(() => loadPackages(true)), [loadPackages]);

  useEffect(() => {
    return onPackagesChanged(() => loadPackages(false));
  }, [loadPackages]);

  // Approved authors go straight to submission with the package preselected; everyone else
  // must apply to become an author first.
  const packageHref = (pkg: PackageCardData) =>
    `${role === "author" ? "/author/manuscripts/new" : "/dashboard/become-author"}?packageId=${encodeURIComponent(pkg._id || "")}`;

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E] font-sans">
      
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO SECTION (Conversion Focused) */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white py-[var(--site-section-space)] overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column Text & CTAs */}
          <div className={showcase.length ? "space-y-6 text-center lg:col-span-7 lg:text-left" : "space-y-6 text-center lg:col-span-12"}>
            <h1 className="font-serif text-[clamp(2rem,5vw,4rem)] font-bold leading-tight tracking-tight">
              {content.publishTitle || "Publish with Us"}
            </h1>
            {content.publishSubtitle && (
              <p className="mx-auto max-w-xl text-base leading-relaxed text-white/85 lg:mx-0">{content.publishSubtitle}</p>
            )}

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold h-14 px-8 rounded-full transition-colors gap-2 text-base"
                 asChild><Link href={role === "author" ? "/author/manuscripts/new" : "/dashboard/become-author"}>
                  <span>Submit Manuscript</span>
                  <ArrowRight className="h-4 w-4" />
                </Link></Button>
              <Button
                  size="lg"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border-2 border-white/40 text-white font-serif font-bold h-14 px-8 rounded-full text-base transition-all"
                 asChild><Link href="#packages">
                  <span>View Packages</span>
                </Link></Button>
            </div>

            {authorsCount !== null && (
              <Link href="/authors" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/85 hover:underline">
                <Users className="size-4" aria-hidden="true" /> {authorsCount.toLocaleString("en-IN")} published authors
              </Link>
            )}
          </div>

          {/* Right Column: real books published by Harglim authors */}
          {showcase.length > 0 && (
            <div className="flex flex-col items-center gap-5 lg:col-span-5">
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
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. HOW IT WORKS (Visual Timeline) */}
      {/* ------------------------------------------------------------------ */}
      {stepGuide.length > 0 && <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
            4-Step Seamless Journey
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
            How Publishing Works With Us
          </h2>
          <p className="text-sm text-[#5C6E6E]">
            See the steps from manuscript review to publication.
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
      </section>}

      {/* ------------------------------------------------------------------ */}
      {/* 4. SERVICES SECTION (Premium Grid Cards) */}
      {/* ------------------------------------------------------------------ */}
      {publishingServices.length > 0 && <section id="services" className="py-16 sm:py-20 bg-white border-y border-[#E2E6DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
              End-to-End Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
              Our Editorial & Publishing Services
            </h2>
            <p className="text-sm text-[#5C6E6E]">
              Explore the services available for your manuscript.
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
      </section>}

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
                className="flex min-w-0"
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
              <Button className="bg-[#0F3D3E] hover:bg-[#174C4D] text-white font-bold" asChild><Link href="/contact" className="inline-block">Contact us</Link></Button>
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
          <Button
              size="lg"
              className="w-full sm:w-auto max-w-full bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold min-h-14 h-auto py-3 px-4 sm:px-10 rounded-xl shadow-lg gap-2 text-sm sm:text-base whitespace-normal"
             asChild><Link href={role === "author" ? "/author/manuscripts/new" : "/dashboard/become-author"} className="inline-block">
              <span>Start Your Publishing Journey</span>
              <ArrowRight className="h-5 w-5" />
            </Link></Button>
        </div>
      </section>

    </div>
  );
}
