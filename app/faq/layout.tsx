import { pageMetadata } from '@/lib/page-metadata';

export function generateMetadata() { return pageMetadata("/faq", "Frequently Asked Questions", false); }

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
