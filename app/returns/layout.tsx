import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/returns", "Returns Policy", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
