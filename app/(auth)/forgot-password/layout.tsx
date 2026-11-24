import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/forgot-password", "Reset Your Password", true); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
