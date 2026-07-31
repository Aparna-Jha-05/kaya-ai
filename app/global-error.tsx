"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-text antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 py-24 text-center">
          <AlertTriangle className="h-10 w-10 text-rose" />
          <h1 className="text-xl font-bold text-text">Global Error</h1>
          <p className="max-w-sm text-sm text-text/50">
            An error occurred in the application shell.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan hover:bg-cyan/25"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
