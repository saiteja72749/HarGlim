"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PackageCard as PackageCardData } from "@/lib/publish-packages";

/**
 * One publishing package as the Publish page shows it. Admin → Publishing Packages renders the
 * same component as a live preview, so what the admin sees is exactly what authors see.
 * Without `href` (the preview) the button is shown but does nothing.
 */
export function PackageCard({ pkg, href }: { pkg: Partial<PackageCardData>; href?: string }) {
  const isHighlighted = Boolean(pkg.highlighted);
  const button = (
    <Button
      type="button"
      tabIndex={href ? undefined : -1}
      className={`w-full h-12 font-serif font-bold text-sm rounded-xl transition-all ${
        isHighlighted
          ? "bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] shadow-md"
          : "bg-[#0F3D3E] hover:bg-[#174C4D] text-white"
      }`}
    >
      <span>Select Plan & Submit</span>
      <ArrowRight className="h-4 w-4 ml-2" />
    </Button>
  );

  return (
    <Card
      className={`w-full rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 relative ${
        isHighlighted
          ? "bg-[#0F3D3E] text-white border-2 border-[#D4AF37] shadow-2xl"
          : "bg-white text-[#0F3D3E] border border-[#E2E6DF] shadow-xs hover:shadow-xl"
      }`}
    >
      {isHighlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs px-4 py-1 rounded-full shadow-md whitespace-nowrap">
            ⭐ {pkg.badge?.trim() || "Most Popular Choice"}
          </Badge>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className={`font-serif font-bold text-2xl break-words ${isHighlighted ? "text-white" : "text-[#0F3D3E]"}`}>
            {pkg.name?.trim() || "Package name"}
          </h3>
          <p className={`text-xs mt-1 ${isHighlighted ? "text-white/70" : "text-[#5C6E6E]"}`}>
            {pkg.tagline?.trim() || pkg.description?.trim() || "Comprehensive publishing services"}
          </p>
        </div>

        <div className="flex items-baseline gap-1">
          <span className={`text-4xl font-serif font-bold ${isHighlighted ? "text-[#D4AF37]" : "text-[#0F3D3E]"}`}>
            ₹{Number(pkg.price || 0).toLocaleString("en-IN")}
          </span>
          <span className={`text-xs ${isHighlighted ? "text-white/60" : "text-[#5C6E6E]"}`}>/ one-time</span>
        </div>

        <ul className="space-y-3 pt-4 border-t border-current/10">
          {(pkg.features || []).map((feat, fIdx) => (
            <li key={fIdx} className="flex items-center gap-2.5 text-xs font-medium">
              <Check className={`h-4 w-4 shrink-0 ${isHighlighted ? "text-[#D4AF37]" : "text-emerald-600"}`} />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-8">
        {href ? (
          <Link href={href} className="block">
            {button}
          </Link>
        ) : (
          button
        )}
      </div>
    </Card>
  );
}
