import { GitCompareArrows } from "lucide-react";
import BidPortfolio from "@/components/bid/BidPortfolio";

export default function BidsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Portfolio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Bids</h1>
          <p className="mt-1 max-w-2xl text-sm text-text/55">Compare submitted bids against the same deterministic constraints before opening a detailed review.</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-2 text-xs text-text/60 sm:self-auto"><GitCompareArrows className="h-3.5 w-3.5 text-blue" /> Select up to three bids to compare</span>
      </div>

      <BidPortfolio />
    </div>
  );
}
