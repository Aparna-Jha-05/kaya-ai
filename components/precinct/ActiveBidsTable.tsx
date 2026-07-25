"use client";
import { useRouter } from "next/navigation";
import { BIDS } from "@/lib/mockData";
import { runAllPatrols } from "@/lib/patrols";
import PatrolBadge from "@/components/bid/PatrolBadge";
import Card, { CardHeader } from "@/components/ui/Card";
import Tooltip from "@/components/ui/Tooltip";
import { COLORS } from "@/lib/constants";
import { ChevronRight } from "lucide-react";

function riskColor(risk: number) {
  if (risk > 6) return COLORS.rose;
  if (risk >= 4) return COLORS.amber;
  return COLORS.cyan;
}

export default function ActiveBidsTable() {
  const router = useRouter();

  const rows = BIDS.map((b) => {
    const { building, green, vice } = runAllPatrols(b);
    const risk = vice.riskScore ?? 0;
    return { bid: b, building, green, risk };
  });

  return (
    <Card>
      <CardHeader
        title="Bids"
        caption="Each bid is checked against engineering, carbon, vendor, and schedule criteria. Select a bid to review its evidence."
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-[11px] uppercase tracking-wide text-text/40">
              <th className="px-4 py-2.5 font-medium">Vendor</th>
              <th className="px-4 py-2.5 font-medium">Bid Amount</th>
              <th className="px-4 py-2.5 font-medium">
                <Tooltip term="Engineering">Engineering</Tooltip>
              </th>
              <th className="px-4 py-2.5 font-medium">
                <Tooltip term="Carbon">Carbon</Tooltip>
              </th>
              <th className="px-4 py-2.5 font-medium">
                <Tooltip term="Vendor reliability">Vendor risk</Tooltip>
              </th>
              <th className="px-4 py-2.5 font-medium">
                <Tooltip term="TCO²">5-year TCO²</Tooltip>
              </th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map(({ bid, building, green, risk }) => {
              const isReject = bid.recommendation === "REJECT";
              return (
                <tr
                  key={bid.id}
                  onClick={() => router.push(`/bids/${bid.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/bids/${bid.id}`);
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={`Review bid from ${bid.vendor}`}
                  className={`group cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.03] ${
                    isReject ? "animate-pulseRed" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: isReject ? COLORS.rose : COLORS.cyan,
                          boxShadow: `0 0 8px ${isReject ? COLORS.rose : COLORS.cyan}`,
                        }}
                      />
                      <span className="font-sans font-medium text-text">{bid.vendor}</span>
                      {isReject && (
                        <span className="rounded bg-rose/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose">
                          review
                        </span>
                      )}
                    </div>
                    <div className="ml-4 mt-0.5 text-[11px] text-text/35">{bid.model}</div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text/80">
                    ₹{bid.upfront_cost_cr.toFixed(1)} Cr
                  </td>
                  <td className="px-4 py-3">
                    <PatrolBadge status={building.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <PatrolBadge status={green.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="tabular-nums font-bold"
                      style={{ color: riskColor(risk) }}
                    >
                      {risk}/10
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text/80">
                    ₹{bid.tco2_cr.toFixed(1)} Cr
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="ml-auto h-4 w-4 text-text/20 transition-transform group-hover:translate-x-0.5 group-hover:text-text/60" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
