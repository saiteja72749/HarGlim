import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns and Refunds',
  description:
    "Review Harglim Publishers' book return, replacement, cancellation, and refund information.",
  alternates: { canonical: '/returns' },
};

export default function ReturnsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
