import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/royalty-info", "Royalty Information", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
