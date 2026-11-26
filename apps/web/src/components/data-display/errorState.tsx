'use client';

import { useState } from 'react';

type ErrorStateProps = {
  message?: string;
  onRetry?: () => void | Promise<void>;
};

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  async function handleRetry() {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);

    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 p-8 text-center"
    >
      <h3 className="font-semibold text-destructive">
        Unable to load information
      </h3>

      <p className="text-sm text-muted-foreground">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Try again'}
        </button>
      )}
    </div>
  );
}