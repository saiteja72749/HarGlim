"use client";

import { useSiteContent } from "@/context/site-content-context";
import { siteConfig } from "@/config/site";
import { serializeJsonLd } from "@/lib/json-ld";
import { getSafeExternalUrl } from "@/lib/utils";

export function SiteStructuredData() {
  const { content, loading } = useSiteContent();
  if (loading) return null;
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: content.aboutSubtitle || content.homeSubtitle || undefined,
    sameAs: [content.socialFacebook, content.socialTwitter, content.socialInstagram, content.socialLinkedin].filter((url) => getSafeExternalUrl(url)),
    contactPoint: content.contactEmail || content.contactPhone ? {
      '@type': 'ContactPoint',
      telephone: content.contactPhone || undefined,
      contactType: 'customer support',
      email: content.contactEmail || undefined,
    } : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }} />;
}
