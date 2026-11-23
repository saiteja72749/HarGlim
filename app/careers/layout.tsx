import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/careers", "Careers", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
