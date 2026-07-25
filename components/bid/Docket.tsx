"use client";
import dynamic from "next/dynamic";
import { allScorecards, tcoChartData } from "@/lib/tco";
import Card, { CardHeader } from "@/components/ui/Card";
import Tooltip from "@/components/ui/Tooltip";
import PatrolBadge from "@/components/bid/PatrolBadge";
import { COLORS } from "@/lib/constants";
import { Lightbulb } from "lucide-react";

// Dynamically import the chart so the first paint stays fast (SSR off).
const TcoChart = dynamic(() => import("./TcoChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-xs text-text/40">
      loading chart…
    </div>
  ),
});

const riskColor = (r: string) =>
  r === "High" ? COLORS.red : r === "Med" ? COLORS.amber : COLORS.green;
const decisionColor = (d: string) =>
  d === "REJECT" ? COLORS.red : d === "RECOMMENDED" ? COLORS.green : COLORS.amber;

export default function Docket({ highlightId }: { highlightId?: string }) {
  const rows = allScorecards();

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            Bid comparison · <Tooltip term="TCO²">5-year TCO²</Tooltip>
          </span>
        }
        caption="Compare upfront cost, compliance, vendor risk, and schedule exposure. Lower total cost is better."
      />
      <div className="overflow-x-auto p-4 pb-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-text/40">
              <th className="py-2 pr-3 font-medium">Vendor</th>
              <th className="py-2 px-3 font-medium">Upfront</th>
              <th className="py-2 px-3 font-medium">Engineering</th>
              <th className="py-2 px-3 font-medium">Vendor Risk</th>
              <th className="py-2 px-3 font-medium">Carbon</th>
              <th className="py-2 px-3 font-medium">Schedule</th>
              <th className="py-2 px-3 font-medium">
                <Tooltip term="TCO²">5-year TCO²</Tooltip>
              </th>
              <th className="py-2 pl-3 font-medium">Decision</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map((r) => {
              const hl = highlightId === r.id;
              return (
                <tr
                  key={r.id}
                  className="border-b border-white/5"
                  style={hl ? { backgroundColor: "rgba(255,77,77,0.05)" } : undefined}
                >
                  <td className="py-3 pr-3">
                    <span className="font-sans font-medium text-text">{r.vendor}</span>
                  </td>
                  <td className="py-3 px-3 tabular-nums text-text/80">
                    ₹{r.upfront_cost_cr.toFixed(1)} Cr
                  </td>
                  <td className="py-3 px-3">
                    <PatrolBadge status={r.engineering} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold" style={{ color: riskColor(r.vendorRisk) }}>
                      {r.vendorRisk}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <PatrolBadge status={r.carbon} size="sm" />
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold" style={{ color: riskColor(r.scheduleRisk) }}>
                      {r.scheduleRisk}
                    </span>
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-text">
                    ₹{r.tco2_cr.toFixed(1)} Cr
                  </td>
                  <td className="py-3 pl-3">
                    <span
                      className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
                      style={{
                        color: decisionColor(r.decision),
                        backgroundColor: `${decisionColor(r.decision)}1a`,
                      }}
                    >
                      {r.decision}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4">
        <TcoChart data={tcoChartData()} />
      </div>

      <div className="mx-4 mb-4 flex items-start gap-2.5 rounded-lg border border-amber/25 bg-amber/5 px-4 py-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
        <p className="text-sm text-text/85">
          Vendor B becomes the highest-cost option once carbon, reliability, and
          schedule exposure are included.{" "}
          <span className="text-text/50">
            Vendor B is ₹0.4 Cr cheaper upfront but ₹0.8 Cr costlier over 5 years — and
            fails engineering and carbon outright.
          </span>
        </p>
      </div>
    </Card>
  );
}
