import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <ShieldX className="h-10 w-10 text-red" />
      <h1 className="text-xl font-bold text-text">No case on file</h1>
      <p className="max-w-sm text-sm text-text/50">
        That bid isn&apos;t in the precinct. Only Vendors A, B and C are on the
        docket for IIT Smart Campus Phase 1.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-green/15 px-4 py-2 text-sm font-medium text-green hover:bg-green/25"
      >
        Back to The Precinct
      </Link>
    </div>
  );
}
