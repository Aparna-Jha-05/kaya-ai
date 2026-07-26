import BidPortfolio from "@/components/bid/BidPortfolio";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";

export default function BidsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="page-eyebrow">Portfolio review</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Compare submitted bids</h1>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text/50">Compare cost, compliance checks, vendor reliability, and schedule impact. Open a bid to inspect the supporting evidence.</p>
        </div>
        <Link href="/bids/new" className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan/15 px-4 py-2 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25">
          <FilePlus2 className="h-4 w-4" />
          Upload bid
        </Link>
      </div>

      <BidPortfolio />
    </div>
  );
}
