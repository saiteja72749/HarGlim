import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read how Harglim Publishers collects, uses, and protects personal information on its publishing and bookstore platform.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
