import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/categories", "Categories", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
