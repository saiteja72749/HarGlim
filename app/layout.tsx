import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { MainContainer } from '@/components/layout/main-container';
import { Providers } from './providers';
import { siteConfig } from '@/config/site';
import { serializeJsonLd } from '@/lib/json-ld';
import { SiteStructuredData } from '@/components/layout/site-structured-data';
import { NetworkStatus } from '@/components/layout/network-status';
import { fetchRecord, MISSING } from '@/lib/fetch-record';

const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: 'Harglim Publishers',
    template: '%s | Harglim Publishers',
  },
  description: '',
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
    description: '',
    url: siteConfig.url,
    siteName: 'Harglim Publishers',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Harglim Publishers',
    description: '',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const record = await fetchRecord<{ seo?: { title?: string; description?: string; image?: string; keywords?: unknown } }>('/content');
  const content = record === MISSING ? null : record;
  const seo = content?.seo;
  const title = typeof seo?.title === 'string' && seo.title.trim() ? seo.title : siteConfig.name;
  const description = typeof seo?.description === 'string' ? seo.description : undefined;
  const image = typeof seo?.image === 'string' && seo.image.trim() ? seo.image : undefined;
  return {
    ...baseMetadata,
    title: { default: title, template: `%s | ${siteConfig.name}` },
    description,
    keywords: Array.isArray(seo?.keywords) ? seo.keywords.filter((keyword: unknown) => typeof keyword === 'string') : typeof seo?.keywords === 'string' ? seo.keywords : undefined,
    openGraph: { ...baseMetadata.openGraph, title, description, images: image ? [image] : undefined },
    twitter: { ...baseMetadata.twitter, title, description, images: image ? [image] : undefined },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await fetchRecord('/content');
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
      <body className="flex min-h-svh flex-col font-sans antialiased">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
        <Providers initialContent={content === MISSING ? null : content}>
          <NetworkStatus />
          <SiteStructuredData />
          <Navbar />
          <MainContainer>{children}</MainContainer>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
