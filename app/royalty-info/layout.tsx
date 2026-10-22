import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Author Royalties',
  description:
    'Learn how Harglim Publishers calculates, reports, and pays royalties to authors.',
  alternates: { canonical: '/royalty-info' },
};

export default function RoyaltyInfoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
