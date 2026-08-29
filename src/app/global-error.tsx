'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center text-center px-4 bg-background text-foreground">
          <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
          <button
            onClick={() => {
              if (typeof reset === 'function') {
                reset();
              } else {
                window.location.reload();
              }
            }}
            className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 transition-all active:scale-95"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
