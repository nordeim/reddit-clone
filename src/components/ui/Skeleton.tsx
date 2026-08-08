import { cn } from "../../utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-800",
        className,
      )}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="flex gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex w-8 flex-col items-center gap-2 pt-1">
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-3 w-5" />
        <Skeleton className="h-4 w-4 rounded-sm" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="flex gap-3">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CommentSkeleton({ depth = 0 }: { depth?: number }) {
  return (
    <div className="flex gap-2" style={{ marginLeft: depth * 20 }}>
      <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
