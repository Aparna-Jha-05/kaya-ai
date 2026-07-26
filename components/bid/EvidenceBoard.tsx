"use client";
import { useMemo, useState } from "react";
import { Bid } from "@/lib/mockData";
import { COLORS } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";
import { integritySignal } from "@/lib/integrity";

// A deterministic directed-graph renderer: fixed node geometry + hand-drawn SVG
// connectors. No async layout/measurement, so the cascade renders identically
// in every browser. (Kept off React Flow, whose ResizeObserver-based handle
// measurement proved unreliable in some embedded browser contexts.)

const NODE_W = 208;
const NODE_H = 76;

interface GNode {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
  kind: string;
  details?: Array<{ label: string; value: string }>;
}
interface GEdge {
  source: string;
  target: string;
  color: string;
}

function n(id: string, x: number, y: number, label: string, color: string, kind: string, details?: GNode["details"]): GNode {
  return { id, x, y, label, color, kind, details };
}
function e(source: string, target: string, color: string): GEdge {
  return { source, target, color };
}

function buildGraph(bid: Bid): { nodes: GNode[]; edges: GEdge[] } {
  const integrity = integritySignal(bid);
  if (bid.id !== "B") {
    return {
      nodes: [
        n("root", 20, 40, "Bid matches the recorded site specification", COLORS.cyan, "SOURCE", [{ label: "Site constraint source", value: "Retained project snapshot" }]),
        n("ok", 340, 40, "All checks passed — no downstream impact", COLORS.cyan, "RESULT"),
      ],
      edges: [e("root", "ok", COLORS.cyan)],
    };
  }

  const nodes: GNode[] = [
    n("root", 20, 210, "Chiller model substituted in the bid PDF", COLORS.rose, "CAUSE"),

    n("p1", 320, 20, "Power draw +10% (1,400 kW)", COLORS.rose, "EVIDENCE", [{ label: "Site constraint source", value: "Retained project snapshot" }, { label: "Constraint", value: "1,400 kW > 1,200 kW substation limit" }]),
    n("p2", 620, 20, "Electrical panel redesign", COLORS.rose, "ENGINEERING"),
    n("p3", 920, 20, "Do not select; request revision", COLORS.rose, "CONSEQUENCE"),

    n("w1", 320, 118, "Water usage +15% (460 gpm)", COLORS.amber, "EVIDENCE", [{ label: "Carbon evidence", value: "920,000 kgCO₂e exceeds the project budget" }]),
    n("w2", 620, 118, "Sustainability + cooling risk", COLORS.amber, "CARBON"),
    n("w3", 920, 118, "Carbon and operating-cost penalty", COLORS.amber, "CONSEQUENCE"),

    n("f1", 320, 216, "Floor load +8% (1,620 kg/m²)", COLORS.rose, "EVIDENCE"),
    n("f2", 620, 216, "Structural tolerance breach", COLORS.rose, "STRUCTURAL"),
    n("f3", 920, 216, "Hard failure", COLORS.rose, "CONSEQUENCE"),

    n("s1", 320, 314, "Vendor late on 3 of 5 deliveries", COLORS.violet, "EVIDENCE"),
    n("s2", 620, 314, "Required-on-job date risk", COLORS.blue, "SCHEDULE"),
    n("s3", 920, 314, "Schedule contingency", COLORS.blue, "CONSEQUENCE"),

    n("c1", 320, 412, "Missing safety certificate", COLORS.rose, "EVIDENCE"),
    n("c2", 620, 412, "Compliance hold", COLORS.rose, "DOCUMENT"),
    n("c3", 920, 412, "Procurement review required", COLORS.rose, "CONSEQUENCE"),

    n("i1", 320, 510, `Vendor record score ${integrity.aci}/100`, COLORS.violet, "VENDOR HISTORY", integrity.metadata),
    n("i2", 620, 510, "Reviewer checks supporting records", COLORS.violet, "REVIEW"),
    n("i3", 920, 510, "Context only; not compliance proof", COLORS.amber, "INTERPRETATION"),
  ];

  const edges: GEdge[] = [
    e("root", "p1", COLORS.rose),
    e("p1", "p2", COLORS.rose),
    e("p2", "p3", COLORS.rose),
    e("root", "w1", COLORS.amber),
    e("w1", "w2", COLORS.amber),
    e("w2", "w3", COLORS.amber),
    e("root", "f1", COLORS.rose),
    e("f1", "f2", COLORS.rose),
    e("f2", "f3", COLORS.rose),
    e("root", "s1", COLORS.violet),
    e("s1", "s2", COLORS.blue),
    e("s2", "s3", COLORS.blue),
    e("root", "c1", COLORS.rose),
    e("c1", "c2", COLORS.rose),
    e("c2", "c3", COLORS.rose),
    e("root", "i1", COLORS.violet),
    e("i1", "i2", COLORS.violet),
    e("i2", "i3", COLORS.amber),
  ];

  return { nodes, edges };
}

function edgePath(s: GNode, t: GNode) {
  const x1 = s.x + NODE_W;
  const y1 = s.y + NODE_H / 2;
  const x2 = t.x;
  const y2 = t.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export default function EvidenceBoard({ bid }: { bid: Bid }) {
  const { nodes, edges } = useMemo(() => buildGraph(bid), [bid]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const byId = useMemo(() => Object.fromEntries(nodes.map((nd) => [nd.id, nd])), [nodes]);
  const selected = nodes.find((node) => node.id === selectedId);

  const width = Math.max(...nodes.map((nd) => nd.x + NODE_W)) + 24;
  const height = Math.max(...nodes.map((nd) => nd.y + NODE_H)) + 24;

  // Unique arrow-marker per color used.
  const colors = Array.from(new Set(edges.map((ed) => ed.color)));

  return (
    <Card>
      <CardHeader
        title="Downstream impact"
        caption="See how the proposed substitute affects engineering, carbon, vendor reliability, documents, and schedule. Select a node for evidence."
      />
      <div className="terminal-grid overflow-x-auto rounded-b-xl p-4">
        <div className="relative mx-auto" style={{ width, height, minWidth: width }}>
          {/* edge layer */}
          <svg
            className="absolute inset-0 h-full w-full"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
          >
            <defs>
              {colors.map((c) => (
                <marker
                  key={c}
                  id={`arrow-${colors.indexOf(c)}`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill={c} />
                </marker>
              ))}
            </defs>
            {edges.map((ed, i) => {
              const s = byId[ed.source];
              const t = byId[ed.target];
              if (!s || !t) return null;
              return (
                <path
                  key={i}
                  d={edgePath(s, t)}
                  fill="none"
                  stroke={ed.color}
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  markerEnd={`url(#arrow-${colors.indexOf(ed.color)})`}
                  className="animate-flowDash"
                  style={{ filter: `drop-shadow(0 0 3px ${ed.color}66)` }}
                />
              );
            })}
          </svg>

          {/* node layer */}
          {nodes.map((nd) => (
            <button
              key={nd.id}
              type="button"
              onClick={() => setSelectedId(nd.id)}
              className={`absolute flex cursor-pointer flex-col justify-center rounded-lg border bg-surface px-3 py-2 text-left shadow-lg transition-colors hover:bg-card ${selectedId === nd.id ? "border-cyan/60" : "border-white/10"}`}
              style={{
                left: nd.x,
                top: nd.y,
                width: NODE_W,
                height: NODE_H,
                borderLeft: `3px solid ${nd.color}`,
              }}
            >
              <div
                className="mb-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em]"
                style={{ color: nd.color }}
              >
                {nd.kind}
              </div>
              <div className="text-xs leading-snug text-text/85">{nd.label}</div>
            </button>
          ))}
        </div>
      </div>
      {selected?.details && <div className="border-t border-white/5 bg-inset/40 px-4 py-3"><div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: selected.color }}>{selected.kind} details</p><p className="mt-1 text-xs text-text/65">{selected.label}</p></div><button type="button" onClick={() => setSelectedId(null)} className="text-xs text-text/45 hover:text-text">Close</button></div><dl className="mt-3 grid gap-2 sm:grid-cols-2">{selected.details.map((detail) => <div key={detail.label} className="rounded border border-white/10 bg-surface px-3 py-2"><dt className="font-mono text-[9px] uppercase tracking-wide text-text/40">{detail.label}</dt><dd className="mt-1 font-mono text-xs text-text/75">{detail.value}</dd></div>)}</dl></div>}
    </Card>
  );
}
