import { cn } from '@/lib/utils';

import type { EmptyStateProps } from '@/types/ui';

export function EmptyState({
  action,
  className,
  description,
  title,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-foreground">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action ? (
        <div className="mt-4">
          {action}
        </div>
      ) : null}
    </div>
  );
}