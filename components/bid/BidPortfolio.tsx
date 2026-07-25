"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS } from "@/lib/constants";

export default function BidPortfolio() {
  const [selectedId, setSelectedId] = useState("B");
  const selected = useMemo(() => BIDS.find((bid) => bid.id === selectedId) ?? BIDS[0], [selectedId]);
  const selectedResults = useMemo(() => runAllPatrols(selected), [selected]);

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
    <Card>
      <CardHeader title="Bid portfolio" caption="Select a row to update the decision inspector without leaving the comparison context." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40"><th className="px-4 py-3 font-medium">Bid</th><th className="px-4 py-3 font-medium">Upfront</th><th className="px-4 py-3 font-medium">Engineering</th><th className="px-4 py-3 font-medium">Carbon</th><th className="px-4 py-3 font-medium">Vendor risk</th><th className="px-4 py-3 font-medium">Schedule</th><th className="px-4 py-3 font-medium">5-year TCO²</th></tr></thead>
          <tbody>{BIDS.map((bid) => {
            const { building, green, vice, traffic } = runAllPatrols(bid);
            const selectedRow = bid.id === selected.id;
            return <tr key={bid.id} onClick={() => setSelectedId(bid.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(bid.id); } }} role="button" tabIndex={0} aria-label={`Select ${bid.vendor}`} className={`cursor-pointer border-b border-white/5 transition-colors ${selectedRow ? "bg-cyan/[0.06]" : "hover:bg-white/[0.025]"}`}><td className="px-4 py-3"><p className="font-medium text-text">{bid.vendor}</p><p className="mt-0.5 text-xs text-text/40">{bid.model}</p></td><td className="px-4 py-3 font-mono text-text/80">₹{bid.upfront_cost_cr.toFixed(1)} Cr</td><td className="px-4 py-3"><PatrolBadge status={building.status} size="sm" /></td><td className="px-4 py-3"><PatrolBadge status={green.status} size="sm" /></td><td className="px-4 py-3 font-mono" style={{ color: (vice.riskScore ?? 0) > 6 ? COLORS.rose : COLORS.cyan }}>{vice.riskScore ?? 0}/10</td><td className="px-4 py-3 font-mono text-text/75">p95 {traffic.p95_days}d</td><td className="px-4 py-3 font-mono text-text/80">₹{bid.tco2_cr.toFixed(1)} Cr</td></tr>;
          })}</tbody>
        </table>
      </div>
    </Card>

    <Card accent={selected.recommendation === "REJECT" ? COLORS.rose : selected.recommendation === "ACCEPTABLE" ? COLORS.amber : COLORS.cyan} className="p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text/40">Selected bid</p>
      <h2 className="mt-1 text-lg font-semibold text-text">{selected.vendor}</h2>
      <p className="mt-1 text-sm text-text/55">{selected.model}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-xs"><Metric label="Decision" value={selected.recommendation} /><Metric label="5-year cost" value={`₹${selected.tco2_cr.toFixed(1)} Cr`} /><Metric label="Vendor risk" value={`${selectedResults.vice.riskScore ?? 0}/10`} /><Metric label="Schedule p95" value={`${selectedResults.traffic.p95_days}d`} /></div>
      <p className="mt-4 text-xs leading-relaxed text-text/60">{selectedResults.building.detail} {selectedResults.green.detail}</p>
      <Link href={`/bids/${selected.id}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:underline">Open full review <ArrowRight className="h-3.5 w-3.5" /></Link>
    </Card>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-text/40">{label}</p><p className="mt-1 font-mono text-xs font-semibold text-text">{value}</p></div>;
}
