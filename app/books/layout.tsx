import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/books", "Books", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
