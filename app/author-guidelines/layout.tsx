import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Author Guidelines',
  description:
    "Review Harglim Publishers' manuscript submission, formatting, review, and publishing guidelines for authors.",
  alternates: { canonical: '/author-guidelines' },
};

export default function AuthorGuidelinesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
