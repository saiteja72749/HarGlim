import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers about ordering books, publishing with Harglim, payments, delivery, returns, and royalties.',
  alternates: { canonical: '/faq' },
};

export default function FAQLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
