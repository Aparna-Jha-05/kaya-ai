"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { CheckCircle2, FileSearch, GitCompareArrows, Network, ShieldCheck, ScrollText } from "lucide-react";
import { Bid, FIELD_CONFIDENCE } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS, PATROL_META } from "@/lib/constants";
import { getAudit, subscribeAudit } from "@/lib/audit";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import Docket from "@/components/bid/Docket";
import EvidenceBoard from "@/components/bid/EvidenceBoard";
import CADVisualizer from "@/components/cad-visualizer";
import CaseFile from "@/components/agent/CaseFile";

type Tab = "decision" | "evidence" | "checks" | "alternatives" | "impact" | "activity";

const TABS: { id: Tab; label: string; Icon: typeof ShieldCheck }[] = [
  { id: "decision", label: "Decision", Icon: ShieldCheck },
  { id: "evidence", label: "Evidence", Icon: FileSearch },
  { id: "checks", label: "Checks", Icon: CheckCircle2 },
  { id: "alternatives", label: "Alternatives", Icon: GitCompareArrows },
  { id: "impact", label: "Impact", Icon: Network },
  { id: "activity", label: "Activity", Icon: ScrollText },
];

const displayFields: { key: keyof Bid; label: string; unit?: string }[] = [
  { key: "power_draw_kw", label: "Power draw", unit: "kW" },
  { key: "cooling_capacity_kw", label: "Cooling capacity", unit: "kW" },
  { key: "water_evaporation_gpm", label: "Water evaporation", unit: "gpm" },
  { key: "floor_load_kg_m2", label: "Floor load", unit: "kg/m²" },
  { key: "carbon_intensity_kgco2e", label: "Embodied carbon", unit: "kgCO₂e" },
  { key: "delivery_weeks", label: "Delivery commitment", unit: "weeks" },
  { key: "has_safety_cert", label: "Safety certificate" },
];

export default function BidReviewWorkspace({ bid }: { bid: Bid }) {
  const [tab, setTab] = useState<Tab>("decision");
  const [inspected, setInspected] = useState<{ title: string; detail: string; rule: string } | null>(null);
  const results = useMemo(() => runAllPatrols(bid), [bid]);
  const decisionColor = bid.recommendation === "REJECT" ? COLORS.rose : bid.recommendation === "RECOMMENDED" ? COLORS.cyan : COLORS.amber;

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/10 bg-card/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-blue">Bid review</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-text">{bid.vendor}</h2>
              <span className="rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ color: decisionColor, backgroundColor: `${decisionColor}18` }}>{bid.recommendation}</span>
            </div>
            <p className="mt-1 text-sm text-text/55">{bid.equipment_type} · {bid.model} · {bid.po_number}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right text-xs">
            <Metric label="Upfront" value={`₹${bid.upfront_cost_cr.toFixed(1)} Cr`} />
            <Metric label="5-year cost" value={`₹${bid.tco2_cr.toFixed(1)} Cr`} />
            <Metric label="Schedule p95" value={`${results.traffic.p95_days}d`} />
          </div>
        </div>
      </section>

      <div className="overflow-x-auto border-b border-white/10">
        <div role="tablist" aria-label="Bid review sections" className="flex min-w-max gap-1">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${tab === id ? "border-cyan text-cyan" : "border-transparent text-text/55 hover:text-text"}`}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "decision" && <DecisionTab bid={bid} results={results} />}
      {tab === "evidence" && <EvidenceTab bid={bid} />}
      {tab === "checks" && <ChecksTab results={results} onInspect={setInspected} />}
      {tab === "alternatives" && <Docket highlightId={bid.id} />}
      {tab === "impact" && <EvidenceBoard bid={bid} />}
      {tab === "activity" && <ActivityTab bid={bid} />}
      {inspected && <EvidenceDrawer evidence={inspected} onClose={() => setInspected(null)} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] uppercase tracking-wide text-text/40">{label}</p><p className="mt-1 font-mono font-semibold text-text">{value}</p></div>;
}

function DecisionTab({ bid, results }: { bid: Bid; results: ReturnType<typeof runAllPatrols> }) {
  const failures = Object.values(results).filter((result) => result.status === "FAIL");
  const flags = Object.values(results).filter((result) => result.status === "FLAG");
  const tone = failures.length ? COLORS.rose : flags.length ? COLORS.amber : COLORS.cyan;
  const title = failures.length ? "Do not advance until failures are resolved" : flags.length ? "Review flagged evidence before selecting this bid" : "Ready for authorized procurement decision";

  return (
    <div className="space-y-5">
      <Card accent={tone} className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: tone }}>Decision state</p>
        <h3 className="mt-1 text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text/60">The recommendation is generated from deterministic checks and does not approve a purchase order. Inspect the linked evidence before recording a human decision.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.values(results).map((result) => <PatrolBadge key={result.key} status={result.status} />)}
        </div>
      </Card>
      {bid.id === "B" ? <CaseFile bid={bid} /> : <Card><CardHeader title="Human authorization" caption="No approval has been recorded for this demo bid." /><div className="p-4 text-sm text-text/60">Record an approval, rejection, or escalation only after the reviewer confirms the cited evidence and applicable procurement policy.</div></Card>}
    </div>
  );
}

function EvidenceTab({ bid }: { bid: Bid }) {
  const confidence = FIELD_CONFIDENCE[bid.id] ?? {};
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Extracted bid evidence" caption="Values are shown with their extraction confidence. Low-confidence values require confirmation before use." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40"><th className="px-4 py-3 font-medium">Field</th><th className="px-4 py-3 font-medium">Extracted value</th><th className="px-4 py-3 font-medium">Confidence</th><th className="px-4 py-3 font-medium">Evidence state</th></tr></thead>
            <tbody>
              {displayFields.map(({ key, label, unit }) => {
                const raw = bid[key];
                const value = typeof raw === "boolean" ? (raw ? "Present" : "Missing") : `${Number(raw).toLocaleString()}${unit ? ` ${unit}` : ""}`;
                const score = confidence[key as string];
                const needsReview = score != null && score < 0.85;
                return <tr key={key} className="border-b border-white/5"><td className="px-4 py-3 text-text/75">{label}</td><td className="px-4 py-3 font-mono text-text">{value}</td><td className="px-4 py-3 font-mono" style={{ color: needsReview ? COLORS.amber : COLORS.cyan }}>{score == null ? "Not scored" : `${Math.round(score * 100)}%`}</td><td className="px-4 py-3 text-xs" style={{ color: needsReview ? COLORS.amber : COLORS.cyan }}>{needsReview ? "Review required" : "Ready for validation"}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {bid.id === "B" && <CADVisualizer initialWidthM={2.1} doorLimitM={1.9} />}
    </div>
  );
}

function ChecksTab({ results, onInspect }: { results: ReturnType<typeof runAllPatrols>; onInspect: (evidence: { title: string; detail: string; rule: string }) => void }) {
  return <div className="grid gap-4 lg:grid-cols-2">{Object.values(results).map((result) => {
    const meta = PATROL_META[result.key];
    return <Card key={result.key} accent={meta.color} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-text">{meta.name}</p><p className="mt-1 text-xs text-text/55">{result.detail}</p></div><PatrolBadge status={result.status} size="sm" /></div><code className="mt-3 block break-words rounded bg-inset px-3 py-2 text-[10px] text-text/60">{result.rule}</code><ul className="mt-3 space-y-1 text-xs text-text/55">{result.evidence.map((item) => <li key={item}><button type="button" onClick={() => onInspect({ title: meta.name, detail: item, rule: result.rule })} className="text-left hover:text-cyan hover:underline">• {item}</button></li>)}</ul></Card>;
  })}</div>;
}

function ActivityTab({ bid }: { bid: Bid }) {
  const rows = useSyncExternalStore(subscribeAudit, getAudit, () => []);
  const matched = rows.filter((row) => row.bid === bid.vendor);
  return <Card><CardHeader title="Bid activity" caption="Decision and workflow events for this bid. The full cross-project record is available in Audit trail." />{matched.length ? <ul className="divide-y divide-white/5">{matched.map((row, index) => <li key={`${row.timestamp}-${index}`} className="px-4 py-3"><p className="text-sm text-text/80">{row.action} <span className="text-text/40">· {row.patrol}</span></p><p className="mt-1 text-xs text-text/50">{row.evidence}</p></li>)}</ul> : <p className="p-5 text-sm text-text/55">No bid-specific events have been recorded in this browser session.</p>}</Card>;
}

function EvidenceDrawer({ evidence, onClose }: { evidence: { title: string; detail: string; rule: string }; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 bg-bg/60" role="presentation" onMouseDown={onClose}><aside role="dialog" aria-modal="true" aria-label="Evidence inspector" onMouseDown={(event) => event.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-card shadow-2xl"><div className="flex items-start justify-between border-b border-white/10 px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Evidence inspector</p><h3 className="mt-1 text-base font-semibold text-text">{evidence.title}</h3></div><button type="button" onClick={onClose} className="rounded border border-white/10 px-2 py-1 text-xs text-text/60 hover:text-text">Close</button></div><div className="space-y-5 overflow-y-auto p-5"><section><p className="text-[10px] uppercase tracking-wide text-text/40">Evidence</p><p className="mt-2 text-sm leading-relaxed text-text/75">{evidence.detail}</p></section><section><p className="text-[10px] uppercase tracking-wide text-text/40">Deterministic rule</p><code className="mt-2 block break-words rounded bg-inset p-3 text-xs text-text/65">{evidence.rule}</code></section><p className="rounded border border-amber/25 bg-amber/5 p-3 text-xs leading-relaxed text-amber/90">Review the source evidence before authorizing an action. This inspector does not change the underlying result.</p></div></aside></div>;
}
