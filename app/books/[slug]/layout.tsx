import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const getBookData = async (slug: string) => {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';
    const res = await fetch(`${API_URL}/books/${slug}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || data;
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const book = await getBookData(slug);
  
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }} />
      {children}
    </>
  );
}
