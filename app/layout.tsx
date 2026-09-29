import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MainContainer } from '@/components/layout/main-container';
import { Providers } from './providers';
import { siteConfig } from '@/config/site';
import { NoiseOverlay } from '@/components/ui/noise-overlay';

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Harglim Publishers | Discover Your Next Great Read',
    template: '%s | Harglim Publishers',
  },
  description:
    'Publish your book or discover amazing reads from talented authors. Harglim Publishers - Where stories come to life.',
  keywords: [
    'book publishing',
    'authors',
    'books',
    'publishing house',
    'Indian publishers',
    'self publishing',
    'ebooks',
  ],
  authors: [{ name: 'Harglim Publishers' }],
  creator: 'Harglim Publishers',
  publisher: 'Harglim Publishers',
  openGraph: {
    title: 'Harglim Publishers',
    description: 'Discover Your Next Great Read',
    url: 'https://harglim.com',
    siteName: 'Harglim Publishers',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Harglim Publishers',
    description: 'Discover Your Next Great Read',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.webp`,
    description: siteConfig.description,
    sameAs: [
      siteConfig.social.facebook,
      siteConfig.social.twitter,
      siteConfig.social.instagram,
      siteConfig.social.linkedin,
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.contact.phonePrimary,
      contactType: 'customer support',
      email: siteConfig.contact.email,
    },
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteConfig.url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Providers>
          <NoiseOverlay />
          <Navbar />
          <MainContainer>{children}</MainContainer>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
