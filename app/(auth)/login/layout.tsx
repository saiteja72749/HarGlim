import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/login", "Sign In", true); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
