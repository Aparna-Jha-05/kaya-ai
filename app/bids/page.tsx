import Docket from "@/components/bid/Docket";

export default function BidsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-blue">The Docket</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-text">Compare bids</h1>
          <p className="mt-1 max-w-2xl text-sm text-text/55">Compare each submitted bid against the same four patrols, then open its case file for the source evidence and human action.</p>
        </div>
      </div>

      <Docket />
    </div>
  );
}
