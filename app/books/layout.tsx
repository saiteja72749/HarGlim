import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Books',
  description:
    'Browse books published by Harglim Publishers, discover new authors, and find your next great read.',
  alternates: { canonical: '/books' },
};

export default function BooksLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
