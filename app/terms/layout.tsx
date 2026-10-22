import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    "Read the terms governing use of Harglim Publishers' website, bookstore, publishing services, and author tools.",
  alternates: { canonical: '/terms' },
};

export default function TermsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
