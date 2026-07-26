import { notFound } from "next/navigation";
import Link from "next/link";
import { BIDS, getBid } from "@/lib/mockData";
import BidWorkspace from "@/components/bid/BidWorkspace";
import { ArrowLeft } from "lucide-react";
import { COLORS } from "@/lib/constants";

export function generateStaticParams() {
  return BIDS.map((b) => ({ id: b.id }));
}

export default function BidDetailPage({ params }: { params: { id: string } }) {
  const bid = getBid(params.id);
  if (!bid) notFound();

  const isReject = bid.recommendation === "REJECT";
  const decColor =
    bid.recommendation === "REJECT"
      ? COLORS.rose
      : bid.recommendation === "RECOMMENDED"
      ? COLORS.cyan
      : COLORS.amber;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-text/50 hover:text-text"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to bids
          </Link>
          <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-text">
            {bid.vendor}
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase"
              style={{ color: decColor, backgroundColor: `${decColor}1a` }}
            >
              {bid.recommendation}
            </span>
          </h1>
          <p className="mt-1 font-mono text-sm text-text/45">
            {bid.model} · {bid.equipment_type} · {bid.po_number}
          </p>
        </div>
        <div className="flex gap-2">
          {BIDS.map((b) => (
            <Link
              key={b.id}
              href={`/bids/${b.id}`}
              className={`rounded-md border px-3 py-1.5 font-mono text-xs transition-colors ${
                b.id === bid.id
                  ? "border-green/50 bg-green/10 text-green"
                  : "border-white/10 text-text/50 hover:border-white/25 hover:text-text"
              }`}
            >
              {b.vendor.replace("Vendor ", "V")}
            </Link>
          ))}
        </div>
      </div>

      {isReject && (
        <div className="rounded-lg border border-red/25 bg-red/5 px-4 py-2.5 text-sm text-red/90 animate-pulseRed">
          This bid includes a substituted chiller. Review the extraction and checks to see the resulting engineering, carbon, and schedule exposure.
        </div>
      )}

      <BidWorkspace bid={bid} key={bid.id} />
    </div>
  );
}
