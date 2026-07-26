import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import { FileCheck2, AlertOctagon, FileWarning } from "lucide-react";
import Card from "@/components/ui/Card";
import { COLORS } from "@/lib/constants";

// Compute the three headline metrics from the REAL patrol functions.
function metrics() {
  let clashes = 0;
  let missingDocs = 0;
  for (const b of BIDS) {
    const { building } = runAllPatrols(b);
    if (building.status === "FAIL") clashes += 1;
    if (!b.has_safety_cert) missingDocs += 1;
  }
  return { total: BIDS.length, clashes, missingDocs };
}

export default function SummaryRow() {
  const m = metrics();
  const cards = [
    {
      label: "Submitted bids",
      value: m.total,
      color: COLORS.text,
      Icon: FileCheck2,
      sub: "in the current review set",
    },
    {
      label: "Hard-limit failures",
      value: m.clashes,
      color: COLORS.rose,
      Icon: AlertOctagon,
      sub: "engineering or carbon constraint exceeded",
    },
    {
      label: "Documents missing",
      value: m.missingDocs,
      color: COLORS.amber,
      Icon: FileWarning,
      sub: "safety certificates not on record",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((c) => (
        <Card key={c.label} accent={c.color} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-text/45">{c.label}</div>
              <div
                className="mt-2 font-mono text-4xl font-bold tabular-nums"
                style={{ color: c.color }}
              >
                {c.value}
              </div>
              <div className="mt-1 text-xs text-text/40">{c.sub}</div>
            </div>
            <c.Icon className="h-5 w-5" style={{ color: c.color }} />
          </div>
        </Card>
      ))}
    </div>
  );
}
