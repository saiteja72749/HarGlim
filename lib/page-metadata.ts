import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';
import { fetchRecord, MISSING } from '@/lib/fetch-record';

/** Route labels describe the UI; business copy/images stay in the CMS. */
export async function pageMetadata(path: string, title: string, privatePage = false): Promise<Metadata> {
  const url = new URL(path, siteConfig.url).href;
  const content = privatePage ? null : await fetchRecord<{ seo?: { image?: string; description?: string } }>('/content');
  const seo = content && content !== MISSING ? content.seo : undefined;
  const images = seo?.image?.trim() ? [seo.image] : undefined;
  const description = typeof seo?.description === 'string' ? seo.description : undefined;
  return {
    title: { default: title, template: `%s | ${siteConfig.name}` },
    alternates: { canonical: url },
    openGraph: { title: `${title} | ${siteConfig.name}`, url, type: 'website', images, description },
    twitter: { title: `${title} | ${siteConfig.name}`, card: 'summary_large_image', images, description },
    ...(privatePage ? { robots: { index: false, follow: false } } : {}),
  };
}
