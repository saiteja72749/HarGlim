import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serializeJsonLd } from '@/lib/json-ld';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

const getCategoryData = async (slug: string) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://harglimpublish-backend.onrender.com/api';
  const res = await fetch(`${API_URL}/categories/${slug}`, { next: { revalidate: 300 } }).catch(() => null);
  // A missing category is a real 404; network or server errors still render the page.
  if (res?.status === 404) notFound();
  if (!res?.ok) return null;
  try {
    const data = await res.json();
    return data.data || data;
  } catch {
    return null;
  }
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const category = await getCategoryData(slug);
  
  if (!category) return {};
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com';

  const title = `${category.name} Books`;
  const description = category.description || `Explore our collection of books in the ${category.name} category at Harglim Publishers.`;

  return {
    title,
    description: description.substring(0, 160),
    alternates: {
      canonical: `${APP_URL}/categories/${slug}`,
    },
    openGraph: {
      title,
      description: description.substring(0, 160),
      url: `${APP_URL}/categories/${slug}`,
    },
  };
}

export default async function CategoryLayout({ children, params }: Props) {
  const resolvedParams = await params;
  const category = await getCategoryData(resolvedParams.slug);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com';

  if (!category) return <>{children}</>;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Books`,
    description: category.description || `Explore our collection of books in the ${category.name} category at Harglim Publishers.`,
    url: `${APP_URL}/categories/${resolvedParams.slug}`,
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
        name: 'Categories',
        item: `${APP_URL}/categories`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${APP_URL}/categories/${resolvedParams.slug}`,
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbsJsonLd) }} />
      {children}
    </>
  );
}
