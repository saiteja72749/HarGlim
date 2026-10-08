"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";
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
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSiteContent } from "@/context/site-content-context";
import { useAuthStore } from "@/store/auth-store";

// Default curated publishing packages for HarGlim Publishers
// Accepts a package array or the wrapped `[{ packages: [...] }]` shape of CMS packagesJson,
// and turns text prices like "₹999/-" into numbers. Unwanted packages are archived by an
// admin (Admin → Publishing Packages), not filtered here.
const normalizePackages = (raw: any): any[] => {
  let list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.packages) ? raw.packages : [];
  if (list.length > 0 && list.every((item) => Array.isArray(item?.packages))) {
    list = list.flatMap((item) => item.packages);
  }
  return list
    .filter((p) => p?.name && p.isActive !== false)
    .map((p) => ({
      ...p,
      price: typeof p.price === "number" ? p.price : Number(String(p.price ?? "").replace(/[^0-9.]/g, "")) || 0,
    }));
};

const defaultPackages = [
  {
    id: "pkg-999",
    name: "Starter Package",
    tagline: "Essential e-book & digital publishing starter kit",
    price: 999,
    highlighted: false,
    features: [
      "ISBN & Barcode Allocation",
      "Cover Design",
      "Book formatting & Manuscript design",
      "E-book & E-certificate",
      "50% Royalty",
      "Author copies at printing cost (Lifetime)",
      "Book available on Amazon and Kindle",
      "Page limit – 120",
      "Book launch poster",
      "Books will be taken to book fairs under HarGlim (if the author pays for copies)"
    ]
  },
  {
    id: "pkg-1999",
    name: "Standard Package",
    tagline: "Standard paperback publishing with 80% royalty share",
    price: 1999,
    highlighted: false,
    features: [
      "ISBN & Barcode Allocation",
      "Cover Design",
      "Book formatting & Manuscript design",
      "1 Author copy (Paperback)",
      "Certificate",
      "80% Royalty",
      "Author copies at printing cost (Lifetime)",
      "Book available on Amazon and Kindle",
      "Page limit – 120",
      "Book launch poster",
      "Books will be taken to book fairs under HarGlim (if the author pays for copies)"
    ]
  },
  {
    id: "pkg-2999",
    name: "Silver Package",
    tagline: "100% Royalty & global distribution across 12+ platforms",
    price: 2999,
    highlighted: false,
    features: [
      "ISBN & Barcode Allocation",
      "Cover Design",
      "Book formatting & Manuscript design",
      "2 Author copies (Paperback)",
      "Certificate",
      "100% Royalty",
      "Author copies at printing cost (Lifetime)",
      "Book available on Amazon, Kindle, and 12+ International platforms",
      "Page limit – 150",
      "Book launch posters",
      "Books will be taken to book fairs under HarGlim (if the author pays for copies)"
    ]
  },
  {
    id: "pkg-3499",
    name: "Gold Package",
    tagline: "Extended 300 page limit & full global distribution",
    price: 3499,
    highlighted: false,
    features: [
      "ISBN & Barcode Allocation",
      "Cover Design",
      "Book formatting & Manuscript design",
      "2 Author copies (Paperback)",
      "Certificate",
      "100% Royalty",
      "Author copies at printing cost (Lifetime)",
      "Book available on Amazon, Kindle, and 12+ International platforms",
      "Page limit – 300",
      "Book launch posters",
      "Books will be taken to book fairs under HarGlim (if the author pays for copies)"
    ]
  },
  {
    id: "pkg-4999",
    name: "Platinum Bestseller Package",
    tagline: "Full promotional kit with video trailer & author interview",
    price: 4999,
    highlighted: true,
    badge: "Most Popular Choice",
    features: [
      "ISBN & Barcode Allocation",
      "Cover Design",
      "Book formatting & Manuscript design",
      "4 Author copies (Paperback)",
      "Certificate",
      "100% Royalty",
      "Author copies at printing cost (Lifetime)",
      "Book available on Amazon, Kindle, and 12+ International platforms",
      "Page limit – 250",
      "Book launch posters",
      "Books will be taken to book fairs under HarGlim (if the author pays for copies)",
      "Video trailer",
      "Author interview (Recorded video will be sent to the author and posted on our social media)"
    ]
  },
  {
    id: "pkg-9999",
    name: "VIP Executive Mastermind",
    tagline: "Ultimate publishing package with 1-on-1 dedicated guide & custom bookmarks",
    price: 9999,
    highlighted: false,
    features: [
      "ISBN & Barcode Allocation",
      "Cover Design (2 options)",
      "Professional Customised Book formatting & Manuscript design",
      "6 Author copies (Paperback)",
      "Certificate",
      "100% Royalty",
      "Author copies at printing cost (Lifetime)",
      "Book available on Amazon, Kindle, and 12+ International platforms",
      "Page limit – 300",
      "Book launch posters",
      "Books will be taken to book fairs under HarGlim (if the author pays for copies)",
      "Author interview (Recorded video will be sent to the author and posted on our social media)",
      "Bookmarks with book cover image & author's signature (30)",
      "Video trailer",
      "Dedicated project guide assigned (5 sessions, 1 hour each, complete guidance from scratch)"
    ]
  }
];

const publishingServices = [
  {
    icon: Edit3,
    title: "Professional Editorial",
    description: "Expert developmental editors, copyeditors, and proofreaders refine your narrative for global publication standards.",
    features: ["Developmental review", "Line editing", "Proofreading", "Style consistency"],
  },
  {
    icon: ImageIcon,
    title: "Bespoke Cover Design",
    description: "Eye-catching, original cover artwork designed by luxury publishing graphic artists.",
    features: ["Original illustration", "Typography hierarchy", "Hardcover & paperback formats", "3D digital mockups"],
  },
  {
    icon: FileText,
    title: "Interior Typesetting",
    description: "Elegant page layout and interior typography crafted for effortless reading across print and e-readers.",
    features: ["Custom font sizing", "EPUB & Kindle formats", "Print-ready PDFs", "Chapter flourishes"],
  },
  {
    icon: Megaphone,
    title: "Marketing & Launch Campaign",
    description: "Multi-channel marketing strategy to launch your book into bestseller lists.",
    features: ["Social media campaign", "Press release distribution", "Author brand kit", "Bookstore pitching"],
  },
  {
    icon: Truck,
    title: "Nationwide & Global Distribution",
    description: "Direct listing across Amazon, Flipkart, online marketplaces, and brick-and-mortar bookstores.",
    features: ["Amazon Kindle & Prime", "Flipkart listing", "International distribution", "Direct order fulfillment"],
  },
  {
    icon: DollarSign,
    title: "Transparent Royalties",
    description: "Industry-leading royalty shares with real-time Dashboard tracking and monthly automated payouts.",
    features: ["Up to 70% net royalties", "Monthly bank payouts", "Transparent Dashboard", "Zero hidden deductions"],
  },
];

const stepGuide = [
  {
    step: 1,
    title: "Submit Manuscript",
    description: "Upload your draft manuscript through our secure author portal in minutes.",
  },
  {
    step: 2,
    title: "Editorial Evaluation",
    description: "Senior editors review your submission and provide detailed feedback within 7 days.",
  },
  {
    step: 3,
    title: "Editing & Design",
    description: "Collaborate closely with dedicated editors and cover designers to perfect your book.",
  },
  {
    step: 4,
    title: "Publish & Launch",
    description: "Your book goes live across global retail networks with automated monthly royalty payouts.",
  },
];

export default function PublishPage() {
  const { content } = useSiteContent();
  const role = useAuthStore((state) => state.user?.role);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [authorsCount, setAuthorsCount] = useState(0);

  useEffect(() => {
    const fetchAuthorsCount = async () => {
      try {
        const { data } = await api.get("/authors?limit=1");
        const total = data?.pagination?.total ?? data?.data?.pagination?.total;
        if (typeof total === "number") setAuthorsCount(total);
      } catch {
        // Keep zero on failure
      }
    };
    fetchAuthorsCount();
  }, []);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoadingPackages(true);
      try {
        // GET /publish-packages is the package database (active only, sorted by price).
        // Its _id is what manuscript submission sends as packageId.
        const { data } = await api.get("/publish-packages").catch(() => ({ data: { data: [] } }));
        const realPkgs = normalizePackages(data?.data ?? data).map((p) => ({ ...p, isRealPackage: true }));
        if (realPkgs.length > 0) {
          setPackages(realPkgs);
          return;
        }

        // No real packages yet: CMS packagesJson is display copy only (never a packageId source).
        let sitePkgs: any[] = [];
        try {
          sitePkgs = content?.packagesJson ? normalizePackages(JSON.parse(content.packagesJson)) : [];
        } catch {
          sitePkgs = [];
        }
        setPackages(sitePkgs.length > 0 ? sitePkgs : defaultPackages);
      } catch {
        setPackages(defaultPackages);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [content?.packagesJson]);

  // Approved authors go straight to submission with the package preselected; everyone else
  // must apply to become an author first.
  const packageHref = (pkg: any) =>
    role === "author" && pkg.isRealPackage && pkg._id
      ? `/author/manuscripts/new?packageId=${encodeURIComponent(pkg._id)}`
      : role === "author"
        ? "/author/manuscripts/new"
        : "/dashboard/become-author";

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
              Turn Your Manuscript Into a Published Book
            </h1>

            <p className="text-base sm:text-lg text-white/80 max-w-xl mx-auto lg:mx-0 font-light leading-relaxed">
              From professional editing to cover design and global retail distribution — we handle everything so you can focus on writing.
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
                  <span className="font-serif font-bold text-lg text-white">Up to 70%</span>
                </div>
                <p className="text-[11px] text-white/70">Author Royalties</p>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Book Mockup / Author Card */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative w-full max-w-sm aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl border-4 border-[#D4AF37]/40 bg-[#0F3D3E]"
            >
              <Image
                src="/logo.webp"
                onError={(e: any) => { if (e?.target) e.target.src = "/logo.webp"; }}
                alt="Book Publishing Mockup"
                fill
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-6 flex flex-col justify-end text-white">
                <Badge className="w-fit bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs mb-2">
                  ⭐ Harglim Original Release
                </Badge>
                <h3 className="font-serif font-bold text-xl text-white">The Art of Storytelling</h3>
                <p className="text-xs text-white/70">Turn your imagination into published reality</p>
              </div>
            </motion.div>
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
      {/* 5. PUBLISHING PACKAGES SECTION (FIXED - NO EMPTY STATE) */}
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
          {!loadingPackages && packages.map((pkg, idx) => {
            const isHighlighted = pkg.highlighted;

            return (
              <motion.div
                key={pkg.id || pkg._id || idx}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex"
              >
                <Card
                  className={`w-full rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
                    isHighlighted
                      ? "bg-[#0F3D3E] text-white border-2 border-[#D4AF37] shadow-2xl scale-105"
                      : "bg-white text-[#0F3D3E] border border-[#E2E6DF] shadow-xs hover:shadow-xl"
                  }`}
                >
                  {isHighlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs px-4 py-1 rounded-full shadow-md">
                        ⭐ Most Popular Choice
                      </Badge>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className={`font-serif font-bold text-2xl ${isHighlighted ? "text-white" : "text-[#0F3D3E]"}`}>
                        {pkg.name}
                      </h3>
                      <p className={`text-xs mt-1 ${isHighlighted ? "text-white/70" : "text-[#5C6E6E]"}`}>
                        {pkg.tagline || pkg.description || "Comprehensive publishing services"}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-serif font-bold ${isHighlighted ? "text-[#D4AF37]" : "text-[#0F3D3E]"}`}>
                        ₹{Number(pkg.price || 0).toLocaleString("en-IN")}
                      </span>
                      <span className={`text-xs ${isHighlighted ? "text-white/60" : "text-[#5C6E6E]"}`}>/ one-time</span>
                    </div>

                    <ul className="space-y-3 pt-4 border-t border-current/10">
                      {pkg.features?.map((feat: string, fIdx: number) => (
                        <li key={fIdx} className="flex items-center gap-2.5 text-xs font-medium">
                          <Check className={`h-4 w-4 shrink-0 ${isHighlighted ? "text-[#D4AF37]" : "text-emerald-600"}`} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-8">
                    <Link href={packageHref(pkg)} className="block">
                      <Button
                        className={`w-full h-12 font-serif font-bold text-sm rounded-xl transition-all ${
                          isHighlighted
                            ? "bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] shadow-md"
                            : "bg-[#0F3D3E] hover:bg-[#174C4D] text-white"
                        }`}
                      >
                        <span>Select Plan & Submit</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

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
            Limited editorial slots available for new authors this month. Submit your manuscript today for priority evaluation.
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
