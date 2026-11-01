import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchRecord, MISSING, notFoundMetadata } from '@/lib/fetch-record';
import { serializeJsonLd } from '@/lib/json-ld';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const getBookData = (slug: string) => fetchRecord(`/books/${slug}`);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const book = await getBookData(slug);
  
  if (book === MISSING) return notFoundMetadata;
  if (!book) return {};
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com';

  return {
    title: book.title,
    description: book.description?.substring(0, 160),
    alternates: {
      canonical: `${APP_URL}/books/${slug}`,
    },
    openGraph: {
      title: book.title,
      description: book.description?.substring(0, 160),
      images: book.coverImage ? [book.coverImage] : [],
      url: `${APP_URL}/books/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: book.title,
      description: book.description?.substring(0, 160),
      images: book.coverImage ? [book.coverImage] : [],
    }
  };
}

export default async function BookLayout({ children, params }: Props) {
  const resolvedParams = await params;
  const book = await getBookData(resolvedParams.slug);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com';

  if (book === MISSING) notFound();
  if (!book) return <>{children}</>;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: {
      '@type': 'Person',
      name: (book.author && typeof book.author === 'object') ? book.author.name : (typeof book.author === 'string' ? book.author : 'Unknown Author'),
    },
    image: book.coverImage,
    description: book.description,
    isbn: book.isbn,
    offers: {
      '@type': 'Offer',
      price: book.price || 0,
      priceCurrency: 'INR',
      availability: book.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${APP_URL}/books/${resolvedParams.slug}`,
    },
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
        item: `${APP_URL}/books/${resolvedParams.slug}`,
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
