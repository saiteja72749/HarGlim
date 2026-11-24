import { cn } from '@/lib/utils';

export function BookCardSkeleton({ horizontal = false }: { horizontal?: boolean }) {
  return (
    <div aria-hidden="true" className={cn(
      'overflow-hidden rounded-xl border border-border bg-card motion-safe:animate-pulse',
      horizontal ? 'flex items-center gap-4 p-2' : 'w-full max-w-52',
    )}>
      <div className={cn('aspect-[2/3] bg-muted', horizontal ? 'w-14 shrink-0 rounded-md' : 'w-full')} />
      <div className="h-14 grow space-y-2 p-3">
        <div className="h-2.5 w-3/4 rounded bg-muted" />
        <div className="h-2.5 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}
