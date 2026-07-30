"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
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
        {error.message || "An unexpected error occurred while rendering this page."}
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan hover:bg-cyan/25"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-text/70 hover:bg-white/5"
        >
          Return to Queue
        </Link>
      </div>
    </div>
  );
}
