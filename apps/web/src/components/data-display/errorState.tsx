import { useState } from 'react';

import { cn } from '@/lib/utils';

import type { ErrorStateProps } from '@/types/ui';

export function ErrorState({
  className,
  description,
  onRetry,
  retryLabel = 'Try again',
  title = 'Something went wrong',
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    if (isRetrying) return;

    setIsRetrying(true);

    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-muted/40 p-8 text-center',
        className,
      )}
      role="alert"
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>

      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      <button
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isRetrying}
        onClick={handleRetry}
        type="button"
      >
        {isRetrying ? 'Retrying...' : retryLabel}
      </button>
    </div>
  );
}