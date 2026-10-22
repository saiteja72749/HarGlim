import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search Books',
  description: 'Search books and authors in the Harglim Publishers catalog.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
