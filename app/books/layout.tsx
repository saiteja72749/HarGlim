import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Template repeated here: a plain title would stop the root template reaching child pages.
  title: { default: 'Books', template: '%s | Harglim Publishers' },
  description:
    'Browse books published by Harglim Publishers, discover new authors, and find your next great read.',
  alternates: { canonical: '/books' },
};

export default function BooksLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
