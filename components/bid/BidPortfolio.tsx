"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal, X } from "lucide-react";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import TCOSlider from "@/components/tco-slider";
import Tooltip from "@/components/ui/Tooltip";
import { BIDS, type Bid } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS } from "@/lib/constants";
import { integritySignal, marketSignal } from "@/lib/integrity";

const TcoChart = dynamic(() => import("@/components/bid/TcoChart"), {
  ssr: false,
  loading: () => <div className="flex h-64 items-center justify-center text-xs text-text/40">Loading comparison chart…</div>,
});

type DecisionFilter = "all" | Bid["recommendation"];
type ComplianceFilter = "all" | "eligible" | "has-failure";

function hasHardFailure(bid: Bid) {
  const checks = runAllPatrols(bid);
  return checks.building.status === "FAIL" || checks.green.status === "FAIL";
}

function filterLabel(filter: ComplianceFilter) {
  if (filter === "eligible") return "Hard checks pass";
  if (filter === "has-failure") return "Has hard failure";
  return "Any compliance state";
}

export default function BidPortfolio() {
  const [query, setQuery] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>("all");
  const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>(BIDS.map((bid) => bid.id));
  const [activeId, setActiveId] = useState("B");
  const [scenario, setScenario] = useState<{ bidId: string; tcoCr: number } | null>(null);

  const filteredBids = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return BIDS.filter((bid) => {
      const matchesQuery = !normalizedQuery || `${bid.vendor} ${bid.model} ${bid.equipment_type}`.toLowerCase().includes(normalizedQuery);
      const matchesDecision = decisionFilter === "all" || bid.recommendation === decisionFilter;
      const hardFailure = hasHardFailure(bid);
      const matchesCompliance = complianceFilter === "all" || (complianceFilter === "eligible" ? !hardFailure : hardFailure);
      return matchesQuery && matchesDecision && matchesCompliance;
    });
  }, [complianceFilter, decisionFilter, query]);

  const comparisonBids = filteredBids.filter((bid) => selectedIds.includes(bid.id));
  const activeBid = comparisonBids.find((bid) => bid.id === activeId) ?? comparisonBids[0];
  const canClear = query || decisionFilter !== "all" || complianceFilter !== "all";
  const displayedTco = (bid: Bid) => scenario?.bidId === bid.id ? scenario.tcoCr : bid.tco2_cr;
  const updateScenarioTco = useCallback((tcoCr: number) => {
    if (!activeBid) return;
    setScenario((current) => current?.bidId === activeBid.id && current.tcoCr === tcoCr ? current : { bidId: activeBid.id, tcoCr });
  }, [activeBid?.id]);

  function toggleBid(id: string) {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((bidId) => bidId !== id);
      return current.length < 3 ? [...current, id] : current;
    });
  }

  function clearFilters() {
    setQuery("");
    setDecisionFilter("all");
    setComplianceFilter("all");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Comparison controls"
          caption="Filter the portfolio, then select up to three bids for a like-for-like comparison."
          right={<span className="font-mono text-xs text-cyan">{comparisonBids.length} shown · {selectedIds.length}/3 selected</span>}
        />
        <div className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_190px_210px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text/40" />
              <span className="sr-only">Find a bid</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find vendor, model, or equipment" className="h-10 w-full rounded-lg border border-white/10 bg-inset pl-9 pr-3 text-sm text-text placeholder:text-text/35 focus:border-cyan/50 focus:outline-none" />
            </label>
            <label>
              <span className="sr-only">Decision state</span>
              <select value={decisionFilter} onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)} className="h-10 w-full rounded-lg border border-white/10 bg-inset px-3 text-sm text-text focus:border-cyan/50 focus:outline-none">
                <option value="all">Any decision</option>
                <option value="RECOMMENDED">Recommended</option>
                <option value="ACCEPTABLE">Acceptable</option>
                <option value="REJECT">Rejected</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Compliance state</span>
              <select value={complianceFilter} onChange={(event) => setComplianceFilter(event.target.value as ComplianceFilter)} className="h-10 w-full rounded-lg border border-white/10 bg-inset px-3 text-sm text-text focus:border-cyan/50 focus:outline-none">
                <option value="all">Any compliance state</option>
                <option value="eligible">Hard checks pass</option>
                <option value="has-failure">Has hard failure</option>
              </select>
            </label>
            <button type="button" onClick={clearFilters} disabled={!canClear} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs text-text/60 transition-colors hover:border-white/25 hover:text-text disabled:cursor-not-allowed disabled:opacity-35"><X className="h-3.5 w-3.5" /> Clear</button>
          </div>

          <div className="flex flex-wrap gap-2" aria-label="Bids available for comparison">
            {filteredBids.map((bid) => {
              const chosen = selectedIds.includes(bid.id);
              const disabled = !chosen && selectedIds.length >= 3;
              return <label key={bid.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${chosen ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-white/10 text-text/60 hover:border-white/25 hover:text-text"} ${disabled ? "cursor-not-allowed opacity-45" : ""}`}><input type="checkbox" checked={chosen} disabled={disabled} onChange={() => toggleBid(bid.id)} className="accent-[#38BDF8]" /><span>{bid.vendor}</span><span className="text-text/40">· {bid.model}</span></label>;
            })}
            {filteredBids.length === 0 && <p className="py-2 text-xs text-text/50">No bids match these filters.</p>}
          </div>
        </div>
      </Card>

      {comparisonBids.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <Card>
            <CardHeader title="Bid comparison" caption={`Showing ${comparisonBids.length} selected bid${comparisonBids.length === 1 ? "" : "s"}. Select a row to update the inspector.`} right={<span className="inline-flex items-center gap-1.5 text-xs text-text/50"><SlidersHorizontal className="h-3.5 w-3.5 text-blue" /> {filterLabel(complianceFilter)}</span>} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40"><th className="px-4 py-3 font-medium">Bid</th><th className="px-4 py-3 font-medium">Upfront</th><th className="px-4 py-3 font-medium">Engineering</th><th className="px-4 py-3 font-medium">Carbon / market</th><th className="px-4 py-3 font-medium">Vendor risk</th><th className="px-4 py-3 font-medium">ACI</th><th className="px-4 py-3 font-medium">Integrity</th><th className="px-4 py-3 font-medium">Schedule</th><th className="px-4 py-3 font-medium">5-year TCO²</th><th className="px-4 py-3 font-medium">Decision</th></tr></thead>
                <tbody>{comparisonBids.map((bid) => {
                  const { building, green, vice, traffic } = runAllPatrols(bid);
                  const integrity = integritySignal(bid);
                  const market = marketSignal(bid);
                  const isActive = bid.id === activeBid?.id;
                  const decisionColor = bid.recommendation === "REJECT" ? COLORS.rose : bid.recommendation === "ACCEPTABLE" ? COLORS.amber : COLORS.cyan;
                  return <tr key={bid.id} onClick={() => setActiveId(bid.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setActiveId(bid.id); } }} role="button" tabIndex={0} aria-label={`Inspect ${bid.vendor}`} className={`cursor-pointer border-b border-white/5 transition-colors ${isActive ? "bg-cyan/[0.06]" : "hover:bg-white/[0.025]"}`}><td className="px-4 py-3"><p className="font-medium text-text">{bid.vendor}</p><p className="mt-0.5 text-xs text-text/40">{bid.model}</p></td><td className="px-4 py-3 font-mono text-text/80">₹{bid.upfront_cost_cr.toFixed(1)} Cr</td><td className="px-4 py-3"><PatrolBadge status={building.status} size="sm" /></td><td className="px-4 py-3"><PatrolBadge status={green.status} size="sm" /><p className={`mt-1 font-mono text-[10px] ${market.anomaly ? "text-amber" : "text-text/40"}`}>{market.label}</p></td><td className="px-4 py-3 font-mono" style={{ color: (vice.riskScore ?? 0) > 6 ? COLORS.rose : COLORS.cyan }}>{vice.riskScore ?? 0}/10</td><td className="px-4 py-3 font-mono font-bold" style={{ color: integrity.status === "FLAG" ? COLORS.rose : COLORS.cyan }}>{integrity.aci}</td><td className="px-4 py-3"><Tooltip text={`[${integrity.status}] ${integrity.metadata.map((detail) => `${detail.label}: ${detail.value}`).join(" · ")}`}><span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold" style={{ color: integrity.status === "FLAG" ? COLORS.rose : COLORS.cyan }}><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: integrity.status === "FLAG" ? COLORS.rose : COLORS.cyan }} />{integrity.status}</span></Tooltip><p className="mt-1 max-w-[180px] font-mono text-[10px] leading-snug text-text/40">{integrity.summary}</p></td><td className="px-4 py-3 font-mono text-text/75">p95 {traffic.p95_days}d</td><td className={`px-4 py-3 font-mono text-text/80 ${scenario?.bidId === bid.id ? "animate-pulse" : ""}`}>₹{displayedTco(bid).toFixed(1)} Cr</td><td className="px-4 py-3"><span className="rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ color: decisionColor, backgroundColor: `${decisionColor}18` }}>{bid.recommendation}</span></td></tr>;
                })}</tbody>
              </table>
            </div>
            {activeBid?.id === "B" && <div className="border-t border-white/10 p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Vendor B · scenario modeling</p><p className="mt-1 text-xs text-text/55">Adjust a bounded parameter and compare the deterministic 5-year total in this docket.</p><div className="mt-3"><TCOSlider key={activeBid.id} baseCapexCr={activeBid.upfront_cost_cr} onTCOChange={updateScenarioTco} /></div></div>}
            <div className="p-4"><TcoChart data={comparisonBids.map((bid) => ({ vendor: bid.vendor.replace("Vendor ", "V"), Upfront: bid.upfront_cost_cr, "5-Year TCO²": displayedTco(bid) }))} /></div>
          </Card>

          {activeBid && <BidInspector bid={activeBid} />}
        </div>
      ) : (
        <Card className="p-8 text-center"><p className="text-sm font-medium text-text">No selected bids match the current filters.</p><p className="mt-2 text-xs text-text/55">Clear a filter or choose an available bid above to restore the comparison.</p></Card>
      )}
    </div>
  );
}

function BidInspector({ bid }: { bid: Bid }) {
  const results = useMemo(() => runAllPatrols(bid), [bid]);
  const decisionColor = bid.recommendation === "REJECT" ? COLORS.rose : bid.recommendation === "ACCEPTABLE" ? COLORS.amber : COLORS.cyan;

  return <Card accent={decisionColor} className="h-fit p-5 xl:sticky xl:top-5"><p className="font-mono text-[10px] uppercase tracking-wider text-text/40">Selected bid</p><h2 className="mt-1 text-lg font-semibold text-text">{bid.vendor}</h2><p className="mt-1 text-sm text-text/55">{bid.model}</p><div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-xs"><Metric label="Decision" value={bid.recommendation} /><Metric label="5-year cost" value={`₹${bid.tco2_cr.toFixed(1)} Cr`} /><Metric label="Vendor risk" value={`${results.vice.riskScore ?? 0}/10`} /><Metric label="Schedule p95" value={`${results.traffic.p95_days}d`} /></div><p className="mt-4 text-xs leading-relaxed text-text/60">{results.building.detail} {results.green.detail}</p><Link href={`/bids/${bid.id}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan hover:underline">Open bid review <ArrowRight className="h-3.5 w-3.5" /></Link></Card>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-text/40">{label}</p><p className="mt-1 font-mono text-xs font-semibold text-text">{value}</p></div>;
}
