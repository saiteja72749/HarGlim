"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Feather, Layers, Search, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { AuthorAvatar } from "@/components/authors/author-avatar";
import { CompactBookCover } from "@/components/books/compact-book-cover";
import { HomeBookShelf } from "@/components/books/home-book-shelf";
import { useSiteContent } from "@/context/site-content-context";
import { useHydration } from "@/hooks/useHydration";
import { useBookCategories } from "@/hooks/use-book-categories";
import { getPublic } from "@/lib/api";
import { publicApiMessage, publicRetryAt } from "@/lib/api-error";
import { publishedNumber } from "@/lib/book-presentation";
import { fetchCatalogPage } from "@/lib/catalog";
import { parseCollectionPage } from "@/lib/catalog-data";
import { onLiveChange, type LiveTopic } from "@/lib/live-sync";
import { flattenFaqs, readSection } from "@/lib/page-content";
import { scheduleRequest } from "@/lib/schedule-request";
import { useAuthStore } from "@/store/auth-store";
import type { Author, Book } from "@/types";

const benefitIcons = [Feather, Layers, Truck, ShieldCheck];

async function fetchSpotlightAuthors(signal: AbortSignal) {
  const { data } = await getPublic("/authors", { params: { page: 1, limit: 6 }, signal });
  const { items } = parseCollectionPage<Author>(data, "authors");
  if (items.some((author) => !author._id && !author.id)) throw new Error("An author record is missing its ID.");
  return [...new Map(items.map((author) => [author._id || author.id, author])).values()];
}

async function fetchFeaturedBooks(signal: AbortSignal) {
  const { books } = await fetchCatalogPage({ page: 1, limit: 8, tag: "featured" }, signal);
  return books.filter((book) => (book.isFeatured === true || book.featured === true) &&
    typeof book.slug === "string" && book.slug.trim() && typeof book.title === "string" && book.title.trim());
}

function useHomeSection<T>(fetcher: (signal: AbortSignal) => Promise<T>, topic: LiveTopic | LiveTopic[]) {
  const [result, setResult] = useState<{ data?: T; error?: unknown }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const cancel = scheduleRequest(async () => {
      try {
        const data = await fetcher(controller.signal);
        if (!controller.signal.aborted) setResult({ data });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ error });
      }
    });
    return () => { cancel(); controller.abort(); };
  }, [attempt, fetcher]);
  useEffect(() => onLiveChange(topic, () => setAttempt((value) => value + 1), 60_000), [topic]);
  return { ...result, retry: () => { setResult({}); setAttempt((value) => value + 1); } };
}

const authorTopics: LiveTopic[] = ["author-data", "books"];

export default function Home() {
  const { content } = useSiteContent();
  const featured = useHomeSection<Book[]>(fetchFeaturedBooks, "books");
  const spotlight = useHomeSection<Author[]>(fetchSpotlightAuthors, authorTopics);
  const { categories, error: categoryError, reload: reloadCategories } = useBookCategories(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [faqSearch, setFaqSearch] = useState("");
  const hydrated = useHydration();
  const role = useAuthStore((state) => state.isAuthenticated ? state.user?.role : undefined);
  const heroBooks = featured.data ?? [];
  const heroBook = heroBooks.find((book) => book.slug === selectedSlug) ?? heroBooks[0];
  const whyChooseBlocks = readSection<{ title?: unknown; description?: unknown; highlight?: unknown }>(content, "homeWhyChooseJson")
    .flatMap((block) => typeof block?.title === "string" && block.title.trim() &&
      typeof block.description === "string" && block.description.trim()
      ? [{ title: block.title, description: block.description, highlight: typeof block.highlight === "string" ? block.highlight.trim() : "" }]
      : []);
  const activeFaqs = (() => {
    try { return flattenFaqs(JSON.parse(content.faqsJson || "null")); }
    catch { return []; }
  })();
  const filteredFaqs = activeFaqs.filter((faq) =>
    faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="bg-[#F8F9F7] text-[#0F3D3E]">
      <section className="bg-gradient-to-br from-[#0F3D3E] to-[#082223] text-white">
        <div className="mx-auto grid max-w-[96rem] items-center gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.65fr)] lg:px-8 lg:py-20">
          <div className="space-y-5">
            <h1 className="max-w-3xl whitespace-pre-line font-serif text-[clamp(2.2rem,5.5vw,5rem)] font-bold leading-[1.06] tracking-tight">
              {content.homeTitle?.trim() || "Harglim Publishers"}
            </h1>
            {content.homeSubtitle?.trim() && <p className="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">{content.homeSubtitle}</p>}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" className="min-h-12 rounded-full bg-[#D4AF37] px-6 text-[#0F3D3E] hover:bg-[#e5c255]" asChild>
                <Link href="/publish">{content.homeCtaButtonText?.trim() || "Publish"} <ArrowRight aria-hidden="true" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="min-h-12 rounded-full border-white/50 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white" asChild>
                <Link href="/books">{content.homeHeroCtaText?.trim() || "Browse Books"}</Link>
              </Button>
            </div>
          </div>
          {(heroBook || Boolean(featured.error) || !featured.data) && (
            <div className="mx-auto w-full max-w-xs lg:justify-self-end">
              {heroBook ? (
                <>
                  <Link href={`/books/${encodeURIComponent(heroBook.slug)}`} prefetch={false} className="group block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]">
                    <CompactBookCover source={heroBook.coverImage} horizontal={false} sizes="(max-width: 360px) 90vw, 320px" priority />
                    <p className="mt-3 font-serif text-lg font-semibold [overflow-wrap:anywhere] group-hover:underline">{heroBook.title}</p>
                  </Link>
                  {heroBooks.length > 1 && <div className="mt-2 flex flex-wrap gap-1" aria-label="Featured books">
                    {heroBooks.map((book, index) => (
                      <button type="button" key={book.slug} aria-label={`Show featured book ${index + 1}: ${book.title}`}
                        aria-pressed={book.slug === heroBook.slug} onClick={() => setSelectedSlug(book.slug)}
                        className="grid size-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-[#D4AF37]">
                        <span aria-hidden="true" className={`h-1.5 rounded-full ${book.slug === heroBook.slug ? "w-5 bg-[#D4AF37]" : "w-2 bg-white/60"}`} />
                      </button>
                    ))}
                  </div>}
                </>
              ) : featured.error ? (
                <div className="rounded-xl bg-background text-foreground">
                  <ErrorState title="Featured books could not load" message={publicApiMessage(featured.error, "Please retry to load featured books.")}
                    retryAt={publicRetryAt(featured.error)} onRetry={featured.retry} />
                </div>
              ) : <div className="aspect-[2/3] rounded-md bg-white/10 motion-safe:animate-pulse" aria-busy="true" aria-label="Loading featured books" />}
            </div>
          )}
        </div>
      </section>

      {hydrated && role && (
        <nav aria-label="Account shortcuts" className="mx-auto flex max-w-[96rem] flex-wrap gap-3 px-4 pt-5 sm:px-6 lg:px-8">
          {role === "admin" ? <Button variant="outline" asChild><Link href="/admin">Admin Dashboard</Link></Button>
            : role === "author" ? <Button variant="outline" asChild><Link href="/author">Author Studio</Link></Button>
              : role === "reader" ? <Button variant="outline" asChild><Link href="/dashboard/orders">My Orders</Link></Button> : null}
        </nav>
      )}
      <HomeBookShelf />

      {(categories.length > 0 || categoryError) && <section aria-labelledby="home-categories" className="mx-auto max-w-[96rem] space-y-4 px-4 py-8 sm:px-6 lg:px-8">
        <h2 id="home-categories" className="font-serif text-3xl font-semibold">Browse by category</h2>
        {categoryError && <ErrorState title="Categories could not load" message="Retry to load the book categories." onRetry={reloadCategories} />}
        {categories.length > 0 && <ul className="flex flex-wrap gap-2">
          {categories.map((category) => <li key={category._id} className="max-w-full">
            <Button asChild variant="outline" className="h-auto min-h-9 max-w-full whitespace-normal break-words">
              <Link href={`/books?category=${encodeURIComponent(category.slug || category._id)}`} prefetch={false}>{category.name}</Link>
            </Button>
          </li>)}
        </ul>}
      </section>}

      {whyChooseBlocks.length > 0 && <section aria-labelledby="home-benefits" className="border-y border-border bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-[96rem] space-y-6 px-4 sm:px-6 lg:px-8">
          <h2 id="home-benefits" className="font-serif text-3xl font-semibold">Why Publish With Us</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseBlocks.map((block, index) => {
              const Icon = benefitIcons[index % benefitIcons.length];
              return <div key={`${block.title}-${index}`} className="space-y-3 rounded-xl border border-border bg-[#F8F9F7] p-5">
                <Icon className="size-6 text-[#8A6D1E]" aria-hidden="true" />
                <h3 className="font-serif text-lg font-semibold">{block.title}</h3>
                <p className="text-sm leading-relaxed">{block.description}</p>
                {block.highlight?.trim() && <p className="text-sm font-semibold">{block.highlight}</p>}
              </div>;
            })}
          </div>
        </div>
      </section>}

      {Boolean(spotlight.error) && <div className="mx-auto max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8">
        <ErrorState title="Authors could not load" message={publicApiMessage(spotlight.error, "Please retry to load authors.")}
          retryAt={publicRetryAt(spotlight.error)} onRetry={spotlight.retry} />
      </div>}
      {Boolean(spotlight.data?.length) && <section aria-labelledby="spotlight-authors" className="mx-auto max-w-[96rem] space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="spotlight-authors" className="font-serif text-3xl font-semibold">Spotlight Authors</h2>
          <Button variant="outline" asChild><Link href="/authors">Meet All Authors</Link></Button>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {spotlight.data?.map((author) => {
            const count = publishedNumber(author.bookCount ?? author.booksCount);
            return <li key={author._id || author.id} className="min-w-0">
              <Link href={`/authors/${encodeURIComponent(author._id || author.id || "")}`} prefetch={false}
                className="block h-full space-y-3 rounded-xl border border-border bg-white p-4 text-center hover:border-[#D4AF37] focus-visible:outline-2">
                <AuthorAvatar author={author} className="mx-auto size-20 text-xl" sizes="80px" />
                <h3 className="font-serif font-semibold [overflow-wrap:anywhere]">{author.name || "Author"}</h3>
                {count !== null && <p className="text-sm text-muted-foreground">{count} published {count === 1 ? "book" : "books"}</p>}
              </Link>
            </li>;
          })}
        </ul>
      </section>}

      {activeFaqs.length > 0 && <section className="py-16 sm:py-20 bg-white border-t border-[#E2E6DF]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A6D1E] block">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#0F3D3E]">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#5C6E6E]">
              Everything you need to know about our publishing process, distribution, and royalties.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
            <Input
              type="text"
              aria-label="Search frequently asked questions"
              placeholder="Search questions (e.g. royalties, publishing, delivery)..."
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              className="pl-10 h-11 bg-[#F8F9F7] border-[#E2E6DF] rounded-xl text-sm"
            />
          </div>

          {/* Accordion List */}
          <div className="space-y-4 pt-2">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, index) => (
                <details key={`${faq.question}-${index}`} className="rounded-xl border border-border bg-background">
                  <summary className="cursor-pointer px-5 py-4 font-serif font-semibold">{faq.question}</summary>
                  <p className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{faq.answer}</p>
                </details>
              ))
            ) : (
              <p className="text-center text-xs text-[#5C6E6E] py-8">
                No questions found matching &ldquo;{faqSearch}&rdquo;. Try another search term.
              </p>
            )}
          </div>
        </div>
      </section>}

      <section aria-labelledby="home-publish-heading" className="py-16 sm:py-20 bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
          <h2 id="home-publish-heading" className="text-3xl sm:text-4xl font-serif font-bold">{content.homeCtaHeading?.trim() || "Ready to publish your book?"}</h2>
          <p className="text-sm sm:text-base text-white/80 leading-relaxed">{content.homeCtaSubtitle?.trim() || "Explore our publishing packages and find out how to submit your manuscript."}</p>
          <Button
              size="lg"
              className="bg-[#D4AF37] hover:bg-[#C29F2F] text-[#0F3D3E] font-serif font-bold min-h-14 h-auto px-6 sm:px-8 py-3 rounded-full gap-2 text-base whitespace-normal"
             asChild><Link href="/publish">
              <span>{content.homeCtaButtonText?.trim() || "Publish with Us"}</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link></Button>
        </div>
      </section>

    </div>
  );
}
