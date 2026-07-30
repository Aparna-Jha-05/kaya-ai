"use client";
import { useMemo, useState } from "react";
import type { BidRecord } from "@/lib/api";
import { COLORS } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";
import { displayCheckName } from "@/lib/recordUtils";

// Deterministic directed-graph renderer: fixed node geometry + hand-drawn SVG
// connectors. Kept off React Flow; layout is computed from patrol_results so
// every browser renders identically without ResizeObserver measurement.

const NODE_W = 208;
const NODE_H = 76;

interface GNode {
  id: string; x: number; y: number; label: string; color: string;
  kind: string; details?: Array<{ label: string; value: string }>;
}
interface GEdge { source: string; target: string; color: string; }

function n(id: string, x: number, y: number, label: string, color: string, kind: string, details?: GNode["details"]): GNode {
  return { id, x, y, label, color, kind, details };
}
function e(source: string, target: string, color: string): GEdge { return { source, target, color }; }

const PATROL_META: Record<string, { impact: string; action: string }> = {
  BUILDING_PATROL:  { impact: "Electrical / structural redesign required",   action: "Do not select — hard constraint breach" },
  GREEN_PATROL:     { impact: "Sustainability + operating-cost penalty",      action: "Carbon and LEED certification at risk" },
  VICE_SQUAD:       { impact: "Vendor reliability review required",           action: "Human integrity review; context only" },
  TRAFFIC_CONTROL:  { impact: "Schedule contingency needed",                  action: "Re-run check if post-award spec changes" },
};

function patrolColor(status: string, name: string): string {
  if (status === "FAIL") return COLORS.rose;
  if (name.toLowerCase().includes("vice")) return COLORS.violet;
  return COLORS.amber;
}

function buildGraph(record: BidRecord): { nodes: GNode[]; edges: GEdge[] } {
  const fails = record.scorecard.patrol_results.filter((p) => p.status !== "PASS");

  if (fails.length === 0) {
    return {
      nodes: [
        n("root", 20, 40, "Bid matches the recorded site specification", COLORS.cyan, "SOURCE",
          [{ label: "Site constraint source", value: "Retained project snapshot" }]),
        n("ok", 340, 40, "All checks passed — no downstream impact", COLORS.cyan, "RESULT"),
      ],
      edges: [e("root", "ok", COLORS.cyan)],
    };
  }

  const rowH = 104;
  const rootY = Math.max(0, ((fails.length - 1) * rowH) / 2);
  const rootColor = fails.some((p) => p.status === "FAIL") ? COLORS.rose : COLORS.amber;
  const nodes: GNode[] = [n("root", 20, rootY, "Submitted bid specification", rootColor, "CAUSE")];
  const edges: GEdge[] = [];

  fails.forEach((patrol, i) => {
    const y = i * rowH;
    const color = patrolColor(patrol.status, patrol.patrol_name);
    const meta = PATROL_META[patrol.patrol_name] ?? { impact: "Compliance review required", action: "Reviewer action needed" };
    const evidenceDetails: GNode["details"] = patrol.evidence
      ? Object.entries(patrol.evidence).map(([k, v]) => ({ label: k.replaceAll("_", " "), value: String(v) }))
      : undefined;
    const consequenceColor = patrol.status === "FAIL" ? COLORS.rose : COLORS.amber;

    nodes.push(
      n(`e${i}`, 320, y, patrol.reason.length > 80 ? patrol.reason.slice(0, 77) + "…" : patrol.reason, color, displayCheckName(patrol.patrol_name).toUpperCase(), evidenceDetails),
      n(`i${i}`, 620, y, meta.impact, color, patrol.status === "FAIL" ? "ENGINEERING" : "REVIEW"),
      n(`c${i}`, 920, y, meta.action, consequenceColor, "CONSEQUENCE"),
    );
    edges.push(
      e("root", `e${i}`, color),
      e(`e${i}`, `i${i}`, color),
      e(`i${i}`, `c${i}`, consequenceColor),
    );
  });

  return { nodes, edges };
}

function edgePath(s: GNode, t: GNode) {
  const x1 = s.x + NODE_W, y1 = s.y + NODE_H / 2;
  const x2 = t.x, y2 = t.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export default function EvidenceBoard({ record }: { record: BidRecord }) {
  const { nodes, edges } = useMemo(() => buildGraph(record), [record]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = useMemo(() => Object.fromEntries(nodes.map((nd) => [nd.id, nd])), [nodes]);
  const selected = nodes.find((nd) => nd.id === selectedId);
  const width = Math.max(...nodes.map((nd) => nd.x + NODE_W)) + 24;
  const height = Math.max(...nodes.map((nd) => nd.y + NODE_H)) + 24;
  const colors = Array.from(new Set(edges.map((ed) => ed.color)));

  return (
    <Card>
      <CardHeader
        title="Downstream impact"
        caption="How each patrol failure cascades into engineering, carbon, vendor, and schedule consequences. Select a node for evidence."
      />
      <div className="terminal-grid overflow-x-auto rounded-b-xl p-4">
        <div className="relative mx-auto" style={{ width, height, minWidth: width }}>
          <svg className="absolute inset-0 h-full w-full" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
              {colors.map((c, ci) => (
                <marker key={c} id={`arrow-${ci}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L6,3 L0,6 Z" fill={c} />
                </marker>
              ))}
            </defs>
            {edges.map((ed, i) => {
              const s = byId[ed.source], t = byId[ed.target];
              if (!s || !t) return null;
              return (
                <path key={i} d={edgePath(s, t)} fill="none" stroke={ed.color} strokeWidth={2} strokeDasharray="6 6"
                  markerEnd={`url(#arrow-${colors.indexOf(ed.color)})`}
                  className="animate-flowDash" style={{ filter: `drop-shadow(0 0 3px ${ed.color}66)` }}
                />
              );
            })}
          </svg>
          {nodes.map((nd) => (
            <button key={nd.id} type="button" onClick={() => setSelectedId(nd.id === selectedId ? null : nd.id)}
              className={`absolute flex cursor-pointer flex-col justify-center rounded-xl border bg-surface px-3.5 py-2.5 text-left shadow-xs transition-all hover:bg-card tactile-press ${selectedId === nd.id ? "border-cyan ring-2 ring-cyan/40" : "border-line"}`}
              style={{ left: nd.x, top: nd.y, width: NODE_W, height: NODE_H, borderLeft: `3.5px solid ${nd.color}` }}>
              <div className="mb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: nd.color }}>{nd.kind}</div>
              <div className="text-xs font-semibold leading-snug text-text">{nd.label}</div>
            </button>
          ))}
        </div>
      </div>
      {selected?.details && (
        <div className="border-t border-line bg-surface/50 px-4 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: selected.color }}>{selected.kind} details</p>
              <p className="mt-1 text-xs font-medium text-text/70">{selected.label}</p>
            </div>
            <button type="button" onClick={() => setSelectedId(null)} className="text-xs font-semibold text-text/50 hover:text-text">Close</button>
          </div>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {selected.details.map((d) => (
              <div key={d.label} className="rounded-xl border border-line bg-card px-3 py-2 shadow-xs">
                <dt className="font-mono text-[9px] font-bold uppercase tracking-wider text-text/45">{d.label}</dt>
                <dd className="mt-1 font-mono text-xs text-text/80">{d.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Card>
  );
}
