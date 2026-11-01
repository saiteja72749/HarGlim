import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Template repeated here: a plain title would stop the root template reaching child pages.
  title: { default: 'Book Categories', template: '%s | Harglim Publishers' },
  description:
    'Explore books by category and discover stories, practical guides, and new releases from Harglim Publishers.',
  alternates: { canonical: '/categories' },
};

export default function CategoriesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
