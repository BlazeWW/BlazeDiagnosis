import { cn } from '@/lib/utils';

import type { LoadingStateProps } from '@/types/ui';

export function LoadingState({
  className,
  description = 'Please wait while we load your information.',
  title = 'Loading...',
}: LoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-border bg-muted/40 p-8 text-center',
        className,
      )}
      role="status"
    >
      <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-primary" />

      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}