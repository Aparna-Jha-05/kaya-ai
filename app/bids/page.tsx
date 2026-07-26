import BidPortfolio from "@/components/bid/BidPortfolio";

export default function BidsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Portfolio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Compare bids</h1>
          <p className="mt-1 max-w-2xl text-sm text-text/55">Filter and compare submitted bids against the same deterministic constraints before opening a detailed review.</p>
        </div>
      </div>

      <BidPortfolio />
    </div>
  );
}
