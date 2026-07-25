"use client";
import { useMemo } from "react";
import { Bid } from "@/lib/mockData";
import { COLORS } from "@/lib/constants";
import Card, { CardHeader } from "@/components/ui/Card";

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
}
interface GEdge {
  source: string;
  target: string;
  color: string;
}

function n(id: string, x: number, y: number, label: string, color: string, kind: string): GNode {
  return { id, x, y, label, color, kind };
}
function e(source: string, target: string, color: string): GEdge {
  return { source, target, color };
}

function buildGraph(bid: Bid): { nodes: GNode[]; edges: GEdge[] } {
  if (bid.id !== "B") {
    return {
      nodes: [
        n("root", 20, 40, "Bid PDF matches the site spec", COLORS.cyan, "SOURCE"),
        n("ok", 340, 40, "All checks passed — no downstream impact", COLORS.cyan, "RESULT"),
      ],
      edges: [e("root", "ok", COLORS.cyan)],
    };
  }

  const nodes: GNode[] = [
    n("root", 20, 210, "Chiller model substituted — looks equivalent in the bid PDF", COLORS.rose, "ROOT CAUSE"),

    n("p1", 320, 20, "Power draw +10% (1400 kW)", COLORS.rose, "SIGNAL"),
    n("p2", 620, 20, "Electrical panel redesign", COLORS.rose, "ENGINEERING"),
    n("p3", 920, 20, "Reject or escalate", COLORS.rose, "ACTION"),

    n("w1", 320, 118, "Water usage +15% (460 gpm)", COLORS.amber, "SIGNAL"),
    n("w2", 620, 118, "Sustainability + cooling risk", COLORS.amber, "CARBON"),
    n("w3", 920, 118, "Carbon / OPEX penalty", COLORS.amber, "ACTION"),

    n("f1", 320, 216, "Floor load +8% (1620 kg/m²)", COLORS.rose, "SIGNAL"),
    n("f2", 620, 216, "Structural tolerance breach", COLORS.rose, "STRUCTURAL"),
    n("f3", 920, 216, "Hard fail", COLORS.rose, "ACTION"),

    n("s1", 320, 314, "Vendor late 3 of 5 deliveries", COLORS.violet, "SIGNAL"),
    n("s2", 620, 314, "ROJ window risk", COLORS.blue, "SCHEDULE"),
    n("s3", 920, 314, "Schedule contingency", COLORS.blue, "ACTION"),

    n("c1", 320, 412, "Missing safety certificate", COLORS.rose, "SIGNAL"),
    n("c2", 620, 412, "Compliance hold", COLORS.rose, "LEGAL"),
    n("c3", 920, 412, "Legal / procurement flag", COLORS.rose, "ACTION"),
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
  const byId = useMemo(() => Object.fromEntries(nodes.map((nd) => [nd.id, nd])), [nodes]);

  const width = Math.max(...nodes.map((nd) => nd.x + NODE_W)) + 24;
  const height = Math.max(...nodes.map((nd) => nd.y + NODE_H)) + 24;

  // Unique arrow-marker per color used.
  const colors = Array.from(new Set(edges.map((ed) => ed.color)));

  return (
    <Card>
      <CardHeader
        title="Impact path"
        caption="How the submitted equipment affects engineering, carbon, vendor, and schedule outcomes. Read left to right: finding, impact, action."
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
                  id={`arrow-${c.replace("#", "")}`}
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
                  markerEnd={`url(#arrow-${ed.color.replace("#", "")})`}
                  className="animate-flowDash"
                  style={{ filter: `drop-shadow(0 0 3px ${ed.color}66)` }}
                />
              );
            })}
          </svg>

          {/* node layer */}
          {nodes.map((nd) => (
            <div
              key={nd.id}
              className="absolute flex flex-col justify-center rounded-lg border border-white/10 bg-surface px-3 py-2 shadow-lg"
              style={{
                left: nd.x,
                top: nd.y,
                width: NODE_W,
                height: NODE_H,
                borderLeft: `3px solid ${nd.color}`,
              }}
            >
              <div
                className="mb-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
                style={{ color: nd.color }}
              >
                {nd.kind}
              </div>
              <div className="text-[11.5px] leading-snug text-text/85">{nd.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
