"use client";

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import Image from '@/components/ui/backend-image';
import { cn } from '@/lib/utils';

export function CompactBookCover({ source, horizontal, sizes, priority }: {
  source?: string;
  horizontal: boolean;
  sizes?: string;
  priority?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const hasCover = source && failedSource !== source && /^(https?:\/\/|\/(?!\/))/.test(source);

  return (
    <div className={cn('book-card-cover relative aspect-[2/3] shrink-0 overflow-hidden bg-muted/50', horizontal ? 'w-14 rounded-md' : 'w-full')}>
      {hasCover ? (
        <Image
          src={source}
          alt=""
          fill
          sizes={sizes ?? (horizontal ? '56px' : '(max-width: 479px) 45vw, 208px')}
          preload={priority}
          className="object-contain p-2"
          onError={() => setFailedSource(source)}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-muted-foreground" aria-hidden="true">
          <BookOpen className="size-7" />
        </span>
      )}
    </div>
  );
}
