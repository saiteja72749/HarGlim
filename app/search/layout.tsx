import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/search", "Search Books", true); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
