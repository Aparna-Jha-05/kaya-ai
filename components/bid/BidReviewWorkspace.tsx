"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FileSearch, Network, ShieldCheck, ScrollText } from "lucide-react";
import { Bid, FIELD_CONFIDENCE } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { COLORS, PATROL_META, REVIEW_STATE } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";
import PatrolBadge from "@/components/bid/PatrolBadge";
import EvidenceBoard from "@/components/bid/EvidenceBoard";
import CADVisualizer from "@/components/cad-visualizer";
import { integritySignal, marketSignal } from "@/lib/integrity";

type Tab = "decision" | "evidence" | "checks" | "consequences" | "activity";

const TABS: { id: Tab; label: string; Icon: typeof ShieldCheck }[] = [
  { id: "decision", label: "Summary", Icon: ShieldCheck },
  { id: "evidence", label: "Source data", Icon: FileSearch },
  { id: "checks", label: "Checks", Icon: CheckCircle2 },
  { id: "consequences", label: "Impact", Icon: Network },
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
  const reviewState = REVIEW_STATE[bid.recommendation];

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-white/10 bg-card/60 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="page-eyebrow">Bid review</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-text">{bid.vendor}</h2>
              <span className="rounded px-2 py-1 text-[10px] font-bold uppercase" style={{ color: reviewState.color, backgroundColor: `${reviewState.color}18` }}>{reviewState.label}</span>
            </div>
            <p className="mt-1 text-sm text-text/55">{bid.equipment_type} · {bid.model} · {bid.po_number}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-right text-xs">
            <Metric label="Upfront cost" value={`₹${bid.upfront_cost_cr.toFixed(1)} Cr`} />
            <Metric label="5-year cost" value={`₹${bid.tco2_cr.toFixed(1)} Cr`} />
            <Metric label="P95 delay" value={`+${results.traffic.p95_days}d`} />
          </div>
        </div>
      </section>

      <div className="tab-strip overflow-x-auto border-b border-white/10">
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
      {tab === "checks" && <ChecksTab bid={bid} results={results} onInspect={setInspected} />}
      {tab === "consequences" && <EvidenceBoard bid={bid} />}
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
  const title = failures.length ? "Do not advance until hard failures are resolved" : flags.length ? "Review flagged evidence before selecting this bid" : "Ready for a reviewer decision";

  return (
    <div className="space-y-5">
      <Card accent={tone} className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: tone }}>Review state</p>
        <h3 className="mt-1 text-lg font-semibold text-text">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text/60">This state is based on deterministic checks. It does not approve a purchase order; inspect cited evidence before recording a reviewer action.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.values(results).map((result) => <PatrolBadge key={result.key} status={result.status} />)}
        </div>
      </Card>
      <Card><CardHeader title="Reviewer action" caption="Sample fallback cannot record a reviewer action." /><div className="p-4 text-sm text-text/60">Reconnect the bid service and open a persisted bid to review an RFI draft or record a human decision.</div></Card>
    </div>
  );
}

function EvidenceTab({ bid }: { bid: Bid }) {
  const confidence = FIELD_CONFIDENCE[bid.id] ?? {};
  const integrity = integritySignal(bid);
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Extracted source data" caption="Confirm low-confidence values before using them in a review." />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40"><th className="px-4 py-3 font-medium">Field</th><th className="px-4 py-3 font-medium">Extracted value</th><th className="px-4 py-3 font-medium">Confidence</th></tr></thead>
            <tbody>
              {displayFields.map(({ key, label, unit }) => {
                const raw = bid[key];
                const value = typeof raw === "boolean" ? (raw ? "Present" : "Missing") : `${Number(raw).toLocaleString()}${unit ? ` ${unit}` : ""}`;
                const score = confidence[key as string];
                const needsReview = score != null && score < 0.85;
                return <tr key={key} className="border-b border-white/5"><td className="px-4 py-3 text-text/75">{label}</td><td className="px-4 py-3 font-mono text-text">{value}</td><td className="px-4 py-3 font-mono" style={{ color: needsReview ? COLORS.amber : COLORS.cyan }}>{score == null ? "Not scored" : `${Math.round(score * 100)}%`}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {integrity.status === "FLAG" && <Card><CardHeader title="Related records" caption="Supporting signals from retained vendor records. They require reviewer interpretation." /><div className="p-4 text-sm text-violet">{integrity.metadata.length - 1} related-record signals need review.</div></Card>}
      {bid.id === "B" && <CADVisualizer initialWidthM={2.1} doorLimitM={1.9} />}
    </div>
  );
}

function ChecksTab({ bid, results, onInspect }: { bid: Bid; results: ReturnType<typeof runAllPatrols>; onInspect: (evidence: { title: string; detail: string; rule: string }) => void }) {
  return <section aria-label="Compliance checks" className="grid gap-4 lg:grid-cols-2">{Object.values(results).map((result) => {
    const meta = PATROL_META[result.key];
    return <Card key={result.key} accent={meta.color} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-text">{meta.name}</p><p className="mt-1 text-xs text-text/55">{result.detail}</p></div><PatrolBadge status={result.status} size="sm" /></div><code className="mt-3 block break-words rounded bg-inset px-3 py-2 text-[10px] text-text/60">{result.rule}</code><ul className="mt-3 space-y-1 text-xs text-text/55">{result.evidence.map((item) => <li key={item}><button type="button" onClick={() => onInspect({ title: meta.name, detail: item, rule: result.rule })} className="text-left hover:text-cyan hover:underline">• {item}</button></li>)}</ul><PatrolEnhancements bid={bid} patrol={result.key} /></Card>;
  })}</section>;
}

function PatrolEnhancements({ bid, patrol }: { bid: Bid; patrol: "building" | "green" | "vice" | "traffic" }) {
  const integrity = integritySignal(bid);
  const market = marketSignal(bid);
  const content = patrol === "building"
    ? ["Site constraints are from the retained project snapshot.", "The proposed substitute is checked against the same site limits."]
    : patrol === "green"
      ? [`Market benchmark: ${market.label.replace(" · anomaly", "")} ${market.anomaly ? "— review specification" : "— within normal range"}`]
      : patrol === "vice"
        ? [`Contract record score: ${integrity.aci}/100`, `Reliability evidence: ${integrity.summary}`, `Outlook: ${(integrity.aci > 0 || (bid.vendor_history.late_deliveries / bid.vendor_history.total_deliveries) >= 0.4) ? "risk increasing" : "stable"}`]
        : ["Safe order date: 02 Aug 2026", "Re-run this check if a post-award specification changes."];
  return <div className="mt-3 border-t border-white/5 pt-3"><p className="font-mono text-[9px] uppercase tracking-wider text-text/40">Review context</p><ul className="mt-1.5 space-y-1 text-[11px] text-text/55">{content.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}

function ActivityTab({ bid }: { bid: Bid }) {
  return <Card><CardHeader title="Bid activity" caption="Sample fallback does not retain activity." /><p className="p-5 text-sm text-text/55">Reconnect the activity service and open a persisted bid to view server-recorded events.</p></Card>;
}

function EvidenceDrawer({ evidence, onClose }: { evidence: { title: string; detail: string; rule: string }; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    document.body.classList.add("scroll-locked");
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("scroll-locked");
    };
  }, [onClose]);
  return <div className="fixed inset-0 z-50 bg-bg/60" role="presentation" onMouseDown={onClose}><aside role="dialog" aria-modal="true" aria-label="Evidence detail" onMouseDown={(event) => event.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-line bg-card shadow-2xl"><div className="flex items-start justify-between border-b border-white/10 px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-wider text-cyan">Evidence detail</p><h3 className="mt-1 text-base font-semibold text-text">{evidence.title}</h3></div><button ref={closeRef} type="button" onClick={onClose} className="rounded border border-white/10 px-2 py-1 text-xs text-text/60 hover:text-text">Close</button></div><div className="space-y-5 overflow-y-auto p-5"><section><p className="text-[10px] uppercase tracking-wide text-text/40">Evidence</p><p className="mt-2 text-sm leading-relaxed text-text/75">{evidence.detail}</p></section><section><p className="text-[10px] uppercase tracking-wide text-text/40">Deterministic rule</p><code className="mt-2 block break-words rounded bg-inset p-3 text-xs text-text/65">{evidence.rule}</code></section><p className="rounded border border-amber/25 bg-amber/5 p-3 text-xs leading-relaxed text-amber/90">Review source evidence before authorising an action. This panel does not change the result.</p></div></aside></div>;
}
