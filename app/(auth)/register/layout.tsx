import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/register", "Create Account", true); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
