"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import { BIDS, VENDOR_DOCS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS } from "@/lib/constants";

// Placeholder coordinates are deliberately illustrative until verified registration
// addresses and geocoding provenance are connected to the supplier record.
const MAP_POINTS: Record<string, { x: number; y: number; label: string }> = {
  A: { x: 35, y: 43, label: "Registration location pending" },
  B: { x: 58, y: 58, label: "Registration location pending" },
  C: { x: 72, y: 34, label: "Registration location pending" },
};

export default function SupplierLocationMap() {
  const [selectedId, setSelectedId] = useState("B");
  const selected = useMemo(() => BIDS.find((bid) => bid.id === selectedId) ?? BIDS[0], [selectedId]);
  const point = MAP_POINTS[selected.id];
  const reliability = runAllPatrols(selected).vice;
  const color = reliability.status === "FLAG" ? COLORS.amber : COLORS.cyan;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader title="Supplier location map" caption="One shared map updates with the selected supplier. Illustrative positions are not verified location evidence." />
        <div className="relative m-4 h-[360px] overflow-hidden rounded-lg border border-line bg-inset">
          <div className="absolute inset-0 opacity-35" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.14) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-label="Supplier location placeholder map">
            <path d="M12 19 L29 12 L43 19 L58 13 L77 23 L88 43 L78 63 L82 83 L61 92 L44 82 L26 88 L11 69 L18 48 Z" fill="rgba(96,165,250,.08)" stroke="rgba(96,165,250,.42)" strokeWidth="0.7" />
            <path d="M21 35 C38 29, 55 38, 76 29 M17 56 C36 49, 58 60, 82 53 M33 16 C31 38, 38 68, 30 86 M60 15 C56 37, 66 64, 65 90" fill="none" stroke="rgba(148,163,184,.35)" strokeWidth="0.55" strokeDasharray="2 2" />
            {BIDS.map((bid) => {
              const marker = MAP_POINTS[bid.id];
              const isSelected = bid.id === selected.id;
              return <g key={bid.id} transform={`translate(${marker.x},${marker.y})`} className="cursor-pointer" onClick={() => setSelectedId(bid.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(bid.id); } }} role="button" tabIndex={0} aria-label={`Select ${bid.vendor}`}><circle r={isSelected ? 5.5 : 3.5} fill={isSelected ? color : COLORS.blue} fillOpacity={isSelected ? 1 : 0.65} stroke="#090D16" strokeWidth="1.6" /><text x="6" y="1" fill="#F8FAFC" fontSize="4" fontFamily="sans-serif">{bid.vendor}</text></g>;
            })}
          </svg>
          <div className="absolute bottom-3 left-3 rounded border border-amber/30 bg-card/95 px-2.5 py-1.5 text-[10px] text-amber">Placeholder only — connect verified registration locations before operational use.</div>
        </div>
      </Card>

      <Card accent={color} className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text/40">Selected supplier</p>
        <h2 className="mt-1 text-lg font-semibold text-text">{selected.vendor}</h2>
        <p className="mt-1 text-sm text-text/55">{point.label}</p>
        <div className="mt-5 space-y-4 border-y border-white/10 py-4 text-sm">
          <div><p className="text-xs text-text/40">Reliability risk</p><p className="mt-1 font-mono font-bold" style={{ color }}> {reliability.riskScore ?? 0}/10</p></div>
          <div><p className="text-xs text-text/40">Evidence summary</p><p className="mt-1 text-xs leading-relaxed text-text/65">{VENDOR_DOCS[selected.id]?.[0]}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Select supplier">
          {BIDS.map((bid) => <button key={bid.id} type="button" onClick={() => setSelectedId(bid.id)} className={`rounded-md border px-2.5 py-1.5 text-xs ${bid.id === selected.id ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/10 text-text/55 hover:text-text"}`}>{bid.vendor}</button>)}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-violet/5 p-3 text-xs leading-relaxed text-text/60"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet" />Location and relationship signals are separate evidence types. A selected marker does not establish collusion or supplier suitability.</div>
      </Card>
    </div>
  );
}
