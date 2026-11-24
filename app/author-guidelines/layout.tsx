import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/author-guidelines", "Author Guidelines", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
