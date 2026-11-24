"use client";

import { record } from "@/lib/api-error";
import Link from 'next/link';
import { useSiteContent, type SiteContent } from '@/context/site-content-context';
import { readSection, type PageSectionKey } from '@/lib/page-content';

const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** Policy and publishing details are rendered only from the backend CMS document. */
export function PublishedContentPage({ title, summaryKey, sections }: {
  title: string;
  summaryKey?: keyof SiteContent;
  sections: { key: PageSectionKey; heading: string }[];
}) {
  const { content, loading, error } = useSiteContent();
  const published = sections.map((section) => ({ ...section, items: readSection(content, section.key) })).filter((section) => section.items.length > 0);
  return (
    <div className="min-h-screen bg-background">
      <section className="bg-gradient-to-br from-primary to-primary/80 py-20 text-primary-foreground">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <h1 className="mb-6 font-serif text-4xl font-bold md:text-6xl">{title}</h1>
          {summaryKey && content[summaryKey] && <p className="whitespace-pre-line text-lg opacity-90">{text(content[summaryKey])}</p>}
        </div>
      </section>
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-14 sm:px-6">
        {loading ? <p role="status">Loading published information...</p> : error ? <p>Information is temporarily unavailable.</p> : published.length === 0 ? <p>Detailed information has not been published yet.</p> : published.map((section) => (
          <section key={section.key} className="space-y-5">
            <h2 className="font-serif text-2xl font-bold">{section.heading}</h2>
            {section.items.map((value, index) => {
              if (typeof value === 'string') return <p key={index} className="whitespace-pre-line">{value}</p>;
              const item = record(value);
              return (
              <article key={text(item._id) || index} className="space-y-3 rounded-2xl border bg-card p-6">
                {text(item?.title ?? item?.question ?? item?.scenario) && <h3 className="text-lg font-semibold">{text(item.title ?? item.question ?? item.scenario)}</h3>}
                {text(item?.description ?? item?.content ?? item?.answer) && <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{text(item.description ?? item.content ?? item.answer)}</p>}
                {Array.isArray(item?.items) && <ul className="list-inside list-disc space-y-2">{item.items.map((entry: unknown, i: number) => <li key={i}>{text(entry)}</li>)}</ul>}
                {['retail', 'charges', 'royalty'].some((key) => item?.[key] !== undefined) && <dl className="grid gap-3 sm:grid-cols-3">{['retail', 'charges', 'royalty'].filter((key) => item[key] !== undefined).map((key) => <div key={key}><dt className="text-sm capitalize text-muted-foreground">{key}</dt><dd className="font-semibold">{text(item[key])}</dd></div>)}</dl>}
                {text(item?.note) && <p className="text-sm text-muted-foreground">{text(item.note)}</p>}
              </article>
              );
            })}
          </section>
        ))}
        <Link href="/contact" className="inline-block font-semibold text-primary underline">Contact Harglim</Link>
      </div>
    </div>
  );
}
