import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/terms", "Terms and Conditions", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
