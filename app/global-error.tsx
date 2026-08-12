"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
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
            {error.message || "An error occurred in the root layout."}
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-cyan px-4 py-2.5 text-sm font-bold text-on-accent hover:bg-cyan/90 tactile-press shadow-xs"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
