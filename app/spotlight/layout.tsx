import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/spotlight", "Author Spotlight", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
