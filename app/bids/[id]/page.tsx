import { notFound } from "next/navigation";
import Link from "next/link";
import { BIDS, getBid } from "@/lib/mockData";
import BidReviewWorkspace from "@/components/bid/BidReviewWorkspace";
import { ArrowLeft } from "lucide-react";

export function generateStaticParams() {
  return BIDS.map((b) => ({ id: b.id }));
}

export default function BidDetailPage({ params }: { params: { id: string } }) {
  const bid = getBid(params.id);
  if (!bid) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/bids" className="inline-flex items-center gap-1.5 text-xs text-text/50 hover:text-text">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to bids
        </Link>
        <div className="flex gap-2">
          {BIDS.map((b) => (
            <Link
              key={b.id}
              href={`/bids/${b.id}`}
              className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${
                b.id === bid.id
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-white/10 text-text/50 hover:border-white/25 hover:text-text"
              }`}
            >
              {b.vendor.replace("Vendor ", "V")}
            </Link>
          ))}
        </div>
      </div>

      <BidReviewWorkspace bid={bid} />
    </div>
  );
}
