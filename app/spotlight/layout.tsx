import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Author Spotlight',
  description: 'Photos and messages from authors who published their books with Harglim Publishers.',
  alternates: { canonical: '/spotlight' },
};

export default function SpotlightLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
