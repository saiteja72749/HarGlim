import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Template repeated here: a plain title would stop the root template reaching child pages.
  title: { default: 'Authors', template: '%s | Harglim Publishers' },
  description:
    'Meet Harglim Publishers authors and explore books from writers across a range of genres.',
  alternates: { canonical: '/authors' },
};

export default function AuthorsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
