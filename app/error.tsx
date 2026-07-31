"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertTriangle className="h-10 w-10 text-rose" />
      <h1 className="text-xl font-bold text-text">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text/50">
        An unexpected error occurred while rendering this page.
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-cyan px-4 py-2 text-sm font-bold text-on-accent hover:bg-cyan/90 tactile-press shadow-xs"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-bold text-text/80 hover:border-cyan/40 hover:text-text tactile-press shadow-xs"
        >
          Return to Queue
        </Link>
      </div>
    </div>
  );
}
