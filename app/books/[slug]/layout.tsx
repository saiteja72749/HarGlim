import type { Book } from "@/types";
import { siteConfig } from "@/config/site";
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchRecord, MISSING, notFoundMetadata } from '@/lib/fetch-record';
import { serializeJsonLd } from '@/lib/json-ld';
import { getBookAuthorInfo } from '@/lib/utils';
import { bookPresentation } from '@/lib/book-presentation';
import { metadataDescription } from '@/lib/seo-data';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const getBookData = (slug: string) => fetchRecord<Book>(`/books/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const book = await getBookData(resolvedParams.slug);
  
  if (book === MISSING) return notFoundMetadata;
  if (!book) return {};
  const APP_URL = siteConfig.url;
  const slug = encodeURIComponent(book.slug || resolvedParams.slug);

  return {
    title: book.title,
    description: metadataDescription(book.description),
    alternates: {
      canonical: `${APP_URL}/books/${slug}`,
    },
    openGraph: {
      title: book.title,
      description: metadataDescription(book.description),
      images: book.coverImage ? [book.coverImage] : [],
      url: `${APP_URL}/books/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: book.title,
      description: metadataDescription(book.description),
      images: book.coverImage ? [book.coverImage] : [],
    }
  };
}

export default async function BookLayout({ children, params }: Props) {
  const resolvedParams = await params;
  const book = await getBookData(resolvedParams.slug);
  const APP_URL = siteConfig.url;

  if (book === MISSING) notFound();
  if (!book) return <>{children}</>;

  const author = getBookAuthorInfo(book);
  const { price } = bookPresentation(book);
  const canonical = `${APP_URL}/books/${encodeURIComponent(book.slug || resolvedParams.slug)}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: author.name !== 'Author unavailable' ? {
      '@type': 'Person',
      name: author.name,
    } : undefined,
    image: book.coverImage,
    description: book.description,
    isbn: book.isbn,
    offers: price !== null ? {
      '@type': 'Offer',
      price,
      priceCurrency: 'INR',
      availability: typeof book.stock === 'number' ? (book.stock - (book.reservedStock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock') : undefined,
      url: canonical,
    } : undefined,
  };

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: APP_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Books',
        item: `${APP_URL}/books`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: book.title,
        item: canonical,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }} />
      {children}
    </>
  );
}
