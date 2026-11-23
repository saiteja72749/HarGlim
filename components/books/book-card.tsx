import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Book } from '@/types';
import { CompactBookCover } from '@/components/books/compact-book-cover';

export function CompactBookCard({ book, horizontal = false }: { book: Book; horizontal?: boolean }) {
  const href = `/books/${encodeURIComponent(book.slug || book._id || book.id || '')}`;

  return (
    <article data-book-card className={cn('min-w-0', !horizontal && 'w-full max-w-52')}>
      <Link
        href={href}
        prefetch={false}
        className={cn(
          'book-card flex h-full overflow-hidden rounded-xl border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          horizontal ? 'items-center gap-4 p-2' : 'flex-col',
        )}
      >
        <CompactBookCover source={book.coverImage} horizontal={horizontal} />
        <h3 className={cn('min-w-0 px-3 py-2 font-serif text-sm font-semibold leading-snug', !horizontal && 'min-h-14')}>
          <span className="line-clamp-2 [overflow-wrap:anywhere]">{book.title}</span>
        </h3>
      </Link>
    </article>
  );
}
