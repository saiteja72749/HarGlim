import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/publish", "Publish with Us", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
