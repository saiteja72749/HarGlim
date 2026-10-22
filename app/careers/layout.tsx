import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Explore career opportunities with Harglim Publishers and help authors share their stories with readers.',
  alternates: { canonical: '/careers' },
};

export default function CareersLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
