'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  Mail,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Globe,
  Star,
  Award,
  Share2,
  Sparkles,
  Search,
  Book as BookIcon,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookCard } from '@/components/books/book-card';
import { ErrorState } from '@/components/ui/error-state';
import type { Author, Book } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { getBookAuthorInfo, getSafeExternalUrl } from '@/lib/utils';

const socialIcons: Record<string, React.ElementType> = {
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  website: Globe,
};

export default function AuthorDetailPage() {
  const params = useParams();
  const [author, setAuthor] = useState<Author | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<'books' | 'bio'>('books');
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  const fetchAuthorData = async () => {
    setLoading(true);
    setError(false);
    try {
      // 1. Attempt to Fetch Author Profile
      let authorData: Author | null = null;
      try {
        const authorRes = await api
          .get(`/authors/${params.id}`)
          .catch(() => api.get(`/users/${params.id}`))
          .catch(async () => {
            const listRes = await api.get('/authors');
            const items =
              listRes.data?.data?.authors || listRes.data?.data || listRes.data || [];
            const found = Array.isArray(items)
              ? items.find((a: any) => (a.id || a._id) === params.id)
              : null;
            if (found) return { data: { data: found } };
            return null;
          });
        const extracted = authorRes?.data?.data || authorRes?.data;
        if (extracted && (extracted._id || extracted.id || extracted.name)) {
          authorData = extracted as Author;
        }
      } catch (err) {
        console.warn('Author profile fetch warning:', err);
      }

      // 2. Fetch Author's Books with multi-level fallbacks
      let fetchedBooks: Book[] = [];
      try {
        const [authorBooksRes, allBooksRes] = await Promise.allSettled([
          api.get(`/authors/${params.id}/books`).catch(() => null),
          api.get('/books', { params: { limit: 100 } }).catch(() => null),
        ]);

        if (authorBooksRes.status === 'fulfilled' && authorBooksRes.value?.data) {
          const bData = authorBooksRes.value.data?.data || authorBooksRes.value.data;
          if (Array.isArray(bData)) {
            fetchedBooks = bData;
          }
        }

        if (fetchedBooks.length === 0 && allBooksRes.status === 'fulfilled' && allBooksRes.value?.data) {
          const allRaw =
            allBooksRes.value.data?.data?.books ||
            allBooksRes.value.data?.data ||
            allBooksRes.value.data?.books ||
            allBooksRes.value.data ||
            [];
          const allList: Book[] = Array.isArray(allRaw) ? allRaw : [];
          const targetId = String(params.id || '').toLowerCase();
          const authorNameLower = (authorData?.name || '').toLowerCase();

          fetchedBooks = allList.filter((b) => {
            const bAuthId = String(
              typeof b.author === 'object' ? b.author?._id || b.author?.id : b.author || ''
            ).toLowerCase();
            const bAuthorInfo = getBookAuthorInfo(b);
            const bAuthName = bAuthorInfo.name.toLowerCase();
            return (
              bAuthId === targetId ||
              (authorNameLower && bAuthName.includes(authorNameLower))
            );
          });
        }
      } catch (bErr) {
        console.error('Failed to fetch author books:', bErr);
      }

      // 3. If authorData is missing but books were matched to this ID, synthesize author profile!
      if (!authorData && fetchedBooks.length > 0) {
        const primaryBook = fetchedBooks[0];
        const resolved = getBookAuthorInfo(primaryBook);
        authorData = {
          _id: String(params.id),
          name: resolved.name,
          email: '',
          role: 'author',
          bio: `Author of "${primaryBook.title}" and published catalog works with Harglim Publishers.`,
          profilePicture: primaryBook.coverImage || '',
          bookCount: fetchedBooks.length,
        };
      }

      if (authorData) {
        setAuthor(authorData);
        setBooks(fetchedBooks);
      } else {
        setError(true);
        setAuthor(null);
        setBooks([]);
      }
    } catch (err) {
      console.error('Failed to process author data:', err);
      setError(true);
      setAuthor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthorData();
  }, [params.id]);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Author profile link copied to clipboard!');
    }
  };

  // Helper calculation for author stats
  const totalBooksCount = author?.bookCount || books.length || 0;
  const avgRating =
    books.length > 0
      ? (
          books.reduce((acc, b) => acc + (b.rating || 0), 0) / books.length
        ).toFixed(1)
      : '0.0';
  const totalReviewsCount = books.reduce(
    (acc, b) => acc + (b.totalReviews || 0),
    0
  );
  const categoriesList = Array.from(
    new Set(
      books
        .map((b) =>
          typeof b.category === 'object' ? b.category?.name : b.category
        )
        .filter(Boolean)
    )
  );

  const filteredBooks = books.filter((b) =>
    (b.title || '').toLowerCase().includes(bookSearchQuery.toLowerCase())
  );

  const avatarSrc = author?.profileImage || author?.profilePicture;

  if (loading) {
    return (
      <div className="bg-[#F8F9F7] min-h-screen">
        <div className="bg-[#0F3D3E] text-white py-16 px-4 sm:px-6 lg:px-8 animate-pulse">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
            <div className="w-36 h-36 rounded-full bg-white/10" />
            <div className="space-y-3 flex-1 text-center md:text-left">
              <div className="h-8 bg-white/10 rounded w-64 mx-auto md:mx-0" />
              <div className="h-4 bg-white/10 rounded w-40 mx-auto md:mx-0" />
              <div className="h-16 bg-white/10 rounded w-full max-w-xl mx-auto md:mx-0" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !author) {
    return (
      <div className="bg-[#F8F9F7] min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center bg-white border border-[#E2E6DF] rounded-3xl p-8 shadow-lg">
          <ErrorState
            title="Author not found"
            message="We couldn't locate the requested author profile right now."
            onRetry={fetchAuthorData}
          />
          <div className="mt-6">
            <Button
              asChild
              className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold rounded-xl"
            >
              <Link href="/authors">Explore All Authors</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9F7] min-h-screen text-[#0F3D3E] font-sans">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO BANNER HEADER (Signature Dark Teal & Gold Aesthetic) */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative bg-gradient-to-b from-[#0B2E2F] via-[#0F3D3E] to-[#082223] text-white pt-8 pb-16 overflow-hidden">
        {/* Glow Overlay */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Breadcrumb Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 relative z-10">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-white/70">
            <Link href="/" className="hover:text-[#D4AF37] transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href="/authors"
              className="hover:text-[#D4AF37] transition-colors"
            >
              Authors
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-[#D4AF37] font-medium truncate max-w-[200px]">
              {author.name}
            </span>
          </nav>
        </div>

        {/* Main Author Header Card */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar with Monogram Initial Fallback */}
            <div className="relative flex-shrink-0">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-[#D4AF37] shadow-2xl bg-[#0F3D3E] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-5xl sm:text-6xl select-none">
                {avatarSrc && !imgError ? (
                  <Image
                    src={avatarSrc}
                    alt={author.name}
                    fill
                    className="object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <span>{author.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <Badge className="absolute -bottom-2 right-2 bg-[#D4AF37] text-[#0F3D3E] font-serif font-bold text-xs px-3 py-1 shadow-md border border-white/20">
                ⭐ Featured
              </Badge>
            </div>

            {/* Author Primary Info */}
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-serif font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Verified Harglim Author</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                {author.name}
              </h1>

              {/* Tagline / Bio Snippet */}
              <p className="text-sm sm:text-base text-white/80 max-w-2xl font-light leading-relaxed line-clamp-3">
                {author.bio ||
                  'Distinguished writer contributing exceptional literature to Harglim Publishers.'}
              </p>

              {/* Genres / Topics */}
              {categoriesList.length > 0 && (
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  {categoriesList.slice(0, 4).map((cat: any, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-xs font-medium border border-white/10"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="h-11 px-5 rounded-xl font-serif font-bold text-xs bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Profile
                </Button>

                {author.email && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-11 px-5 rounded-xl font-serif font-bold text-xs bg-white/10 hover:bg-white/20 text-white border-white/30"
                  >
                    <a href={`mailto:${author.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. STATS HIGHLIGHT BAR */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="bg-white border border-[#E2E6DF] rounded-2xl p-6 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[#D4AF37]">
              <BookOpen className="h-5 w-5" />
              <span className="text-2xl font-serif font-bold text-[#0F3D3E]">
                {totalBooksCount}
              </span>
            </div>
            <p className="text-xs text-[#5C6E6E] font-medium uppercase tracking-wider">
              Published Books
            </p>
          </div>

          <div className="space-y-1 border-l border-[#E2E6DF]">
            <div className="flex items-center justify-center gap-1.5 text-[#D4AF37]">
              <Star className="h-5 w-5 fill-[#D4AF37]" />
              <span className="text-2xl font-serif font-bold text-[#0F3D3E]">
                {avgRating}
              </span>
            </div>
            <p className="text-xs text-[#5C6E6E] font-medium uppercase tracking-wider">
              Average Rating
            </p>
          </div>

          <div className="space-y-1 border-l border-[#E2E6DF]">
            <div className="flex items-center justify-center gap-1.5 text-[#D4AF37]">
              <MessageSquare className="h-5 w-5" />
              <span className="text-2xl font-serif font-bold text-[#0F3D3E]">
                {totalReviewsCount}
              </span>
            </div>
            <p className="text-xs text-[#5C6E6E] font-medium uppercase tracking-wider">
              Reader Reviews
            </p>
          </div>

          <div className="space-y-1 border-l border-[#E2E6DF]">
            <div className="flex items-center justify-center gap-1.5 text-[#D4AF37]">
              <Award className="h-5 w-5" />
              <span className="text-2xl font-serif font-bold text-[#0F3D3E]">
                {categoriesList.length || 1}
              </span>
            </div>
            <p className="text-xs text-[#5C6E6E] font-medium uppercase tracking-wider">
              Literary Genres
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. TABS NAVIGATION */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="flex border-b border-[#E2E6DF] gap-8">
          <button
            onClick={() => setActiveTab('books')}
            className={`pb-4 text-sm font-serif font-bold transition-all relative ${
              activeTab === 'books'
                ? 'text-[#0F3D3E]'
                : 'text-[#5C6E6E] hover:text-[#0F3D3E]'
            }`}
          >
            <span>Published Books ({books.length})</span>
            {activeTab === 'books' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('bio')}
            className={`pb-4 text-sm font-serif font-bold transition-all relative ${
              activeTab === 'bio'
                ? 'text-[#0F3D3E]'
                : 'text-[#5C6E6E] hover:text-[#0F3D3E]'
            }`}
          >
            <span>Biography & Story</span>
            {activeTab === 'bio' && (
              <motion.div
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4AF37]"
              />
            )}
          </button>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 4. MAIN TAB CONTENT */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <AnimatePresence mode="wait">
          {/* ---------------- TAB 1: PUBLISHED BOOKS ---------------- */}
          {activeTab === 'books' && (
            <motion.div
              key="tab-books"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Filter bar inside Author's books */}
              {books.length > 3 && (
                <div className="bg-white p-4 rounded-xl border border-[#E2E6DF] flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C6E6E]" />
                    <Input
                      type="text"
                      placeholder={`Search within ${author.name}'s books...`}
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-[#F8F9F7] border-[#E2E6DF] text-xs rounded-lg"
                    />
                  </div>
                  <span className="text-xs text-[#5C6E6E]">
                    Showing {filteredBooks.length} of {books.length} titles
                  </span>
                </div>
              )}

              {books.length === 0 ? (
                <div className="bg-white border border-dashed border-[#E2E6DF] rounded-3xl p-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#0F3D3E]/5 rounded-full flex items-center justify-center mx-auto text-[#0F3D3E]">
                    <BookIcon className="h-8 w-8 text-[#D4AF37]" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-[#0F3D3E]">
                    No published books listed yet
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C6E6E] max-w-md mx-auto leading-relaxed">
                    {author.name} is currently working on upcoming releases with
                    Harglim Publishers. Check back soon or explore our full bookstore catalog!
                  </p>
                  <Button
                    asChild
                    className="bg-[#0F3D3E] hover:bg-[#174C4D] text-[#D4AF37] font-serif font-bold text-xs h-11 px-6 rounded-xl shadow-xs"
                  >
                    <Link href="/books">Explore Catalog</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredBooks.map((book) => (
                    <BookCard key={book._id} book={book} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ---------------- TAB 2: BIOGRAPHY & STORY ---------------- */}
          {activeTab === 'bio' && (
            <motion.div
              key="tab-bio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Main Bio Column */}
              <div className="lg:col-span-8 bg-white border border-[#E2E6DF] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <h2 className="text-2xl font-serif font-bold text-[#0F3D3E] flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#D4AF37]" />
                  <span>About {author.name}</span>
                </h2>

                <div className="prose prose-slate max-w-none text-sm text-[#5C6E6E] leading-relaxed space-y-4 font-sans">
                  {author.bio ? (
                    author.bio.split('\n\n').map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))
                  ) : (
                    <>
                      <p>
                        {author.name} is a celebrated author publishing with Harglim
                        Publishers. Dedicated to literary mastery, their works span across engaging narrative arcs, insightful perspectives, and memorable storytelling.
                      </p>
                      <p>
                        Through their writings, {author.name} aims to inspire readers, spark intellectual curiosity, and contribute meaningful works to modern literature.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Sidebar Info */}
              <div className="lg:col-span-4 space-y-6">
                {/* Social Channels Card */}
                <div className="bg-white border border-[#E2E6DF] rounded-3xl p-6 space-y-4 shadow-xs">
                  <h3 className="font-serif font-bold text-lg text-[#0F3D3E]">
                    Connect & Follow
                  </h3>
                  <p className="text-xs text-[#5C6E6E]">
                    Follow {author.name} across official social channels for updates and announcements:
                  </p>
                  <div className="space-y-2 pt-2">
                    {author.socialLinks &&
                      Object.entries(author.socialLinks).map(([platform, url]) => {
                        const Icon = socialIcons[platform] || Globe;
                        const safeUrl = getSafeExternalUrl(String(url || ''));
                        if (!safeUrl) return null;
                        return (
                          <a
                            key={platform}
                            href={safeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9F7] hover:bg-[#0F3D3E] hover:text-white transition-colors group text-xs font-medium"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 text-[#D4AF37]" />
                              <span className="capitalize">{platform}</span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                          </a>
                        );
                      })}

                    {author.email && (
                      <a
                        href={`mailto:${author.email}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9F7] hover:bg-[#0F3D3E] hover:text-white transition-colors group text-xs font-medium"
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-[#D4AF37]" />
                          <span>Direct Email</span>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

