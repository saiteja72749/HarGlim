import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchRecord, MISSING, notFoundMetadata } from '@/lib/fetch-record';
import { serializeJsonLd } from '@/lib/json-ld';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

// Author URLs use the Mongo _id; anything else cannot exist.
const getAuthorData = async (id: string) =>
  /^[a-f0-9]{24}$/i.test(id) ? fetchRecord(`/authors/${id}`) : MISSING;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const author = await getAuthorData(id);
  
  if (author === MISSING) return notFoundMetadata;
  if (!author) return {};
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com';

  const title = `${author.name} | Author Profile`;
  const description = author.bio || `Read books by ${author.name} on Harglim Publishers.`;

  return {
    title,
    description: description.substring(0, 160),
    alternates: {
      canonical: `${APP_URL}/authors/${id}`,
    },
    openGraph: {
      title,
      description: description.substring(0, 160),
      images: author.profileImage ? [author.profileImage] : [],
      url: `${APP_URL}/authors/${id}`,
    },
  };
}

export default async function AuthorLayout({ children, params }: Props) {
  const resolvedParams = await params;
  const author = await getAuthorData(resolvedParams.id);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://harglim.com';

  if (author === MISSING) notFound();
  if (!author) return <>{children}</>;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    image: author.profileImage,
    description: author.bio,
    url: `${APP_URL}/authors/${resolvedParams.id}`,
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
        name: 'Authors',
        item: `${APP_URL}/authors`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: author.name,
        item: `${APP_URL}/authors/${resolvedParams.id}`,
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
