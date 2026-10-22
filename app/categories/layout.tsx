import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book Categories',
  description:
    'Explore books by category and discover stories, practical guides, and new releases from Harglim Publishers.',
  alternates: { canonical: '/categories' },
};

export default function CategoriesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
