import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publish With Us',
  description: 'Join Harglim Publishers to publish your book. We offer professional editing, formatting, marketing, and distribution services for authors.',
  alternates: { canonical: '/publish' },
};

export default function PublishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
