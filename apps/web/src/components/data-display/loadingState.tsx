type LoadingStateProps = {
  message?: string;
};

export function LoadingState({
  message = 'Loading information...',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-3 p-8 text-center"
    >
      <div
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary"
      />

      <p className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}