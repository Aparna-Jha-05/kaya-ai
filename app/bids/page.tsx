import BidPortfolio from "@/components/bid/BidPortfolio";

export default function BidsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Portfolio review</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Compare submitted bids</h1>
        <p className="mt-1 max-w-2xl text-sm text-text/55">Compare like-for-like costs and the same deterministic checks. Open a bid to inspect source evidence and record the next human action.</p>
      </div>

      <BidPortfolio />
    </div>
  );
}
