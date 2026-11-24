import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/cart", "Shopping Cart", true); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
