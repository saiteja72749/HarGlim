import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authors',
  description:
    'Meet Harglim Publishers authors and explore books from writers across a range of genres.',
  alternates: { canonical: '/authors' },
};

export default function AuthorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
