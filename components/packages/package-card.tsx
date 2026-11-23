"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PackageCard as PackageCardData } from "@/lib/publish-packages";
import { publishedNumber } from "@/lib/book-presentation";

/**
 * One publishing package as the Publish page shows it. Admin → Publishing Packages renders the
 * same component as a live preview, so what the admin sees is exactly what authors see.
 * Without `href`, the admin preview uses a disabled action.
 */
export function PackageCard({ pkg, href }: { pkg: Partial<PackageCardData>; href?: string }) {
  const isHighlighted = pkg.highlighted === true;
  const price = publishedNumber(pkg.price);
  const description = pkg.tagline?.trim() || pkg.description?.trim();
  const canNavigate = Boolean(href) && price !== null;
  const button = (
    <Button
      asChild={canNavigate}
      disabled={!canNavigate}
      className={`w-full h-12 font-serif font-bold text-sm rounded-xl transition-all ${
        isHighlighted
          ? "bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] shadow-md"
          : "bg-[#0F3D3E] hover:bg-[#174C4D] text-white"
      }`}
    >
      {canNavigate ? <Link href={href!}><span>Choose package</span><ArrowRight className="h-4 w-4" /></Link> : <span>{price === null ? "Price unavailable" : "Choose package"}</span>}
    </Button>
  );

  return (
    <Card
      className={`w-full min-w-0 rounded-3xl p-5 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
        isHighlighted
          ? "bg-[#0F3D3E] text-white border-2 border-[#D4AF37] shadow-2xl"
          : "bg-white text-[#0F3D3E] border border-[#E2E6DF] shadow-xs hover:shadow-xl"
      }`}
    >
      {isHighlighted && pkg.badge?.trim() && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 max-w-[90%]">
          <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs px-4 py-1 rounded-full shadow-md whitespace-normal text-center">
            {pkg.badge.trim()}
          </Badge>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className={`font-serif font-bold text-2xl break-words ${isHighlighted ? "text-white" : "text-[#0F3D3E]"}`}>
            {pkg.name?.trim() || "Package name unavailable"}
          </h3>
          {description && <p className={`text-xs mt-1 [overflow-wrap:anywhere] ${isHighlighted ? "text-white/70" : "text-[#5C6E6E]"}`}>{description}</p>}
        </div>

        <div className="flex flex-wrap items-baseline gap-1 [overflow-wrap:anywhere]">
          <span className={`text-3xl sm:text-4xl font-serif font-bold ${isHighlighted ? "text-[#D4AF37]" : "text-[#0F3D3E]"}`}>
            {price === null ? "Price unavailable" : `₹${price.toLocaleString("en-IN")}`}
          </span>
        </div>

        <ul className="space-y-3 pt-4 border-t border-current/10">
          {(pkg.features || []).map((feat, fIdx) => (
            <li key={fIdx} className="flex items-center gap-2.5 text-xs font-medium">
              <Check className={`h-4 w-4 shrink-0 ${isHighlighted ? "text-[#D4AF37]" : "text-emerald-600"}`} />
              <span className="min-w-0 [overflow-wrap:anywhere]">{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-8">
        {button}
      </div>
    </Card>
  );
}
