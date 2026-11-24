"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Target, Heart, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { editedContent, useSiteContent } from "@/context/site-content-context";
import { readSection } from "@/lib/page-content";
import { fetchPublicStats } from "@/lib/public-stats";

const VALUE_ICONS = [Target, Heart, Sparkles];


export default function AboutPage() {
  const { content } = useSiteContent();
  const aboutTitle = editedContent(content, "aboutTitle");
  const aboutSubtitle = editedContent(content, "aboutSubtitle");
  const aboutMission = editedContent(content, "aboutMission");
  const aboutVision = editedContent(content, "aboutVision");
  const values = readSection<{ title: string; description: string }>(content, "aboutValuesJson").map((value, idx) => ({
    ...value,
    icon: VALUE_ICONS[idx % VALUE_ICONS.length],
  }));
  const team = readSection<{ name: string; role: string; image?: string; bio?: string }>(content, "aboutTeamJson");
  // null until the backend answers, so the counters never flash "0+" on refresh.
  const [liveStats, setLiveStats] = useState<{ booksCount: number; authorsCount: number } | null>(null);

  useEffect(() => {
    const fetchLiveStats = async () => {
      try { setLiveStats(await fetchPublicStats()); } catch { setLiveStats(null); }
    };
    fetchLiveStats();
  }, []);

  const stats = liveStats ? [
    { label: "Books published", value: liveStats.booksCount, icon: BookOpen, href: "/books" },
    { label: "Authors", value: liveStats.authorsCount, icon: Users, href: "/authors" },
  ] : [];

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E] font-sans">
      
      {/* 1. HERO SECTION */}
      <section className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white py-[var(--site-section-space)] overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Our Publishing Philosophy</span>
          </div>

          <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-serif font-bold text-white tracking-tight">
            {aboutTitle || "About Harglim Publishers"}
          </h1>

          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
            {aboutSubtitle}
          </p>
        </div>
      </section>

      {(aboutMission || aboutVision) && (
        <section className="mx-auto max-w-4xl space-y-6 px-4 py-[var(--site-section-space)] sm:px-6">
          <h2 className="font-serif text-3xl font-semibold">Our mission and vision</h2>
          {aboutMission && <div className="space-y-4 text-base leading-relaxed text-[var(--body-ink)]">
            {aboutMission.split(/\n\s*\n/).filter((part) => part.trim()).map((part, index) => (
              <p className="whitespace-pre-line" key={index}>{part.trim()}</p>
            ))}
          </div>}
          {aboutVision && <p className="whitespace-pre-line border-l-2 border-secondary pl-4 text-base leading-relaxed">
            <strong className="font-medium">Our vision</strong><br />{aboutVision}
          </p>}
        </section>
      )}

      {/* 4. CORE VALUES */}
      {values.length > 0 && <section className="border-y bg-card py-[var(--site-section-space)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
              What Guides Us
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
              Our Core Principles
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map((v, idx) => (
              <Card key={idx} className="bg-[#F8F9F7] border border-[#E2E6DF] rounded-2xl p-6 shadow-xs text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-[#0F3D3E] text-[#D4AF37] flex items-center justify-center mx-auto shadow-xs">
                  <v.icon className="h-7 w-7" />
                </div>
                <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">{v.title}</h3>
                <p className="text-xs text-[#5C6E6E] leading-relaxed">{v.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>}

      {/* 5. TEAM (Admin → Site Content → Page Sections → Team members) */}
      {team.length > 0 && (
        <section id="team" className="py-16 sm:py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">Leadership</span>
            <h2 className="text-3xl font-serif font-bold text-[#0F3D3E]">{team.length === 1 ? "Meet Our Founder" : "Meet Our Team"}</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            {team.map((member, idx) => (
              <div key={`${member.name}-${idx}`} className="bg-white border border-[#E2E6DF] rounded-3xl p-8 shadow-xs w-full max-w-xs space-y-4">
                <div className="relative h-28 w-28 rounded-full overflow-hidden border-4 border-[#0F3D3E] mx-auto shadow-md bg-[#F8F9F7]">
                  {member.image ? (
                    // Admin-supplied URLs can be on any host, so a plain img avoids next/image domain config.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.image}
                      alt={`Portrait of ${member.name}, ${member.role} at Harglim Publishers`}
                      width={112}
                      height={112}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Users className="h-10 w-10 text-[#0F3D3E]/40 absolute inset-0 m-auto" />
                  )}
                </div>
                <div>
                  <h3 className="font-serif font-bold text-xl text-[#0F3D3E]">{member.name}</h3>
                  <p className="text-xs text-[#8A6D1E] font-bold uppercase tracking-wider mt-0.5">{member.role}</p>
                </div>
                {member.bio && <p className="text-xs text-[#5C6E6E] leading-relaxed">{member.bio}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
      {stats.length > 0 && (
        <section className="mx-auto grid max-w-4xl gap-3 px-4 pt-8 sm:grid-cols-2 sm:px-6" aria-label="Authors and books">
          {stats.map(({ label, value, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex min-h-11 items-center gap-3 rounded-xl border bg-card p-4 hover:bg-muted">
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span><strong>{value.toLocaleString("en-IN")}</strong> {label.toLowerCase()}</span>
            </Link>
          ))}
        </section>
      )}
      <section className="mx-auto max-w-4xl space-y-3 px-4 py-[var(--site-section-space)] sm:px-6">
        <h2 className="font-serif text-2xl font-semibold">Publish with Harglim</h2>
        <Button asChild><Link href="/publish">Explore publishing services</Link></Button>
      </section>
    </div>
  );
}
