import BidPortfolio from "@/components/bid/BidPortfolio";

export default function BidsPage() {
  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <p className="page-eyebrow">Procurement Portfolio</p>
        <h1 className="mt-1 text-2xl lg:text-3xl font-extrabold tracking-tight text-text truncate">Bid Portfolio</h1>
        <p className="mt-1 text-xs font-medium text-text/50">Side-by-side commercial, compliance, and TCO² impact analysis</p>
      </div>

      <BidPortfolio />
    </div>
  );
}
